import type { ExpoConfig } from "expo/config";

/**
 * Expo config. The background-mode + permission bits here are what let the app
 * keep the GPS odometer running and fire notes while the phone is locked in a
 * pocket mid-run. These require a DEV BUILD (expo-dev-client) — they do not
 * work in Expo Go.
 */
const config: ExpoConfig = {
  name: "RaceNotes",
  slug: "racenotes",
  scheme: "racenotes",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "dark",
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.racenotes.app",
    infoPlist: {
      // Keep tracking + play audio with the screen locked.
      UIBackgroundModes: ["audio", "location"],
      NSLocationWhenInUseUsageDescription:
        "RaceNotes tracks your distance so it can play each note at the right mile.",
      NSLocationAlwaysAndWhenInUseUsageDescription:
        "RaceNotes keeps tracking your distance in the background so notes still play with your phone locked.",
    },
  },
  android: {
    package: "com.racenotes.app",
    permissions: [
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "ACCESS_BACKGROUND_LOCATION",
      "FOREGROUND_SERVICE",
      "FOREGROUND_SERVICE_LOCATION",
    ],
  },
  plugins: [
    "expo-dev-client",
    [
      "expo-location",
      {
        isAndroidBackgroundLocationEnabled: true,
        locationAlwaysAndWhenInUsePermission:
          "RaceNotes keeps tracking your distance in the background so notes still play with your phone locked.",
      },
    ],
    [
      "expo-audio",
      {
        // Play in the background and duck the runner's music under each note.
        microphonePermission: false,
      },
    ],
  ],
  extra: {
    // Populated from EXPO_PUBLIC_* env vars at runtime; see src/lib/supabase.ts.
  },
};

export default config;
