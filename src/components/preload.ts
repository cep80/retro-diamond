/**
 * Decoding a picture before its moment (check-in 31, F4): the 優勝 frame opened on empty gold
 * rays when its bust and plate hadn't loaded. The Finale decodes them when it starts, and the
 * moment waits for them, never longer than a cap.
 */

const decoded = new Map<string, Promise<void>>();

/** Fetch and decode a picture once per session; a failed load settles too (the moment never hangs). */
export function decodePicture(src: string): Promise<void> {
  if (typeof Image === "undefined") return Promise.resolve();
  let p = decoded.get(src);
  if (!p) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    p =
      typeof img.decode === "function"
        ? img.decode().catch(() => undefined)
        : new Promise<void>((done) => {
            img.onload = () => done();
            img.onerror = () => done();
          });
    decoded.set(src, p);
  }
  return p;
}

/**
 * Settles when `ready` does or after `capMs`, whichever is first; says which. The timer is
 * injectable for tests.
 */
export function readyWithin(
  ready: Promise<unknown>,
  capMs: number,
  timer: (fn: () => void, ms: number) => unknown = (fn, ms) => setTimeout(fn, ms),
): Promise<"ready" | "cap"> {
  return Promise.race([ready.then(() => "ready" as const), new Promise<"cap">((done) => void timer(() => done("cap"), capMs))]);
}

/** The longest a moment waits for its pictures before it plays anyway. */
export const PICTURE_WAIT_CAP_MS = 600;

/** Decode every picture, waiting no longer than the cap. */
export function picturesReady(srcs: readonly string[], capMs = PICTURE_WAIT_CAP_MS): Promise<"ready" | "cap"> {
  return readyWithin(Promise.all(srcs.map(decodePicture)), capMs);
}
