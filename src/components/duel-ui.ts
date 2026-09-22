/**
 * The Duel panel's pure half: the flag, labels, prompts, and the book rows.
 * Kept out of the .tsx so the node test runner can cover it.
 * Build spec: design/diamond-shine-duel-build-spec-2026-09-14.md §4.
 */
import { BOOK_WIT_2, BOOK_WIT_3, type CoachCardId, type DuelCall, type PitchFamily } from "../shine/duel.ts";
import type { ShineSettings } from "../shine/types.ts";

export const DUEL_PROMPT = {
  first: "Take lets her watch one. Sit hard or soft if you trust the book.",
  twoStrikes: "Two strikes. Protect holds the count.",
} as const;

export const CALL_LABEL: Record<DuelCall, string> = {
  "sit-cell": "Sit cell",
  "sit-hard": "Sit hard",
  "sit-soft": "Sit soft",
  protect: "Protect",
  take: "Take",
};

export const CARD_LABEL: Record<CoachCardId, string> = {
  "green-light": "Green light",
  spurt: "Spurt",
  "her-call": "Her call",
};

/** The hand, in keyboard order (1–5). */
export const HAND: readonly DuelCall[] = ["sit-cell", "sit-hard", "sit-soft", "protect", "take"];
/** The cards, in keyboard order (Q/W/E). */
export const CARD_ROW: readonly CoachCardId[] = ["green-light", "spurt", "her-call"];

export const HAND_KEYS: Record<string, DuelCall> = {
  Digit1: "sit-cell",
  Digit2: "sit-hard",
  Digit3: "sit-soft",
  Digit4: "protect",
  Digit5: "take",
};
export const CARD_KEYS: Record<string, CoachCardId> = { KeyQ: "green-light", KeyW: "spurt", KeyE: "her-call" };

/**
 * The Duel is the product (AAA lock 2026-09-18): on by default. `?duel=0`
 * is the dev off-switch, `?duel=1` forces it on over a saved-off setting.
 */
export function duelEnabled(settings: Pick<ShineSettings, "duel">, search?: string): boolean {
  const q = search ?? (typeof window === "undefined" ? "" : window.location.search);
  const flag = new URLSearchParams(q).get("duel");
  if (flag === "0") return false;
  if (flag === "1") return true;
  return settings.duel;
}

/**
 * Progressive hand (AAA lock): PA 1 is the 3×3 and Go — no call buttons.
 * PA 2 adds Take and the family sits. PA 3 adds Protect. The systems
 * (book, verdict, 70/30) run from pitch one regardless.
 */
export function handFor(paIndex: number): readonly DuelCall[] {
  if (paIndex <= 1) return [];
  if (paIndex === 2) return ["sit-cell", "sit-hard", "sit-soft", "take"];
  return HAND;
}

/** Coach cards: one chip on PA 3, the row from PA 4. */
export function cardsFor(paIndex: number): readonly CoachCardId[] {
  if (paIndex <= 2) return [];
  if (paIndex === 3) return ["green-light"];
  return CARD_ROW;
}

/** PA 1 reads only the open first line; later PAs see what the rest costs. */
export function bookRowsFor(rows: readonly BookRow[], paIndex: number): BookRow[] {
  if (paIndex <= 1) return rows.filter((r) => r.line === 1 && r.open);
  return [...rows];
}

export interface BookRow {
  line: 1 | 2 | 3;
  text: string;
  open: boolean;
}

/** Three rows: open lines as written; closed lines say what opens them. */
export function bookRows(book: readonly string[], wit: number, takes: number): BookRow[] {
  const closed = (line: 2 | 3) => {
    const needWit = line === 2 ? BOOK_WIT_2 : BOOK_WIT_3;
    const needTakes = line === 2 ? 1 : 2;
    if (wit >= needWit || takes >= needTakes) return "";
    return `— (Wit ${needWit}, or take ${needTakes === 1 ? "a pitch" : "two"})`;
  };
  return [
    { line: 1, text: book[0] ?? "", open: Boolean(book[0]) },
    { line: 2, text: book[1] ?? closed(2), open: Boolean(book[1]) },
    { line: 3, text: book[2] ?? closed(3), open: Boolean(book[2]) },
  ];
}

/**
 * The onboarding line for the moment, or null. The first hand (PA 2, the
 * first look), then the first two-strike count. No hand, no prompt — PA 1
 * has one coach line already.
 */
export function duelPrompt(opts: { firstPa: boolean; strikes: number; canCall: boolean; handSize?: number }): string | null {
  if (!opts.canCall) return null;
  if (opts.handSize === 0) return null;
  if (opts.firstPa) return DUEL_PROMPT.first;
  if (opts.strikes >= 2) return DUEL_PROMPT.twoStrikes;
  return null;
}

/** Which sit button wears the "likely" tag under the Eye hint. */
export function likelyTag(call: DuelCall, hint: PitchFamily | null): boolean {
  if (!hint) return false;
  return (call === "sit-hard" && hint === "hard") || (call === "sit-soft" && hint === "soft");
}
