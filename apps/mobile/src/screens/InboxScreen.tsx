import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import type { Note, Race } from "@racenotes/shared";
import { listNotes, setNoteStatus, signedUrl, downloadApprovedNotes } from "../lib/notes";
import { configureAudioSession, playNote, speakText } from "../lib/player";
import { S, C } from "../theme";

export function InboxScreen({
  race,
  onBack,
  onStartRun,
}: {
  race: Race;
  onBack: () => void;
  onStartRun: (notes: Note[], localUris: Record<string, string>) => void;
}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setNotes(await listNotes(race.id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }, [race.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function preview(note: Note) {
    try {
      await configureAudioSession();
      if (note.audio_path) {
        const url = await signedUrl(note.audio_path);
        await playNote(url);
      } else if (note.message) {
        await speakText(note.message); // text-only note — hear the TTS
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function moderate(note: Note, status: Note["status"]) {
    setNotes((ns) => ns.map((n) => (n.id === note.id ? { ...n, status } : n)));
    try {
      await setNoteStatus(note.id, status);
    } catch (e) {
      setError((e as Error).message);
      load();
    }
  }

  async function prepareAndRun() {
    setPreparing(true);
    setError(null);
    try {
      const approved = notes.filter((n) => n.status === "approved");
      if (approved.length === 0) {
        setError("Approve at least one note before starting your run.");
        return;
      }
      const localUris = await downloadApprovedNotes(approved);
      onStartRun(approved, localUris);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPreparing(false);
    }
  }

  const approvedCount = notes.filter((n) => n.status === "approved").length;

  return (
    <ScrollView
      style={S.screen}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={C.muted} />}
    >
      <TouchableOpacity onPress={onBack}>
        <Text style={{ color: C.muted, marginBottom: 8 }}>← Races</Text>
      </TouchableOpacity>
      <Text style={S.h1}>{race.name}</Text>
      <Text style={[S.muted, { marginBottom: 16 }]}>
        {notes.length} note{notes.length === 1 ? "" : "s"} • {approvedCount} approved
      </Text>

      {notes.map((note) => (
        <View key={note.id} style={S.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={S.h2}>{note.contributor_name}</Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {!note.audio_path && (
                <View style={S.pill}>
                  <Text style={{ color: C.muted, fontSize: 12 }}>🗣 spoken</Text>
                </View>
              )}
              <View style={S.pill}>
                <Text style={{ color: C.muted, fontSize: 12 }}>
                  {note.mile_marker == null ? "anytime" : `mile ${note.mile_marker}`}
                </Text>
              </View>
            </View>
          </View>
          {note.message ? <Text style={S.muted}>“{note.message}”</Text> : null}

          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <TouchableOpacity style={[S.secondary, { flex: 1 }]} onPress={() => preview(note)}>
              <Text style={S.secondaryText}>{note.audio_path ? "▶ Preview" : "🗣 Read aloud"}</Text>
            </TouchableOpacity>
            {note.status !== "approved" ? (
              <TouchableOpacity
                style={[S.secondary, { flex: 1, backgroundColor: "#153a2c" }]}
                onPress={() => moderate(note, "approved")}
              >
                <Text style={[S.secondaryText, { color: C.ok }]}>✓ Approve</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[S.secondary, { flex: 1 }]}
                onPress={() => moderate(note, "hidden")}
              >
                <Text style={S.secondaryText}>Hide</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>
            Status: {note.status}
          </Text>
        </View>
      ))}

      {notes.length === 0 && !refreshing && (
        <Text style={S.muted}>
          No notes yet. Share your link and they'll show up here to approve.
        </Text>
      )}

      {error && <Text style={{ color: C.accent, marginVertical: 12 }}>{error}</Text>}

      <TouchableOpacity
        style={[S.primary, { marginTop: 8 }]}
        disabled={preparing || approvedCount === 0}
        onPress={prepareAndRun}
      >
        {preparing ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={S.primaryText}>Prepare {approvedCount} & start run →</Text>
        )}
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
