import { useCallback, useEffect, useRef, useState } from "react";

export interface Recording {
  blob: Blob;
  url: string;
  durationSeconds: number;
  mimeType: string;
}

type RecorderState = "idle" | "recording" | "stopped";

/** Cap so notes stay snackable and uploads stay small. */
export const MAX_SECONDS = 60;

/** Pick a mime type the browser actually supports (Safari differs from Chrome). */
function pickMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) {
      return c;
    }
  }
  return "";
}

export function useRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
  };

  const stop = useCallback(() => {
    recorderRef.current?.state === "recording" && recorderRef.current.stop();
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (recording) {
      URL.revokeObjectURL(recording.url);
      setRecording(null);
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = () => {
        const type = rec.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        const durationSeconds = Math.min(
          MAX_SECONDS,
          Math.round((Date.now() - startedAtRef.current) / 1000),
        );
        setRecording({
          blob,
          url: URL.createObjectURL(blob),
          durationSeconds,
          mimeType: type,
        });
        setState("stopped");
        cleanupStream();
      };

      recorderRef.current = rec;
      startedAtRef.current = Date.now();
      setSeconds(0);
      rec.start();
      setState("recording");

      tickRef.current = setInterval(() => {
        const elapsed = Math.round((Date.now() - startedAtRef.current) / 1000);
        setSeconds(elapsed);
        if (elapsed >= MAX_SECONDS) stop();
      }, 250);
    } catch (e) {
      setError(
        "Couldn't access the microphone. Check the browser's mic permission and try again.",
      );
      setState("idle");
      cleanupStream();
    }
  }, [recording, stop]);

  const clear = useCallback(() => {
    if (recording) URL.revokeObjectURL(recording.url);
    setRecording(null);
    setSeconds(0);
    setState("idle");
  }, [recording]);

  // Tidy up on unmount.
  useEffect(() => () => cleanupStream(), []);

  return { state, seconds, recording, error, start, stop, clear };
}
