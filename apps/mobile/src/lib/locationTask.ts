/**
 * Background GPS task. Registered at app startup (see index.ts). When the run
 * is active, expo-location delivers fixes here even with the screen locked, and
 * we push each into the shared odometer via runStore.
 */
import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import { runStore } from "./runStore";

export const LOCATION_TASK = "racenotes-location";

TaskManager.defineTask(LOCATION_TASK, ({ data, error }) => {
  if (error) {
    console.warn("location task error", error.message);
    return;
  }
  const { locations } = (data ?? {}) as { locations?: Location.LocationObject[] };
  if (!locations) return;
  for (const loc of locations) {
    runStore.ingest({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy ?? undefined,
      timestamp: loc.timestamp,
    });
  }
});

/** Ask for foreground + background location permission. */
export async function requestLocationPermission(): Promise<boolean> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") return false;
  // Background is best-effort; the run still works foreground-only.
  await Location.requestBackgroundPermissionsAsync().catch(() => undefined);
  return true;
}

/** Begin high-accuracy background tracking. */
export async function startTracking(): Promise<void> {
  const already = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(
    () => false,
  );
  if (already) return;
  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    distanceInterval: 5, // meters between updates
    deferredUpdatesInterval: 1000,
    showsBackgroundLocationIndicator: true,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: "RaceNotes is tracking your run",
      notificationBody: "Your notes will play at the right mile.",
    },
  });
}

export async function stopTracking(): Promise<void> {
  const running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(
    () => false,
  );
  if (running) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
}
