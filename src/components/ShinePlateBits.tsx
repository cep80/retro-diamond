"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PixelBtn } from "@/components/pixel-btn";
import { dayChipLabel, doneStamp, scorebugLabel, type DateTier, type DayChip } from "@/components/race-ui";
import { portraitSrc } from "@/shine/bible.ts";
import type { Cell } from "@/shine/core/zone.ts";
import type { Bases } from "@/shine/events.ts";
import { rivalPortraitId, type ScoutingReport } from "@/shine/rivals.ts";

function cellKey(c: Cell) {
  return `${c.row}-${c.col}`;
}

/** Glass 3×3 on her body. Heat marks stay off. */
export function SitZone({
  aim,
  onSit,
  ghost,
  label,
}: {
  aim: Cell;
  onSit: (c: Cell) => void;
  ghost: Cell | null;
  label: string;
}) {
  return (
    <div className="shine-sit-plate" role="grid" aria-label={label}>
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => {
          const cell = { row: row as 0 | 1 | 2, col: col as 0 | 1 | 2 };
          const on = cellKey(aim) === cellKey(cell);
          const ghostHere = ghost !== null && cellKey(ghost) === cellKey(cell);
          return (
            <button
              key={cellKey(cell)}
              type="button"
              aria-pressed={on}
              aria-label={`${label} ${row + 1} ${col + 1}`}
              className={`shine-sit-cell ${ghostHere ? "shine-ghost-cell" : ""}`}
              onClick={() => onSit(cell)}
            />
          );
        }),
      )}
    </div>
  );
}

export type PauseReason = "user" | "hidden" | null;

/**
 * Pause that protects the attempt. Tab hidden or window blur freezes the
 * clock; the player resumes deliberately. `onResume` returns false when there
 * was nothing in flight, so the overlay simply closes.
 */
export function usePlatePause(opts: { onFreeze: () => void; onResume: () => boolean }) {
  const [reason, setReason] = useState<PauseReason>(null);
  const reasonRef = useRef<PauseReason>(null);
  reasonRef.current = reason;
  const { onFreeze, onResume } = opts;

  const pause = useCallback(
    (why: Exclude<PauseReason, null>) => {
      if (reasonRef.current) return;
      onFreeze();
      setReason(why);
    },
    [onFreeze],
  );

  const resume = useCallback(() => {
    if (!reasonRef.current) return;
    onResume();
    setReason(null);
  }, [onResume]);

  useEffect(() => {
    const hide = () => {
      if (document.visibilityState === "hidden") pause("hidden");
    };
    const blur = () => pause("hidden");
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("blur", blur);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("blur", blur);
    };
  }, [pause]);

  return { paused: reason !== null, pauseReason: reason, pause, resume };
}

/** Time: a 36 px pause glyph, drawn in the same line as the mute speaker beside it. */
export function PauseButton({ onPause }: { onPause: () => void }) {
  return (
    <button type="button" className="shine-hud-btn" onClick={onPause} aria-label="Pause">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" aria-hidden>
        <rect x="6.5" y="5.5" width="3.6" height="13" rx="1.2" />
        <rect x="13.9" y="5.5" width="3.6" height="13" rx="1.2" />
      </svg>
    </button>
  );
}

/** The pause dialog's way out on a screen whose attempt is saved (the career plate and mound). */
export const PAUSE_TITLE_SAVED = "Title · the attempt is saved";

export function PauseOverlay({
  reason,
  onResume,
  onSettings,
  onTitle,
  resumeLabel = "Back in the box",
  titleLabel = PAUSE_TITLE_SAVED,
}: {
  reason: PauseReason;
  onResume: () => void;
  onSettings: () => void;
  onTitle: () => void;
  resumeLabel?: string;
  /** Promise a save only where there is one: plain "Title" for the exhibition and the weekly look. */
  titleLabel?: string;
}) {
  return (
    // Fixed above the home-run layer (z 60): a pause mid-moment still reads.
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-ink/80 p-6" role="dialog" aria-modal="true" aria-label="Paused">
      <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-panel p-5 text-cream shadow-2xl">
        <p className="font-display text-xs uppercase tracking-widest text-grass-2">Time</p>
        <p className="mt-2 font-display text-xl font-bold">{reason === "hidden" ? "She stepped out." : "Paused."}</p>
        <p className="mt-1 font-ui text-sm text-cream/75">
          {reason === "hidden"
            ? "She called time. The pitch waits for you."
            : "The count and the runners hold. The pitch, if one was in the air, waits."}
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {/* The way back in is the date's one action colour: Go's gold. */}
          <PixelBtn className="shine-go h-12" onClick={onResume}>
            {resumeLabel}
          </PixelBtn>
          <PixelBtn variant="ghost" className="h-11" onClick={onSettings}>
            Settings
          </PixelBtn>
          <PixelBtn variant="ghost" className="h-11" onClick={onTitle}>
            {titleLabel}
          </PixelBtn>
        </div>
      </div>
    </div>
  );
}

