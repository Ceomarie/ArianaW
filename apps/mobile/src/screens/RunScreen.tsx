import { useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useKeepAwake } from "expo-keep-awake";
import type { Note, Race } from "@racenotes/shared";
import { useRunEngine } from "../lib/useRunEngine";
import { S, C } from "../theme";

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

  const byId = new Map(notes.map((n) => [n.id, n]));
  const next = engine.upcoming[0];
  const nowNote = engine.nowPlayingNoteId ? byId.get(engine.nowPlayingNoteId) : null;

  // Auto-arm the run when the screen opens.
  useEffect(() => {
    engine.start();
    return () => {
      engine.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={S.screen}>
      <TouchableOpacity onPress={async () => { await engine.stop(); onBack(); }}>
        <Text style={{ color: C.muted, marginBottom: 8 }}>← End run</Text>
      </TouchableOpacity>

      <View style={{ alignItems: "center", marginVertical: 24 }}>
        <Text style={{ color: C.fg, fontSize: 72, fontWeight: "800" }}>
          {engine.miles.toFixed(2)}
        </Text>
        <Text style={S.muted}>miles • of {race.distance_miles}</Text>
        <Text style={{ color: engine.running ? C.ok : C.muted, marginTop: 6 }}>
          {engine.running ? "● Tracking" : "Paused"}
        </Text>
      </View>

      {nowNote && (
        <View style={[S.card, { borderColor: C.accent, borderWidth: 1 }]}>
          <Text style={{ color: C.accent, fontWeight: "700" }}>▶ Now playing</Text>
          <Text style={S.h2}>{nowNote.contributor_name}</Text>
          {nowNote.message ? <Text style={S.muted}>“{nowNote.message}”</Text> : null}
        </View>
      )}

      {next && (
        <View style={S.card}>
          <Text style={S.muted}>Up next</Text>
          <Text style={S.h2}>{byId.get(next.id)?.contributor_name ?? "A note"}</Text>
          <Text style={S.muted}>at mile {next.fireMile.toFixed(1)}</Text>
        </View>
      )}

      {engine.error && <Text style={{ color: C.accent }}>{engine.error}</Text>}

      <Text style={[S.h2, { marginTop: 8 }]}>Notes queued ({engine.upcoming.length})</Text>
      <ScrollView style={{ flex: 1 }}>
        {engine.upcoming.map((s) => {
          const n = byId.get(s.id);
          return (
            <View
              key={s.id}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: "#ffffff10",
              }}
            >
              <Text style={{ color: C.fg }}>{n?.contributor_name ?? s.id}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Text style={{ color: C.muted }}>mi {s.fireMile.toFixed(1)}</Text>
                <TouchableOpacity onPress={() => engine.playNow(s.id)}>
                  <Text style={{ color: C.accent2 }}>Play now</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
