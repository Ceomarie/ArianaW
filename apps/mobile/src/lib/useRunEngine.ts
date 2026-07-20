import { useCallback, useEffect, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import {
  TriggerScheduler,
  buildSchedule,
  type Note,
  type ScheduledNote,
} from "@racenotes/shared";
import { runStore } from "./runStore";
import { configureAudioSession, playNote } from "./player";
import { requestLocationPermission, startTracking, stopTracking } from "./locationTask";

export interface RunEngine {
  running: boolean;
  miles: number;
  /** The full ordered schedule (fired + upcoming). Stable during a run. */
  plan: ScheduledNote[];
  /** Notes still ahead, in firing order. */
  upcoming: ScheduledNote[];
  /** Ids of notes that have auto-fired at their mile so far. */
  firedNoteIds: string[];
  nowPlayingNoteId: string | null;
  /** When the run started (epoch ms), or null before start — drives the timer. */
  startedAtMs: number | null;
  error: string | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  /** Manually fire a note now (the "play now" override / test button). */
  playNow: (noteId: string) => void;
}

/**
 * Drives a run: watches distance, fires notes at their mile, and serialises
 * playback so two notes never overlap. `localUris` maps noteId -> file path of
 * the audio already downloaded to the device.
 */
export function useRunEngine(
  notes: Note[],
  distanceMiles: number,
  localUris: Record<string, string>,
): RunEngine {
  const [running, setRunning] = useState(false);
  const [miles, setMiles] = useState(0);
  const [plan, setPlan] = useState<ScheduledNote[]>([]);
  const [upcoming, setUpcoming] = useState<ScheduledNote[]>([]);
  const [fired, setFired] = useState<string[]>([]);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const schedulerRef = useRef<TriggerScheduler | null>(null);
  // Serialise note playback: a simple FIFO queue drained one at a time.
  const queueRef = useRef<string[]>([]);
  const drainingRef = useRef(false);

  // Keep an up-to-date plan/upcoming even before the run starts.
  useEffect(() => {
    const built = buildSchedule(notes, distanceMiles);
    setPlan(built);
    setUpcoming(built);
  }, [notes, distanceMiles]);

  const enqueue = useCallback((noteId: string) => {
    const uri = localUris[noteId];
    if (!uri) return; // not downloaded — skip rather than crash
    queueRef.current.push(noteId);
    if (drainingRef.current) return;

    drainingRef.current = true;
    (async () => {
      while (queueRef.current.length > 0) {
        const id = queueRef.current.shift()!;
        const fileUri = localUris[id];
        if (!fileUri) continue;
        setNowPlaying(id);
        try {
          await playNote(fileUri);
        } catch (e) {
          console.warn("note playback failed", e);
        }
      }
      setNowPlaying(null);
      drainingRef.current = false;
    })();
  }, [localUris]);

  const start = useCallback(async () => {
    setError(null);
    const granted = await requestLocationPermission();
    if (!granted) {
      setError("Location permission is required to track your distance.");
      return;
    }
    await configureAudioSession();
    const sched = new TriggerScheduler(notes, distanceMiles);
    schedulerRef.current = sched;
    setPlan(sched.plan);
    setUpcoming(sched.upcoming);
    setFired([]);
    runStore.start();
    await startTracking();
    setStartedAtMs(Date.now());
    setRunning(true);
  }, [notes, distanceMiles]);

  const stop = useCallback(async () => {
    await stopTracking();
    runStore.stop();
    setRunning(false);
  }, []);

  const playNow = useCallback((noteId: string) => enqueue(noteId), [enqueue]);

  // React to distance changes: fire any newly-due notes.
  useEffect(() => {
    const unsub = runStore.subscribe((meters) => {
      setMiles(meters / 1609.344);
      const sched = schedulerRef.current;
      if (!sched) return;
      const due = sched.update(meters);
      if (due.length > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
          () => undefined,
        );
        setFired((f) => [...f, ...due.map((d) => d.id)]);
        for (const note of due) enqueue(note.id);
      }
      setUpcoming(sched.upcoming);
    });
    return unsub;
  }, [enqueue]);

  // Stop tracking if the screen unmounts mid-run.
  useEffect(() => {
    return () => {
      stopTracking().catch(() => undefined);
      runStore.stop();
    };
  }, []);

  return {
    running,
    miles,
    plan,
    upcoming,
    firedNoteIds: fired,
    nowPlayingNoteId: nowPlaying,
    startedAtMs,
    error,
    start,
    stop,
    playNow,
  };
}
