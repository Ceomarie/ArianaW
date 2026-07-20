/**
 * Voice-note playback that ducks the runner's music.
 *
 * We configure the audio session so that when a note plays, iOS/Android lower
 * (duck) whatever the runner is already playing — Spotify, Apple Music, a
 * podcast — then restore it when the note finishes. We never play the music
 * ourselves; we just interject.
 */
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";

let configured = false;

/** Call once before the run. Sets ducking + background playback. */
export async function configureAudioSession(): Promise<void> {
  if (configured) return;
  await setAudioModeAsync({
    playsInSilentMode: true, // play even if the ringer switch is off
    shouldPlayInBackground: true, // keep playing with the screen locked
    interruptionMode: "duckOthers", // iOS: lower the runner's music under the note
    shouldRouteThroughEarpiece: false, // Android: play through the speaker
  });
  // Android ducking is handled by the OS audio-focus request the player makes
  // when it starts playback while another app holds focus.
  configured = true;
}

/**
 * Play a local audio file to completion. Resolves when playback ends so the
 * caller can serialise notes (never overlap two at once).
 */
export function playNote(localUri: string): Promise<void> {
  return new Promise((resolve) => {
    const player = createAudioPlayer({ uri: localUri });
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try {
        player.remove();
      } catch {
        /* already released */
      }
      resolve();
    };

    player.addListener("playbackStatusUpdate", (status) => {
      if (status.didJustFinish || (status.isLoaded && !status.playing && status.currentTime > 0 && status.duration > 0 && status.currentTime >= status.duration - 0.05)) {
        finish();
      }
    });

    // Safety net: never hang the queue if the end event is missed.
    setTimeout(finish, 90_000);
    player.play();
  });
}
