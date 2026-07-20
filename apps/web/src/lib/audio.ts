/** Map a recorded/ uploaded mime type to a storage-friendly extension. */
export function extensionForMime(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4") || mime.includes("m4a") || mime.includes("aac")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("wav")) return "wav";
  return "bin";
}

/** Read a file/blob's duration in seconds using an <audio> element. */
export function readAudioDuration(src: Blob): Promise<number> {
  return new Promise((resolve) => {
    const el = document.createElement("audio");
    el.preload = "metadata";
    const url = URL.createObjectURL(src);
    const done = (value: number) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(value) && value > 0 ? Math.round(value) : 0);
    };
    el.onloadedmetadata = () => done(el.duration);
    el.onerror = () => done(0);
    el.src = url;
  });
}
