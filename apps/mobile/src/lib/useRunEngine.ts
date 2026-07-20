import { useCallback, useEffect, useRef, useState } from "react";
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
  upcoming: ScheduledNote[];
  nowPlayingNoteId: string | null;
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
  const [upcoming, setUpcoming] = useState<ScheduledNote[]>([]);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const schedulerRef = useRef<TriggerScheduler | null>(null);
  // Serialise note playback: a simple FIFO queue drained one at a time.
  const queueRef = useRef<string[]>([]);
  const drainingRef = useRef(false);

  // Keep an up-to-date plan for the "upcoming" list even before the run starts.
  useEffect(() => {
    setUpcoming(buildSchedule(notes, distanceMiles));
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
    schedulerRef.current = new TriggerScheduler(notes, distanceMiles);
    setUpcoming(schedulerRef.current.upcoming);
    runStore.start();
    await startTracking();
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
      for (const note of sched.update(meters)) enqueue(note.id);
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
    upcoming,
    nowPlayingNoteId: nowPlaying,
    error,
    start,
    stop,
    playNow,
  };
}
