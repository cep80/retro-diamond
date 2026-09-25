/**
 * What a scene frames at each beat: whose bust, in which mood, and how the
 * place reads. Pure, so the rules are tested apart from the player.
 */
import type { Beat, Mood } from "./story.ts";
import type { CharacterId } from "./types.ts";

/** Only real joy or real hurt changes her bust; everything else reads as neutral. */
export function heldMood(mood: Mood | undefined): Mood {
  return mood === "elated" || mood === "crushed" ? mood : "neutral";
}

/**
 * Who has the frame at a beat, and in which bust. Each mood is its own painting
 * (the uniform and framing drift between them), so the bust latches: it starts
 * neutral, changes when she first hits real joy or hurt, and never drops back
 * to neutral while she keeps the frame. A different girl taking the frame
 * starts her own latch.
 */
export function framedBust(beats: readonly Beat[], index: number, girl: CharacterId): { still: CharacterId; mood: Mood } {
  let still: CharacterId = girl;
  let mood: Mood = "neutral";
  for (let i = 0; i <= index; i++) {
    const b = beats[i]!;
    if (b.who === "narration" || b.who === "coach") continue;
    if (b.who !== still) {
      still = b.who;
      mood = "neutral";
    }
    const m = heldMood(b.mood);
    if (m !== "neutral") mood = m;
  }
  return { still, mood };
}

const SMALL_WORDS = new Set(["a", "an", "the", "and", "by", "of", "on", "in", "at", "to", "for"]);

/** "Koi Park cage · a drizzle nobody asked for" → "Koi Park Cage", then the weather under it. */
export function splitPlace(place: string): { where: string; when: string | null } {
  const [where, ...rest] = place.split(" · ");
  const title = where!
    .trim()
    .split(" ")
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
  return { where: title, when: rest.length ? rest.join(" · ").trim() : null };
}
