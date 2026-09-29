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
import { useEffect, useState } from "react";
import { picturesReady } from "@/components/preload";
import { CHROME_MS, FINALE_PLATE, type DateTitle } from "@/components/race-ui";
import { sheet } from "@/shine/bible.ts";
import { kitAccent } from "@/shine/stage.ts";
import type { CharacterId } from "@/shine/types.ts";

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
  line,
  reduced,
  paused = false,
}: {
  left: VsSide;
  right: VsSide;
  /** The head-to-head from the big dates already sat ("Third meeting. Aoi leads 2–0."), under VS. */
  line?: string | null;
  reduced: boolean;
  paused?: boolean;
}) {
  return (
    <div
      className={`shine-vs ${reduced ? "is-reduced" : ""}`}
      data-dc-paused={paused ? "" : undefined}
      style={timing(CHROME_MS.vs)}
      role="img"
      aria-label={`${left.name} against ${right.name}${line ? `. ${line}` : ""}`}
      data-vs={`${left.name}|${right.name}`}
      data-vs-record={line ?? undefined}
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
        {line ? <p className="shine-vs-record">{line}</p> : null}
      </div>
    </div>
  );
}

// ── The big dates' escalation (check-in 22, date presentation) ────────────

export interface TitleSide {
  name: string;
  jp: string | null;
  number: number | null;
  accent: string | null;
}

/** A cast girl's nameplate for the entrance, trimmed in her kit colour. */
export function castSide(id: CharacterId): TitleSide {
  const s = sheet(id);
  return { name: s.name, jp: s.jp, number: s.number, accent: kitAccent(id) };
}

/**
 * The card before a big date's first Go, letterboxed over the film: the date's
 * name in kana and English, where it is, and its rung ("Classic Year · 2 of 2").
 * The Finale's entrance is the same card grown: its own stadium plate, both
 * nameplates, and the head-to-head. Unlike the rest of the chrome it takes a
 * tap: anywhere on it skips it. The caller times it (CHROME_MS.title or
 * .entrance) and plays the fanfare; `reduced` sets it down still.
 */
