import { useEffect, useMemo, useState } from "react";
import type { PublicRace } from "@racenotes/shared";
import { supabase, AUDIO_BUCKET, isConfigured } from "./lib/supabase.js";
import { useRecorder, MAX_SECONDS } from "./lib/useRecorder.js";
import { extensionForMime, readAudioDuration } from "./lib/audio.js";

/** Read the race slug from /r/:slug or ?slug=... */
function useSlug(): string | null {
  return useMemo(() => {
    const path = window.location.pathname.match(/\/r\/([^/]+)/);
    if (path) return decodeURIComponent(path[1]);
    return new URLSearchParams(window.location.search).get("slug");
  }, []);
}

type Phase =
  | "loading"
  | "form"
  | "submitting"
  | "done"
  | "landing" // opened the bare site with no /r/<slug>
  | "unconfigured" // the deploy is missing its Supabase env values
  | "notfound"; // a slug was given but no race matched (or the lookup failed)

export function App() {
  const slug = useSlug();
  const [phase, setPhase] = useState<Phase>("loading");
  const [race, setRace] = useState<PublicRace | null>(null);

  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [anywhere, setAnywhere] = useState(true);
  const [mile, setMile] = useState(8);
  const [uploaded, setUploaded] = useState<{ blob: Blob; mime: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorder = useRecorder();

  useEffect(() => {
    // No race code in the URL — show a friendly landing, not an error.
    if (!slug) {
      setPhase("landing");
      return;
    }
    // The site was deployed without its Supabase values, so lookups can't work.
    if (!isConfigured) {
      setPhase("unconfigured");
      return;
    }
    supabase
      .rpc("get_public_race", { p_slug: slug })
      .then(({ data, error }) => {
        const row = Array.isArray(data) ? data[0] : data;
        if (error || !row) {
          if (error) console.error("get_public_race failed:", error.message);
          setPhase("notfound");
          return;
        }
        setRace(row as PublicRace);
        setMile(Math.round((row as PublicRace).distance_miles / 2));
        setPhase("form");
      });
  }, [slug]);

  const audioBlob = uploaded?.blob ?? recorder.recording?.blob ?? null;
  const audioMime = uploaded?.mime ?? recorder.recording?.mimeType ?? "";
  // A note needs either audio or a written message (which we read aloud via TTS).
  const canSubmit =
    !!race && name.trim().length > 0 && (!!audioBlob || message.trim().length > 0);

  async function submit() {
    if (!race || (!audioBlob && message.trim().length === 0)) return;
    setError(null);
    setPhase("submitting");
    try {
      let path: string | null = null;
      let duration: number | null = null;

      // Upload audio only if they recorded/attached one; otherwise it's a
      // text-only note the runner's app will speak.
      if (audioBlob) {
        const ext = extensionForMime(audioMime);
        path = `${race.id}/${crypto.randomUUID()}.${ext}`;
        duration = await readAudioDuration(audioBlob);
        const up = await supabase.storage
          .from(AUDIO_BUCKET)
          .upload(path, audioBlob, { contentType: audioMime, upsert: false });
        if (up.error) throw up.error;
      }

      const rpc = await supabase.rpc("add_note", {
        p_slug: race.share_slug,
        p_contributor_name: name.trim(),
        p_message: message.trim() || null,
        p_mile_marker: anywhere ? null : mile,
        p_audio_path: path,
        p_duration_seconds: duration,
      });
      if (rpc.error) throw rpc.error;

      setPhase("done");
    } catch (e) {
      setError((e as Error).message ?? "Something went wrong. Please try again.");
      setPhase("form");
    }
  }

  if (phase === "loading") return <Center>Loading…</Center>;

  if (phase === "landing") {
    return (
      <Center>
        <div className="badge">🏃🎧</div>
        <h1>RaceNotes</h1>
        <p className="muted">
          This is where friends leave a voice note for a runner — it plays at the
          mile they pick, right in the runner's ears mid-race.
        </p>
        <p className="muted" style={{ marginTop: 12 }}>
          To leave a note, open the personal link the runner shared with you. It
          looks like <code>/r/their-code</code>.
        </p>
      </Center>
    );
  }

  if (phase === "unconfigured") {
    return (
      <Center>
        <h1>Almost set up</h1>
        <p className="muted">
          This site is deployed but isn't connected to its database yet, so it
          can't load races. If you're the runner: add the{" "}
          <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>{" "}
          secrets and redeploy.
        </p>
      </Center>
    );
  }

  if (phase === "notfound") {
    return (
      <Center>
        <h1>Hmm, that link didn't work</h1>
        <p className="muted">
          We couldn't find that race. Double-check the link the runner sent you —
          it should look like <code>/r/their-code</code>.
        </p>
      </Center>
    );
  }

  if (phase === "done") {
    return (
      <Center>
        <div className="badge">🎉</div>
        <h1>Your note is on its way</h1>
        <p className="muted">
          {race?.name
            ? `${race.name} will hear it out on the course.`
            : "They'll hear it out on the course."}{" "}
          Want to send another?
        </p>
        <button
          className="secondary"
          onClick={() => {
            recorder.clear();
            setUploaded(null);
            setMessage("");
            setPhase("form");
          }}
        >
          Send another note
        </button>
      </Center>
    );
  }

  return (
    <main className="wrap">
      <header>
        <p className="eyebrow">You're sending a note for</p>
        <h1>{race?.name}</h1>
        <p className="muted">
          Record a quick cheer. It'll play right in {race?.name?.split(" ")[0] ?? "their"}
          's ears at the mile you pick — over their music, mid-run. Keep it under{" "}
          {MAX_SECONDS}s. 🏃
        </p>
      </header>

      <section className="card">
        <h2>1. Record your cheer <span className="optional">(optional)</span></h2>
        <p className="hint">
          No mic handy? Skip this and just write a message below — the app will
          read it aloud on the course.
        </p>
        {recorder.state === "recording" ? (
          <button className="record recording" onClick={recorder.stop}>
            ⏹ Stop — {recorder.seconds}s
          </button>
        ) : (
          <button
            className="record"
            onClick={() => {
              setUploaded(null);
              recorder.start();
            }}
          >
            {recorder.recording ? "🎙 Re-record" : "🎙 Tap to record"}
          </button>
        )}
        {recorder.error && <p className="error">{recorder.error}</p>}

        <div className="or">or</div>

        <label className="upload">
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                recorder.clear();
                setUploaded({ blob: f, mime: f.type || "audio/mpeg" });
              }
            }}
          />
          ⬆️ Upload an audio file
        </label>

        {audioBlob && (
          <audio
            className="preview"
            controls
            src={uploaded ? URL.createObjectURL(uploaded.blob) : recorder.recording!.url}
          />
        )}
      </section>

      <section className="card">
        <h2>2. Who's it from?</h2>
        <input
          className="text"
          placeholder="Your name"
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="text"
          placeholder={
            audioBlob
              ? "Optional short message (they'll see this)"
              : "Your message — we'll read this aloud on the course"
          }
          maxLength={200}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </section>

      <section className="card">
        <h2>3. When should it play?</h2>
        <label className="checkline">
          <input
            type="checkbox"
            checked={anywhere}
            onChange={(e) => setAnywhere(e.target.checked)}
          />
          Surprise them — play anywhere on the course
        </label>
        {!anywhere && (
          <div className="slider">
            <input
              type="range"
              min={1}
              max={Math.floor(race?.distance_miles ?? 13)}
              step={1}
              value={mile}
              onChange={(e) => setMile(Number(e.target.value))}
            />
            <div className="milelabel">
              Play at <strong>mile {mile}</strong>
            </div>
          </div>
        )}
      </section>

      {error && <p className="error">{error}</p>}

      <button className="primary" disabled={!canSubmit || phase === "submitting"} onClick={submit}>
        {phase === "submitting" ? "Sending…" : "Send my note ❤️"}
      </button>
    </main>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <main className="wrap center">
      <div>{children}</div>
    </main>
  );
}
