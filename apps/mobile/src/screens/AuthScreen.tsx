import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { supabase } from "../lib/supabase";
import { S, C } from "../theme";

export function AuthScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendLink() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <View style={[S.screen, { justifyContent: "center" }]}>
      <Text style={S.h1}>RaceNotes 🏃</Text>
      <Text style={[S.muted, { marginBottom: 24 }]}>
        Collect voice notes from friends and hear them at the right mile of your race.
      </Text>

      {sent ? (
        <View style={S.card}>
          <Text style={S.h2}>Check your email</Text>
          <Text style={S.muted}>
            We sent a sign-in link to {email}. Open it on this phone to continue.
          </Text>
        </View>
      ) : (
        <>
          <TextInput
            style={S.input}
            placeholder="you@email.com"
            placeholderTextColor={C.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TouchableOpacity
            style={S.primary}
            disabled={busy || email.trim().length < 3}
            onPress={sendLink}
          >
            <Text style={S.primaryText}>{busy ? "Sending…" : "Email me a sign-in link"}</Text>
          </TouchableOpacity>
        </>
      )}
      {error && <Text style={{ color: C.accent, marginTop: 12 }}>{error}</Text>}
    </View>
  );
}