export function BasesDiamond({ bases, self }: { bases: Bases; self: 1 | 2 | 3 | null }) {
  // One turn only: the inline transform places and rotates each bag. A Tailwind
  // rotate-45 on top of it (the `rotate` property) turned them 90°, back to squares.
  const sq = (on: boolean, mine: boolean, style: React.CSSProperties) => (
    <span
      className={`absolute size-2.5 border ${on ? (mine ? "border-gold bg-gold" : "border-cream bg-cream") : "border-cream/40 bg-transparent"}`}
      style={style}
    />
  );
  return (
    <span className="relative inline-block size-7" aria-label={`Runners: ${bases.first ? "first " : ""}${bases.second ? "second " : ""}${bases.third ? "third" : ""}`.trim() || "Bases empty"}>
      {sq(bases.second, self === 2, { left: "50%", top: 0, transform: "translate(-50%, 0) rotate(45deg)" })}
      {sq(bases.third, self === 3, { left: 0, top: "50%", transform: "translate(0, -50%) rotate(45deg)" })}
      {sq(bases.first, self === 1, { right: 0, top: "50%", transform: "translate(0, -50%) rotate(45deg)" })}
    </span>
  );
}

/**
 * The broadcast scorebug: inning and score, the count with its letters, the
 * outs, the bases. It floats in the top corner of the film, above her head.
 * `tag` names the game on a band along the bug's foot (the exhibition; the
 * mound and the career race with their date), so no loose label floats over
 * her cap; `tagGold` is the goal after it, in gold ("Record 3 outs").
 * `done` keeps the score up under the done panel: the count and the bases step
 * off, and an empty `atBat` drops its cell. The inning stays the real one; her
 * date usually ends before the game does, so the bug never claims "Final".
 */
export function Scorebug({
  inning,
  score,
  atBat,
  count,
  outs,
  bases,
  self,
  tag,
  tagGold,
  tier = null,
  done = false,
}: {
  inning: string | null;
  score: string | null;
  atBat: string;
  count: { balls: number; strikes: number };
  outs: number;
  bases: Bases;
  self: 1 | 2 | 3 | null;
  tag?: string;
  tagGold?: string;
  /** The date's rung (race-ui dateTier): the bug's rule goes bronze, silver, gold; the Finale adds its 決勝 mark. */
  tier?: DateTier | null;
  done?: boolean;
}) {
  const lamps = (n: number, of: number, on: string) =>
    Array.from({ length: of }, (_, i) => <i key={i} className={`shine-bug-lamp ${i < n ? on : ""}`} />);
  const final = done;
  const tagged = Boolean(tag || tagGold);
  return (
    <div
      className="shine-scorebug"
      data-final={final ? "" : undefined}
      data-tagged={tagged ? "" : undefined}
      data-tier={tier ?? undefined}
      aria-label={scorebugLabel({ tag, tagGold, inning, score, atBat, count, outs, done })}
    >
      <span className="shine-bug-cells">
        {tier === "finale" ? (
          <span className="shine-bug-cell shine-bug-finale" aria-hidden>
            決勝
          </span>
        ) : null}
        {inning ? (
          <span className="shine-bug-cell shine-bug-inning">
            <b>{inning}</b>
            {score ? <span>{score}</span> : null}
          </span>
        ) : null}
        {final ? null : (
          <>
            <span className="shine-bug-cell shine-bug-count" aria-hidden>
              <span className="shine-bug-row">
                <em>B</em>
                {lamps(count.balls, 3, "is-ball")}
              </span>
              <span className="shine-bug-row">
                <em>S</em>
                {lamps(count.strikes, 2, "is-strike")}
              </span>
              <span className="shine-bug-row">
                <em>O</em>
                {lamps(outs, 2, "is-out")}
              </span>
            </span>
            <span className="shine-bug-cell" aria-hidden>
              <BasesDiamond bases={bases} self={self} />
            </span>
          </>
        )}
        {/* "1 of 3" stays together: a narrow bug wraps it as AT-BAT / 1 OF 3, never 1 OF / 3. */}
        {atBat ? <span className="shine-bug-cell shine-bug-atbat">{atBat.replace(/(\d+) of (\d+)/, "$1 of $2")}</span> : null}
      </span>
      {tagged ? (
        // The dot stays with the date's name (a no-break space before it) and the goal never splits,
        // so a wrap reads "DIAMOND FINALE ·" over "Two strikeouts", never a line opening on the dot (check-in 31, F6).
        <span className="shine-bug-tag" aria-hidden>
          {tag}
          {tag && tagGold ? " · " : null}
          {tagGold ? <b className="shine-bug-tag-gold">{tagGold}</b> : null}
        </span>
      ) : null}
    </div>
  );
}

