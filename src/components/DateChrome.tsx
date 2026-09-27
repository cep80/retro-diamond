"use client";

/**
 * The date's broadcast chrome: the pieces a race-day broadcast lays over the
 * film. Presentational only: no timers, no state. The caller mounts one for
 * CHROME_MS[...] on its own pause-aware timer (the mound's later(), the race's
 * film clock) and unmounts it after; `paused` freezes its animation with the
 * date, and `reduced` (or the OS setting) swaps the motion for a plain fade in.
 * Give each showing its own `key` so a second one plays from the start.
 *
 * None of them takes a tap. None belongs over Go or the sit / glove grid while
 * it is live: show them at the wind-up, not at the aim.
 */
import type React from "react";
import { CHROME_MS } from "@/components/race-ui";

export { CHROME_MS };

function timing(ms: number): React.CSSProperties {
  return { ["--dc-ms" as string]: `${ms}ms` } as React.CSSProperties;
}

/**
 * Her unique skill (tone "accent", in her kit colour) or the last spurt
 * ("spurt", coral): a skewed band across the film that slides in, holds and
 * fades in CHROME_MS.skill. `jp` is her kana, set before the name.
 */
export function SkillBanner({
  text,
  jp,
  tone = "accent",
  reduced,
  paused = false,
}: {
  text: string;
  jp?: string | null;
  tone?: "accent" | "spurt";
  reduced: boolean;
  paused?: boolean;
}) {
  return (
    <div
      className={`shine-skill-banner ${reduced ? "is-reduced" : ""}`}
      data-tone={tone}
      data-dc-paused={paused ? "" : undefined}
      style={timing(CHROME_MS.skill)}
      data-skill-banner={text}
    >
      <p className="shine-skill-band">
        {jp ? (
          <span className="shine-skill-kana" lang="ja">
            {jp}
          </span>
        ) : null}
        <span className="shine-skill-name">{text}</span>
      </p>
    </div>
  );
}

/**
 * A broadcast nameplate at the foot of the film, above the Coach's lines, for
 * a new batter (the mound) or a new pitcher (the race): it slides in, holds
 * and goes in CHROME_MS.lowerThird. "レイナ Reina · #18" over "Academy Gate".
 * `accent` trims it in the named girl's kit colour (kitAccent); without it the
 * plate takes the date's own --shine-accent.
 */
export function LowerThird({
  name,
  jp,
  number,
  line,
  accent,
  reduced,
  paused = false,
}: {
  name: string;
  jp?: string | null;
  number?: number | null;
  line: string;
  accent?: string | null;
  reduced: boolean;
  paused?: boolean;
}) {
  const style = timing(CHROME_MS.lowerThird);
  if (accent) (style as Record<string, string>)["--shine-accent"] = accent;
  return (
    <div
      className={`shine-lower-third ${reduced ? "is-reduced" : ""}`}
      data-dc-paused={paused ? "" : undefined}
      style={style}
      data-lower-third={name}
    >
      <div className="shine-lt-plate">
        {number !== null && number !== undefined ? <span className="shine-lt-num">#{number}</span> : null}
        <span className="shine-lt-text">
          <span className="shine-lt-name">
            {jp ? (
              <>
                <span className="shine-kana" lang="ja">
                  {jp}
                </span>{" "}
              </>
            ) : null}
            {name}
          </span>
          {line ? <span className="shine-lt-line">{line}</span> : null}
        </span>
      </div>
    </div>
  );
}

export interface VsSide {
  /** A still URL: the pitcher's set, the batter's stance. */
  src: string;
  name: string;
}

/**
 * The split card before a cast girl's at-bat: `left` (the pitcher's set) and
 * `right` (the batter's stance) slide in from their sides, cut on a diagonal
 * with a gold rule, each still full height and cropped to her middle, and VS
 * lands between them in the gold stamp face, over CHROME_MS.vs. The crowd's
 * burst is the caller's sound.
 */
export function VsSplash({
  left,
  right,
  reduced,
  paused = false,
}: {
  left: VsSide;
  right: VsSide;
  reduced: boolean;
  paused?: boolean;
}) {
  return (
    <div
      className={`shine-vs ${reduced ? "is-reduced" : ""}`}
      data-dc-paused={paused ? "" : undefined}
      style={timing(CHROME_MS.vs)}
      role="img"
      aria-label={`${left.name} against ${right.name}`}
      data-vs={`${left.name}|${right.name}`}
    >
      <div className="shine-vs-side shine-vs-a" aria-hidden>
        <img src={left.src} alt="" draggable={false} />
        <span className="shine-vs-name">{left.name}</span>
      </div>
      <div className="shine-vs-side shine-vs-b" aria-hidden>
        <img src={right.src} alt="" draggable={false} />
        <span className="shine-vs-name">{right.name}</span>
      </div>
      <div className="shine-vs-rule" aria-hidden />
      <div className="shine-vs-mark" aria-hidden>
        <div className="shine-stamp shine-stamp-gold shine-stamp-still">
          <span className="shine-stamp-jp">VS</span>
        </div>
      </div>
    </div>
  );
}