export function DateTitleCard({
  title,
  plate,
  her,
  rival,
  record,
  reduced,
  onSkip,
}: {
  title: DateTitle;
  /** The Finale's stadium; other dates keep the film under the bars. */
  plate?: { src: string; fallback: string } | null;
  her?: TitleSide | null;
  rival?: TitleSide | null;
  record?: string | null;
  reduced: boolean;
  onSkip: () => void;
}) {
  const finale = title.tier === "finale";
  const side = (s: TitleSide, at: "a" | "b") => (
    <span className={`shine-title-plate shine-title-plate-${at}`} style={s.accent ? ({ ["--shine-accent" as string]: s.accent } as React.CSSProperties) : undefined}>
      {s.number !== null ? <span className="shine-lt-num">#{s.number}</span> : null}
      <span className="shine-title-plate-name">
        {s.jp ? (
          <span className="shine-kana" lang="ja">
            {s.jp}
          </span>
        ) : null}
        {s.name}
      </span>
    </span>
  );
  return (
    <button
      type="button"
      className={`shine-title-card ${reduced ? "is-reduced" : ""}`}
      data-tier={title.tier}
      data-title-card={title.en}
      style={timing(finale ? CHROME_MS.entrance : CHROME_MS.title)}
      onClick={onSkip}
      aria-label={`${title.en}. ${title.place} ${title.step}.${record ? ` ${record}` : ""} Tap to go on.`}
    >
      {plate ? (
        <img
          src={plate.src}
          alt=""
          draggable={false}
          className="shine-title-plate-img"
          onError={(e) => {
            const img = e.currentTarget;
            if (!img.src.endsWith(plate.fallback)) img.src = plate.fallback;
          }}
          aria-hidden
        />
      ) : null}
      <span className="shine-title-shade" aria-hidden />
      <span className="shine-title-bar shine-title-bar-top" aria-hidden />
      <span className="shine-title-bar shine-title-bar-bottom" aria-hidden />
      <span className="shine-title-body" aria-hidden>
        <span className="shine-title-step">{title.step}</span>
        <span className="shine-title-jp" lang="ja">
          {title.jp}
        </span>
        <span className="shine-title-en">{title.en}</span>
        <span className="shine-title-rule" />
        <span className="shine-title-place">{title.place}</span>
        {her && rival ? (
          <span className="shine-title-match">
            {side(her, "a")}
            <span className="shine-title-vs">VS</span>
            {side(rival, "b")}
          </span>
        ) : null}
        {record ? <span className="shine-title-record">{record}</span> : null}
      </span>
    </button>
  );
}

/**
 * A won Finale's moment, as long as a home run's, over the done panel whatever
 * the last pitch was: the stadium behind her joy, gold rays turning around her
 * face, streamers, and 優勝 CHAMPION landing kana by kana. A tap skips it. The
 * caller times it (CHROME_MS.finaleWin) from `onReady`; `reduced` sets it all down still.
 *
 * Its picture is the ending's budget (ending-pictures finaleWinPicture): her elated bust over the
 * Finale's plate, or, when the ending scene holds that bust, her biggest joy on film, full bleed.
 * It shows nothing until the plate and the picture are decoded (check-in 31, F4: it opened on
 * bare gold rays), and waits no longer than 600 ms (preload.ts). The wait is the same with
 * reduced motion; only what plays after it is still.
 */
export function FinaleWinMoment({
  picture,
  name,
  jp,
  reduced,
  onSkip,
  onReady,
}: {
  picture: { kind: "film" | "bust"; src: string };
  name: string;
  jp: string | null;
  reduced: boolean;
  onSkip: () => void;
  /** The pictures are in (or the cap ran out): the hold starts now. */
  onReady?: () => void;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    void picturesReady(picture.kind === "bust" ? [FINALE_PLATE.src, picture.src] : [picture.src]).then(() => {
      if (!live) return;
      setReady(true);
      onReady?.();
    });
    return () => {
      live = false;
    };
    // Once per showing: the picture doesn't change under it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picture.src]);
  const still = reduced ? "shine-hr-still" : "";
  const hold = { ["--hr-hold" as string]: `${CHROME_MS.finaleWin}ms` } as React.CSSProperties;
  // Waiting on the pictures: a tap still goes on, but nothing plays on bare rays.
  if (!ready)
    return <button type="button" className="shine-finale-win-wait" onClick={onSkip} aria-label={`${name} won the Diamond Finale. Tap to go on.`} data-finale-win="waiting" />;
  return (
    <>
      <button type="button" className={`shine-finale-win ${reduced ? "is-reduced" : ""}`} style={hold} onClick={onSkip} aria-label={`${FINALE_WIN_STAMP.en}. ${name} won the Diamond Finale. Tap to go on.`} data-finale-win="">
        {picture.kind === "bust" ? (
          <>
            <img
              src={FINALE_PLATE.src}
              alt=""
              draggable={false}
              className="shine-finale-win-park"
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.src.endsWith(FINALE_PLATE.fallback)) img.src = FINALE_PLATE.fallback;
              }}
              aria-hidden
            />
            <img src={picture.src} alt="" draggable={false} className="shine-finale-win-bust" data-finale-win-picture="bust" aria-hidden />
          </>
        ) : (
          <img src={picture.src} alt="" draggable={false} className="shine-finale-win-film" data-finale-win-picture="film" aria-hidden />
        )}
      </button>
      <div className={`shine-hr-bloom ${still}`} style={hold} aria-hidden />
      <div className={`shine-hr-rays ${still}`} style={hold} aria-hidden />
      <div className={`shine-hr-moment shine-finale-win-top ${still}`} style={hold} data-action-stamp="finale-win" aria-hidden>
        {reduced
          ? null
          : WIN_STREAMERS.map((s, i) => (
              <span
                key={i}
                className="shine-hr-streamer"
                style={{
                  ["--x" as string]: `${s.x}%`,
                  ["--d" as string]: `${s.d}ms`,
                  ["--r" as string]: `${s.r}deg`,
                  ["--fall" as string]: `${s.fall}ms`,
                  ["--flap" as string]: `${s.flap}ms`,
                  ["--drift" as string]: `${s.drift}rem`,
                  ["--c" as string]: s.c,
                }}
              />
            ))}
        <div className="shine-hr-bar shine-hr-bar-top" />
        <div className="shine-hr-bar shine-hr-bar-bottom" />
        <div className="shine-hr">
          <div className="shine-stamp shine-stamp-gold shine-stamp-hr">
            <span className="shine-stamp-jp">
              {[...FINALE_WIN_STAMP.jp].map((ch, i) => (
                <span key={i} className="shine-hr-kana" style={{ ["--i" as string]: i }}>
                  {ch}
                </span>
              ))}
            </span>
            <span className="shine-stamp-en">{FINALE_WIN_STAMP.en}</span>
          </div>
          <p className="shine-hr-name">
            {jp ? (
              <>
                <span className="shine-kana">{jp}</span>{" "}
              </>
            ) : null}
            {name} · Diamond Finale
          </p>
        </div>
      </div>
    </>
  );
}

/** 優勝, the Finale won. */
export const FINALE_WIN_STAMP = { jp: "優勝", en: "Champion" } as const;

const WIN_COLORS = ["#ffd166", "#fff3c4", "#ff7a6b", "#78eadc", "#ffffff"];
/** Fixed spots, like the home run's, so every win falls the same way (no random in render). */
const WIN_STREAMERS = Array.from({ length: 48 }, (_, i) => ({
  x: (7 + i * 41) % 100,
  d: (i * 67) % 1100,
  r: ((i * 47) % 120) - 60,
  fall: 2400 + ((i * 43) % 900),
  flap: 340 + ((i * 31) % 260),
  drift: ((i * 13) % 7) - 3,
  c: WIN_COLORS[i % WIN_COLORS.length]!,
}));
