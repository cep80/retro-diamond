/**
 * The Duel panel's pure half: the flag, labels, prompts, and the book rows.
 * Kept out of the .tsx so the node test runner can cover it.
 * Build spec: design/diamond-shine-duel-build-spec-2026-09-14.md §4.
 */
import { BOOK_WIT_2, BOOK_WIT_3, type CoachCardId, type DuelCall, type PitchFamily } from "../shine/duel.ts";
import type { ShineSettings } from "../shine/types.ts";

export const DUEL_PROMPT = {
  first: "Sit on a cell. Then give her the green light in the gold.",
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

/** `settings.duel`, or `?duel=1` on the URL. Default off: the plate stays byte-identical. */
export function duelEnabled(settings: Pick<ShineSettings, "duel">, search?: string): boolean {
  if (settings.duel) return true;
  const q = search ?? (typeof window === "undefined" ? "" : window.location.search);
  return new URLSearchParams(q).get("duel") === "1";
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

/** The onboarding line for the moment, or null. First PA only, then the first two-strike count. */
export function duelPrompt(opts: { firstPa: boolean; strikes: number; canCall: boolean }): string | null {
  if (!opts.canCall) return null;
  if (opts.firstPa) return DUEL_PROMPT.first;
  if (opts.strikes >= 2) return DUEL_PROMPT.twoStrikes;
  return null;
}

/** Which sit button wears the "likely" tag under the Eye hint. */
export function likelyTag(call: DuelCall, hint: PitchFamily | null): boolean {
  if (!hint) return false;
  return (call === "sit-hard" && hint === "hard") || (call === "sit-soft" && hint === "soft");
}
