import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  type DimensionValue,
} from "react-native";
import { useKeepAwake } from "expo-keep-awake";
import type { Note, Race, ScheduledNote } from "@racenotes/shared";
import { useRunEngine } from "../lib/useRunEngine";
import { S, C } from "../theme";

/** mm:ss (or h:mm:ss past an hour). */
function fmtTime(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Average pace as m:ss /mi, or "—" until there's enough distance to be real. */
function fmtPace(elapsedSec: number, miles: number): string {
  if (miles < 0.05 || elapsedSec < 5) return "—";
  const perMile = elapsedSec / miles;
  const m = Math.floor(perMile / 60);
  const s = Math.round(perMile % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function RunScreen({
  race,
  notes,
  localUris,
  onBack,
}: {
  race: Race;
  notes: Note[];
  localUris: Record<string, string>;
  onBack: () => void;
}) {
  useKeepAwake(); // belt-and-braces on top of the background modes
  const engine = useRunEngine(notes, race.distance_miles, localUris);

  // Live 1s timer while running (GPS ticks are too sparse for a clock).
  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => {
    if (!engine.running) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [engine.running]);

  // Auto-arm the run when the screen opens.
  useEffect(() => {
    engine.start();
    return () => {
      engine.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byId = new Map(notes.map((n) => [n.id, n]));
  const firedSet = new Set(engine.firedNoteIds);
  const next = engine.upcoming[0];
  const nowNote = engine.nowPlayingNoteId ? byId.get(engine.nowPlayingNoteId) : null;

  const elapsedSec = engine.startedAtMs ? (nowMs - engine.startedAtMs) / 1000 : 0;
  const progress = Math.min(1, engine.miles / race.distance_miles);
  const milesToNext = next ? Math.max(0, next.fireMile - engine.miles) : null;

  function confirmEnd() {
    Alert.alert("End run?", "This stops tracking and note playback.", [
      { text: "Keep running", style: "cancel" },
      {
        text: "End run",
        style: "destructive",
        onPress: async () => {
          await engine.stop();
          onBack();
        },
      },
    ]);
  }

  function noteState(s: ScheduledNote): "playing" | "played" | "next" | "queued" {
    if (engine.nowPlayingNoteId === s.id) return "playing";
    if (firedSet.has(s.id)) return "played";
    if (next && s.id === next.id) return "next";
    return "queued";
  }

  return (
    <View style={S.screen}>
      <TouchableOpacity onPress={confirmEnd}>
        <Text style={{ color: C.muted, marginBottom: 4 }}>← End run</Text>
      </TouchableOpacity>

      {/* Big stats row */}
      <View style={{ flexDirection: "row", marginTop: 12, marginBottom: 8 }}>
        <Stat label="miles" value={engine.miles.toFixed(2)} big />
        <Stat label="time" value={fmtTime(elapsedSec)} />
        <Stat label="/mi" value={fmtPace(elapsedSec, engine.miles)} />
      </View>
      <Text style={{ color: engine.running ? C.ok : C.muted, marginBottom: 14 }}>
        {engine.running ? "● Tracking" : "Paused"} • {engine.firedNoteIds.length}/
        {engine.plan.length} notes played
      </Text>

      {/* Course progress bar with a marker per note */}
      <View style={{ marginBottom: 18 }}>
        <View
          style={{
            height: 10,
            borderRadius: 6,
            backgroundColor: C.card2,
            overflow: "visible",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              position: "absolute",
              left: 0,
              height: 10,
              borderRadius: 6,
              width: `${progress * 100}%` as DimensionValue,
              backgroundColor: C.accent2,
            }}
          />
          {engine.plan.map((s) => {
            const st = noteState(s);
            const left = `${Math.min(
              100,
              (s.fireMile / race.distance_miles) * 100,
            )}%` as DimensionValue;
            const color =
              st === "played" || st === "playing" ? C.ok : "#ffffff66";
            return (
              <View
                key={s.id}
                style={{
                  position: "absolute",
                  left,
                  marginLeft: -5,
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: color,
                  borderWidth: 2,
                  borderColor: C.bg,
                }}
              />
            );
          })}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
          <Text style={{ color: C.muted, fontSize: 12 }}>0</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>{race.distance_miles} mi</Text>
        </View>
      </View>

      {nowNote && (
        <View style={[S.card, { borderColor: C.accent, borderWidth: 1 }]}>
          <Text style={{ color: C.accent, fontWeight: "700" }}>▶ Now playing</Text>
          <Text style={S.h2}>{nowNote.contributor_name}</Text>
          {nowNote.message ? <Text style={S.muted}>“{nowNote.message}”</Text> : null}
        </View>
      )}

      {next && !nowNote && (
        <View style={S.card}>
          <Text style={S.muted}>Up next</Text>
          <Text style={S.h2}>{byId.get(next.id)?.contributor_name ?? "A note"}</Text>
          <Text style={S.muted}>
            {milesToNext != null && milesToNext > 0.01
              ? `${milesToNext.toFixed(2)} mi away · at mile ${next.fireMile.toFixed(1)}`
              : `at mile ${next.fireMile.toFixed(1)}`}
          </Text>
        </View>
      )}

      {engine.error && <Text style={{ color: C.accent, marginBottom: 8 }}>{engine.error}</Text>}

      <Text style={[S.h2, { marginTop: 4 }]}>Notes</Text>
      <ScrollView style={{ flex: 1 }}>
        {engine.plan.map((s) => {
          const n = byId.get(s.id);
          const st = noteState(s);
          const played = st === "played" || st === "playing";
          return (
            <View
              key={s.id}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 11,
                borderBottomWidth: 1,
                borderBottomColor: "#ffffff10",
                opacity: played ? 0.55 : 1,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                <Text style={{ color: played ? C.ok : C.muted, width: 16 }}>
                  {st === "playing" ? "▶" : played ? "✓" : st === "next" ? "→" : "•"}
                </Text>
                <Text style={{ color: C.fg }} numberOfLines={1}>
                  {n?.contributor_name ?? s.id}
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <Text style={{ color: C.muted }}>mi {s.fireMile.toFixed(1)}</Text>
                {!played && (
                  <TouchableOpacity onPress={() => engine.playNow(s.id)}>
                    <Text style={{ color: C.accent2 }}>Play now</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: C.fg, fontSize: big ? 44 : 34, fontWeight: "800" }}>{value}</Text>
      <Text style={S.muted}>{label}</Text>
    </View>
  );
}
