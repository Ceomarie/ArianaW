import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Share,
  Modal,
  RefreshControl,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import type { Race } from "@racenotes/shared";
import { supabase } from "../lib/supabase";
import { listMyRaces, createRace, shareUrl } from "../lib/races";
import { S, C } from "../theme";

export function HomeScreen({ onOpen }: { onOpen: (race: Race) => void }) {
  const [races, setRaces] = useState<Race[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [name, setName] = useState("");
  const [distance, setDistance] = useState("13.1");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrRace, setQrRace] = useState<Race | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setRaces(await listMyRaces());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    setCreating(true);
    setError(null);
    try {
      const race = await createRace({
        name: name.trim(),
        race_date: null,
        distance_miles: Number(distance) || 13.1,
      });
      setName("");
      setRaces((r) => [race, ...r]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <ScrollView
      style={S.screen}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={C.muted} />}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={S.h1}>Your races</Text>
        <TouchableOpacity onPress={() => supabase.auth.signOut()}>
          <Text style={{ color: C.muted }}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <View style={S.card}>
        <Text style={S.h2}>New race</Text>
        <TextInput
          style={S.input}
          placeholder="e.g. Chicago Half Marathon"
          placeholderTextColor={C.muted}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={S.input}
          placeholder="Distance (miles)"
          placeholderTextColor={C.muted}
          keyboardType="decimal-pad"
          value={distance}
          onChangeText={setDistance}
        />
        <TouchableOpacity
          style={S.primary}
          disabled={creating || name.trim().length === 0}
          onPress={create}
        >
          <Text style={S.primaryText}>{creating ? "Creating…" : "Create race"}</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={{ color: C.accent, marginBottom: 12 }}>{error}</Text>}

      {races.map((race) => (
        <TouchableOpacity key={race.id} style={S.card} onPress={() => onOpen(race)}>
          <Text style={S.h2}>{race.name}</Text>
          <Text style={S.muted}>{race.distance_miles} miles</Text>
          <View style={{ flexDirection: "row", marginTop: 12, gap: 10 }}>
            <TouchableOpacity
              style={[S.secondary, { flex: 1 }]}
              onPress={() =>
                Share.share({
                  message: `Send me a voice note for my race — it'll play at the mile you pick! ${shareUrl(
                    race.share_slug,
                  )}`,
                })
              }
            >
              <Text style={S.secondaryText}>Share link</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[S.secondary, { flex: 1 }]} onPress={() => setQrRace(race)}>
              <Text style={S.secondaryText}>Show QR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[S.secondary, { flex: 1 }]} onPress={() => onOpen(race)}>
              <Text style={S.secondaryText}>Open →</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      ))}

      {races.length === 0 && !refreshing && (
        <Text style={S.muted}>No races yet. Create one above, then share the link with friends.</Text>
      )}
      <View style={{ height: 40 }} />

      <Modal
        visible={qrRace !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setQrRace(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#000000cc",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View style={[S.card, { alignItems: "center" }]}>
            <Text style={S.h2}>Scan to send a note</Text>
            <Text style={[S.muted, { textAlign: "center", marginBottom: 16 }]}>
              {qrRace?.name}
            </Text>
            {qrRace && (
              <View style={{ backgroundColor: "white", padding: 16, borderRadius: 12 }}>
                <QRCode value={shareUrl(qrRace.share_slug)} size={220} />
              </View>
            )}
            <Text style={[S.muted, { marginTop: 16, textAlign: "center" }]}>
              {qrRace ? shareUrl(qrRace.share_slug) : ""}
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16, alignSelf: "stretch" }}>
              <TouchableOpacity
                style={[S.secondary, { flex: 1 }]}
                onPress={() =>
                  qrRace &&
                  Share.share({
                    message: `Send me a voice note for my race — it'll play at the mile you pick! ${shareUrl(
                      qrRace.share_slug,
                    )}`,
                  })
                }
              >
                <Text style={S.secondaryText}>Share link</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[S.primary, { flex: 1 }]} onPress={() => setQrRace(null)}>
                <Text style={S.primaryText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
