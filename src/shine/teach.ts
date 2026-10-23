/**
 * How it works. Coach talking, one card at a time. Never a dumped manual.
 */

export interface TeachCard {
  title: string;
  body: string;
}

export const TEACH_CARDS: readonly TeachCard[] = [
  {
    title: "At the plate",
    body: "Tap where it's coming, then Go. Swing when it gets to her. Leave Swing alone and she takes it.",
  },
  {
    title: "Where it's coming",
    body: "The one you tap is where you think it's coming. Right on it, she's ready. Off it, she isn't.",
  },
  {
    title: "On the mound",
    body: "When she's pitching, tap where you want the catcher to set up, then press Go. She picks the pitch herself.",
  },
  {
    title: "The big games",
    body: "Each big night she's going for one thing. Miss two of those nights, and they send her home.",
  },
  {
    title: "Rivals",
    body: "The girl across from her only knows what she's actually seen. If you haven't shown her something, she doesn't know it's coming.",
  },
  {
    title: "How she's feeling",
    body: "Every morning she'll tell you herself. Tired or down, she misses more. A day off or a game of catch fixes a lot.",
  },
  {
    title: "Mornings",
    body: "Pick one thing for her to work on each morning. Tomorrow she'll tell you how it went.",
  },
  {
    title: "The shop",
    body: "The shop only sells clothes and songs. Nothing that makes her better at baseball.",
  },
];

/** One sentence at a time, so How it works doesn't dump a whole card. */
export function teachLines(body: string): string[] {
  const parts = body
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : [body.trim()];
}