/**
 * The top of the done panel: the label, her still stamp (達成 gold when she
 * did it, 未達 slate when she didn't; `met` null for a date with no goal, such
 * as the exhibition or the bullpen), then the headline, big. The stamp is
 * still; the block rises in once unless `reduced`, and `paused` holds it.
 */
export function DoneHeader({
  met,
  label,
  headline,
  reduced = false,
  paused = false,
}: {
  met: boolean | null;
  label: string;
  headline: string;
  reduced?: boolean;
  paused?: boolean;
}) {
  const stamp = met === null ? null : doneStamp(met);
  return (
    <div
      className={`shine-done-head ${reduced ? "is-reduced" : ""}`}
      data-met={met === null ? undefined : String(met)}
      data-dc-paused={paused ? "" : undefined}
    >
      <p className="font-display text-xs uppercase tracking-[0.3em] text-grass-2">{label}</p>
      {stamp ? (
        <div className={`shine-stamp shine-stamp-${stamp.tone} shine-stamp-still shine-done-stamp`} role="img" aria-label={stamp.en}>
          <span className="shine-stamp-jp" aria-hidden>
            {stamp.jp}
          </span>
          <span className="shine-stamp-en" aria-hidden>
            {stamp.en}
          </span>
        </div>
      ) : null}
      <p className="shine-done-headline font-story text-3xl font-extrabold text-cream">{headline}</p>
    </div>
  );
}

/**
 * The finish at a glance: one mini stamp per at-bat (race, raceDayChips) or
 * per batter (mound, moundDayChips), kana over a small English pill in the
 * stamp's tone. A steal, a run she scored, or runs in against her ride the
 * chip's corner. Pictures, not a stat line.
 */
export function DayStrip({
  chips,
  label = "The day",
  reduced = false,
  paused = false,
}: {
  chips: readonly DayChip[];
  label?: string;
  reduced?: boolean;
  paused?: boolean;
}) {
  if (!chips.length) return null;
  return (
    <ol className={`shine-day-strip ${reduced ? "is-reduced" : ""}`} aria-label={label} data-dc-paused={paused ? "" : undefined}>
      {chips.map((c, i) => (
        <li key={c.key} className="shine-day-chip" data-tone={c.tone} style={{ ["--i" as string]: i }} aria-label={dayChipLabel(c)}>
          <span className="shine-day-jp" aria-hidden>
            {c.jp}
          </span>
          <span className="shine-day-en" aria-hidden>
            {c.en}
          </span>
          {c.stole || c.scored || c.runs ? (
            <span className="shine-day-marks" aria-hidden>
              {c.stole ? <span className="shine-day-mark">盗塁</span> : null}
              {c.scored ? <span className="shine-day-mark">得点</span> : null}
              {c.runs ? <span className="shine-day-mark is-against">{c.runs > 1 ? c.runs : ""}失点</span> : null}
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export function ScoutingCard({ report, park }: { report: ScoutingReport; park: string }) {
  const id = rivalPortraitId(report.arm);
  const art = id ? portraitSrc(id, "focused") : null;
  const late = report.lateArm ? rivalPortraitId(report.lateArm) : null;
  return (
    <section className="rounded-xl border border-white/20 bg-ink/85 p-4" aria-label="Scouting report">
      <div className="flex items-start gap-3">
        {art ? <img src={art} alt="" className="character-cutout h-14 w-auto object-contain sm:h-16" /> : null}
        <div className="min-w-0 flex-1">
          <p className="font-display text-[10px] uppercase tracking-widest text-grass-2">On the mound</p>
          <p className="font-display text-base font-bold text-cream">{report.title}</p>
          <p className="mt-1 font-ui text-xs text-cream/70">{park}</p>
        </div>
        {report.seen > 0 ? <p className="font-ui text-[10px] uppercase tracking-widest text-muted">Faced ×{report.seen}</p> : null}
      </div>
      <p className="mt-3 font-display text-[10px] uppercase tracking-widest text-gold">Her tells · before pitch 1</p>
      <ul className="mt-1 space-y-1 font-ui text-sm text-cream/90">
        <li>· {report.tells[0]}</li>
        <li>· {report.tells[1]}</li>
        <li className="text-cream/70">· {report.reads}</li>
      </ul>
      {report.adaptation ? (
        <p className="mt-3 rounded-lg border border-coral/40 bg-coral/10 px-3 py-2 font-ui text-sm text-cream">
          <span className="font-display text-[10px] uppercase tracking-widest text-coral">What she changed · </span>
          {report.adaptation.line}
        </p>
      ) : null}
      {report.history ? <p className="mt-2 font-ui text-xs text-muted">{report.history}</p> : null}
      {late ? (
        <p className="mt-2 font-ui text-xs text-gold/80">Late innings: the pen has someone who does not wait.</p>
      ) : null}
    </section>
  );
}
