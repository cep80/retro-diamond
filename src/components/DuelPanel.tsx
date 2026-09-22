/**
 * The Duel panel: her book, the hand of five, the coach cards, the verdict.
 * Shared by the career plate and the exhibition (both modes). Pure props;
 * the owner decides what a call does. Logic lives in duel-ui.ts.
 * Build spec: design/diamond-shine-duel-build-spec-2026-09-14.md §4.
 */
import { PixelBtn } from "@/components/pixel-btn";
import { callAllowed, type CoachCardId, type DuelCall, type PitchFamily } from "@/shine/duel.ts";
import { CALL_LABEL, CARD_LABEL, bookRows, bookRowsFor, cardsFor, duelPrompt, handFor, likelyTag } from "./duel-ui";

export interface DuelPanelProps {
  book: string[];
  call: DuelCall;
  cards: CoachCardId[];
  cardArmed: CoachCardId | null;
  verdict: string;
  strikes: number;
  /** Calls and cards are taken between pitches only. */
  canCall: boolean;
  /** Eye ≥ 10: what she probably throws next. */
  eyeHint: PitchFamily | null;
  wit: number;
  takes: number;
  /** A book line that just opened; flashes for a beat. */
  bookToast: 1 | 2 | 3 | null;
  firstPa: boolean;
  /** Progressive hand: PA 1 shows no calls, PA 2 the first look, PA 3+ the table. */
  paIndex: number;
  onCall: (call: DuelCall) => void;
  onCard: (card: CoachCardId) => void;
  onDisarm: () => void;
  compact?: boolean;
}

export function DuelPanel(p: DuelPanelProps) {
  const lines = bookRowsFor(bookRows(p.book, p.wit, p.takes), p.paIndex);
  const hand = handFor(p.paIndex);
  const cards = cardsFor(p.paIndex);
  const prompt = duelPrompt({ firstPa: p.paIndex <= 2 && p.firstPa, strikes: p.strikes, canCall: p.canCall, handSize: hand.length });
  const btn = p.compact ? "h-9 text-[10px]" : "h-10 text-xs";
  if (!lines.length && !hand.length && !cards.length && !p.verdict) return null;
  return (
    <section className="flex w-full flex-col gap-2" aria-label="The Duel" data-duel-hand={hand.length}>
      {lines.length ? (
        <div className="rounded-xl border border-line/70 bg-panel/80 px-3 py-2">
          <p className="font-display text-[10px] uppercase tracking-widest text-gold">Her book</p>
          <ul className="mt-1 space-y-0.5 font-ui text-xs">
            {lines.map((l) => (
              <li
                key={l.line}
                className={`${l.open ? "text-cream" : "text-muted/70"} ${p.bookToast === l.line ? "shine-book-open" : ""}`}
              >
                {l.text}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {hand.length ? (
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="The call">
        {hand.map((c) => {
          const legal = callAllowed(c, { strikes: p.strikes });
          const hint = likelyTag(c, p.eyeHint);
          return (
            <PixelBtn
              key={c}
              variant={p.call === c ? "primary" : "ghost"}
              pressed={p.call === c}
              className={`${btn} min-w-[44px] flex-1 px-2`}
              disabled={!p.canCall || !legal}
              onClick={() => p.onCall(c)}
            >
              {CALL_LABEL[c]}
              {hint ? <span className="ml-1 text-[9px] text-gold">likely</span> : null}
            </PixelBtn>
          );
        })}
      </div>
      ) : null}
      {cards.length ? (
      <div className="flex items-center gap-1.5" role="group" aria-label="Coach cards">
        {cards.map((card) => {
          const spent = !p.cards.includes(card) && p.cardArmed !== card;
          const armed = p.cardArmed === card;
          return (
            <button
              key={card}
              type="button"
              className={`rounded-full border px-2.5 py-1 font-display text-[10px] uppercase tracking-widest transition ${
                armed
                  ? "border-gold bg-gold/20 text-gold ring-2 ring-gold/60"
                  : spent
                    ? "border-line/40 text-muted/50"
                    : "border-line text-cream hover:border-gold"
              } ${p.canCall && !spent ? "" : "cursor-default"}`}
              disabled={spent || !p.canCall}
              aria-pressed={armed}
              onClick={() => (armed ? p.onDisarm() : p.onCard(card))}
            >
              {CARD_LABEL[card]}
            </button>
          );
        })}
      </div>
      ) : null}
      {p.verdict ? (
        <p className="font-ui text-sm text-cream/90" aria-live="polite">
          {p.verdict}
        </p>
      ) : null}
      {prompt ? <p className="font-ui text-[11px] text-muted">{prompt}</p> : null}
    </section>
  );
}
