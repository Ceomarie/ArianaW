import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native";
import type { Note, Race } from "@racenotes/shared";
import { useSession } from "./src/lib/useSession";
import { AuthScreen } from "./src/screens/AuthScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { InboxScreen } from "./src/screens/InboxScreen";
import { RunScreen } from "./src/screens/RunScreen";
import { C } from "./src/theme";

type Nav =
  | { screen: "home" }
  | { screen: "inbox"; race: Race }
  | { screen: "run"; race: Race; notes: Note[]; localUris: Record<string, string> };

export default function App() {
  const { session, loading } = useSession();
  const [nav, setNav] = useState<Nav>({ screen: "home" });

  const body = () => {
    if (loading) return null;
    if (!session) return <AuthScreen />;

    switch (nav.screen) {
      case "home":
        return <HomeScreen onOpen={(race) => setNav({ screen: "inbox", race })} />;
      case "inbox":
        return (
          <InboxScreen
            race={nav.race}
            onBack={() => setNav({ screen: "home" })}
            onStartRun={(notes, localUris) =>
              setNav({ screen: "run", race: nav.race, notes, localUris })
            }
          />
        );
      case "run":
        return (
          <RunScreen
            race={nav.race}
            notes={nav.notes}
            localUris={nav.localUris}
            onBack={() => setNav({ screen: "inbox", race: nav.race })}
          />
        );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="light" />
      {body()}
    </SafeAreaView>
  );
}
