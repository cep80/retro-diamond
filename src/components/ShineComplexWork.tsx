import { useEffect, useState, type CSSProperties, type Dispatch, type SetStateAction } from "react";
import { ShineMute } from "@/components/ShineMute";
import { ShineBack, ShineRoundBtn } from "@/components/ShineRoundBtn";
import { dateLabel, daysAwayLabel, type CalendarBeat } from "@/shine/calendar.ts";
import { isPitcherStyle, officialFor, sheet } from "@/shine/bible.ts";
import { speakGoal } from "@/shine/goals.ts";
import { morningSpeech } from "@/shine/culture.ts";
import { sfxGain } from "@/shine/audio.ts";
import { GRADES, STAT_EN, gradeIndex, roleStats, rookieSpringDue, sinceLastSpring, statGrade, type WithSpring } from "@/shine/grades.ts";
import { facilityRow, liveStationIds, restRowIds, useShine, workLocked } from "@/shine/store.ts";
import type { StationId, TraineeRun } from "@/shine/types.ts";
import {
  energyTone,
  energyWords,
  facilityFace,
  herMorning,
  isTrainingTile,
  moodFace,
  morningAfter,
  orderTiles,
  gainArrows,
  riskyFail,
  stationLifts,
  statStrip,
  strained,
  stripWords,
  tileGrid,
  workStill,
} from "@/components/work-day";

export { MOOD_KANA } from "@/components/work-day";

/**
 * Mark this spring's stats on the run (right after the year card's Morning), so
 * next spring's card can say which letters moved. Optional on the run: an old
 * save simply has no mark, and its next card shows her letters with no "since".
 */
export function markSpring() {
  useShine.setState((s) => {
    if (!s.run) return {};
    const run: TraineeRun & WithSpring = { ...s.run, springStats: { year: s.run.year, stats: { ...s.run.stats } } };
    return { run };
  });
}

/** The year card's growth line: the letters that moved since last spring, or her letters as they stand. */
export function YearGrades({ run }: { run: TraineeRun }) {
  const keys = roleStats(isPitcherStyle(sheet(run.characterId).style));
  const moves = sinceLastSpring(run, keys);
  if (moves && moves.length) {
    return (
      <div className="shine-year-grades" aria-label="Since last spring">
        {moves.map((m, i) => (
          <span key={m.stat} className="shine-year-grade" data-rank={GRADES.indexOf(m.to)} style={{ ["--i" as string]: i } as CSSProperties}>
            {STAT_EN[m.stat]}
            <b className="is-was">{m.from}</b>
            <span aria-label="to">→</span>
            <b>{m.to}</b>
          </span>
        ))}
      </div>
    );
  }
  return (
    <>
      <div className="shine-year-grades" aria-label="Her grades">
        {keys.map((k, i) => (
          <span key={k} className="shine-year-grade" data-rank={gradeIndex(run.stats[k])} style={{ ["--i" as string]: i } as CSSProperties}>
            {STAT_EN[k]}
            <b>{statGrade(run.stats[k])}</b>
          </span>
        ))}
      </div>
      {moves ? <p className="shine-year-grade-quiet">The same letters as last spring.</p> : null}
    </>
  );
}

// Her main training leads: the Cage for a hitter, the Bullpen for a pitcher (each only shows for one).
// `short` is the facility row's name, where five share a phone's width.
export const STATIONS: { id: StationId; label: string; kana: string; color: string; short?: string }[] = [
  { id: "cage", label: "Cage", kana: "ケージ", color: "#ff718f" },
  { id: "side", label: "Bullpen", kana: "ブルペン", color: "#7ad7ff" },
  { id: "spots", label: "Spot work", kana: "制球", color: "#5fd9a0", short: "Spots" },
  { id: "poles", label: "Poles", kana: "ポール", color: "#78eadc" },
  { id: "looks", label: "Live looks", kana: "見極め", color: "#7ad7ff", short: "Looks" },
  { id: "bp", label: "On-field BP", kana: "打撃", color: "#ffd166", short: "BP" },
  { id: "situational", label: "Situational", kana: "状況", color: "#e07a3d", short: "Clutch" },
  { id: "charting", label: "Charting", kana: "映像", color: "#b794f6", short: "Film" },
  { id: "off-day", label: "Off day", kana: "休養", color: "#ffd166" },
  { id: "treatment", label: "Trainer's room", kana: "治療", color: "#c4d4e0" },
  { id: "clubhouse", label: "Clubhouse", kana: "キャッチ", color: "#ffd166" },
  { id: "hitch", label: "Hitch", kana: "ヒッチ", color: "#ffd166" },
];

/**
 * A work morning. She is the picture: her still fills the screen under the
 * HUD, and the tiles sit on her. The HUD is the same every morning (who and
 * which day, the buttons; her energy and mood; the next game). Yesterday's
 * work floats up as chips, her own words go in her bubble, and the Coach's
 * narration sits under it as a note with no name.
 */
export function ShineComplexWork({
  run,
  art,
  meta: _meta,
  mood: _mood,
  moodIdx,
  lastLine,
  train,
  finishForcedCage,
  setCatchBeat,
  openTitle,
  openSettings,
  next,
  turnsAway,
}: {
  run: TraineeRun;
  art: string | null;
  meta: CalendarBeat;
  mood: string;
  moodIdx: 0 | 1 | 2 | 3 | 4;
  lastLine: string | null;
  train: (station: StationId, intensive?: boolean) => void;
  finishForcedCage: () => void;
  setCatchBeat: Dispatch<SetStateAction<boolean>>;
  openTitle: () => void;
  openSettings: () => void;
  next: CalendarBeat;
  turnsAway: number;
}) {
  const who = sheet(run.characterId);
  const pitcher = isPitcherStyle(who.style);
  const ask = officialFor(run.characterId, next.turn);
  const empty = workLocked(run);
  // Day 1 is her one forced session, full width. After that: her five facilities in a row (the shut
  // ones say when they open), and the rest tiles under them.
  const firstDay = run.turn === 1;
  const facilities = firstDay ? [] : facilityRow(run);
  const restIds = firstDay ? liveStationIds(run) : orderTiles(restRowIds(run), empty);
  const stations = restIds.flatMap((id) => STATIONS.filter((s) => s.id === id));
  const grid = tileGrid(stations.length);
  const face = moodFace(moodIdx);
  const tone = energyTone(run.energy);
  const tired = strained(run.energy) && !empty;
  const after = morningAfter(run);
  const landFrom = after.energyFrom !== null && after.energyFrom !== run.energy ? after.energyFrom : null;
  const note = morningSpeech(lastLine, run.year, who.parkId, pitcher);
  const words = herMorning(run.characterId, run.turn, run.energy, moodIdx);
  // Her still changes by year and takes the season's grade (N7); `art` is only the old caller's fallback.
  const still = workStill(run);
  const pic = art ? still.src : null;
  const plate = art ? still.plate : "/bg/skyline-complex.png";
  const grade = { ["--work-grade" as string]: still.grade } as CSSProperties;
  const cells = statStrip(run, pitcher);
  const landed = cells.find((c) => c.land);
  const [open, setOpen] = useState(false);
  // A new morning starts with the strip folded.
  useEffect(() => setOpen(false), [run.turn]);

  // The Rookie spring, marked on her first morning before any work, so next spring's card can say what moved.
  useEffect(() => {
    if (!rookieSpringDue(run)) return;
    useShine.setState((s) =>
      s.run && s.run.id === run.id && rookieSpringDue(s.run)
        ? { run: { ...s.run, springStats: { year: 1, stats: { ...s.run.stats } } } as TraineeRun & WithSpring }
        : {},
    );
  }, [run]);

  // The gain chime lands with the bar (the fill runs 500 ms in, for 900 ms). Once a morning.
  const chimeKey = landed ? `${run.id}-${run.turn}-${landed.stat}` : null;
  useEffect(() => {
    if (!chimeKey) return;
    const t = window.setTimeout(() => sfxGain(), 1100);
    return () => window.clearTimeout(t);
  }, [chimeKey]);

  return (
    <main className="shine-stage shine-work" data-energy={tone}>
      {/* The same painting, blurred to light, behind the HUD and a wide screen's flanks. */}
      <div className="shine-work-plate" aria-hidden>
        <img src={plate} alt="" data-season={still.season} style={grade} />
      </div>
      {/* Exactly one screen tall: the HUD takes what it needs, she fills the rest, and the tiles sit on her. */}
      <div className="shine-work-frame">
        <header className="shine-work-top">
          <div className="shine-hud shine-work-hud">
            <p className="episode-chip shine-work-day">
              {who.jp} · #{who.number} · Day {run.turn}
            </p>
            <div className="shine-work-btns">
              <ShineMute />
              <ShineRoundBtn icon="settings" label="Settings" onClick={openSettings} />
              <ShineBack onClick={openTitle} />
            </div>
            <div className="shine-work-meters">
              <div
                className="shine-stat shine-work-energy"
                role="meter"
                aria-label="Energy"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={run.energy}
                aria-valuetext={energyWords(run.energy)}
                data-tone={tone}
              >
                <span className="shine-stat-kana" aria-hidden>
                  体力
                </span>
                <span className="shine-stat-en" aria-hidden>
                  Energy
                </span>
                <span className="shine-stat-track" aria-hidden>
                  <span
                    key={`fill-${run.turn}`}
                    className="shine-stat-fill"
                    data-land={landFrom === null ? undefined : landFrom < run.energy ? "up" : "down"}
                    style={{ width: `${run.energy}%`, ["--from" as string]: `${landFrom ?? run.energy}%` } as CSSProperties}
                  />
                </span>
              </div>
              <p className="shine-mood" data-mood={moodIdx}>
                <b className="shine-mood-arrow" aria-hidden>
                  {face.arrow}
                </b>
                <span className="shine-mood-kana" aria-hidden>
                  {face.kana}
                </span>
                <span className="shine-mood-en">
                  <span className="sr-only">Mood: </span>
                  {face.word}
                </span>
              </p>
              <p className="shine-work-fans">
                <span className="shine-work-fans-kana" aria-hidden>
                  ファン
                </span>
                <span className="sr-only">Fans: </span>
                <b className="shine-work-fans-n">{run.fans}</b>
              </p>
            </div>
            {/* Her five, as letters. A tap opens the bars; nothing here is a number. */}
            <button
              type="button"
              className="shine-work-grades"
              aria-expanded={open}
              aria-controls="shine-work-grade-panel"
              aria-label={`Her grades: ${stripWords(cells)}`}
              onClick={() => setOpen((o) => !o)}
            >
              {cells.map((c) => (
                <span
                  key={`${c.stat}-${run.turn}`}
                  className="shine-grade-cell"
                  data-rank={c.rank}
                  data-land={c.land ? (c.land.gradeFrom !== c.grade ? "grade" : "bar") : undefined}
                  style={{ ["--fill" as string]: c.fill, ["--from" as string]: c.land ? c.land.from : c.fill } as CSSProperties}
                  aria-hidden
                >
                  <span className="shine-grade-short">{c.short}</span>
                  <b className="shine-grade-letter" data-grade={c.grade}>
                    {c.land && c.land.gradeFrom !== c.grade ? <span className="shine-grade-was">{c.land.gradeFrom}</span> : null}
                    <span className="shine-grade-now">{c.grade}</span>
                  </b>
                  <span className="shine-grade-bar">
                    <span className="shine-grade-bar-fill" />
                  </span>
                </span>
              ))}
            </button>
            <div className="shine-goal-chip shine-work-goal">
              <p className="shine-work-goal-top">
                <span className="shine-kana text-[11px] text-gold">
                  {next.type === "forced-scene" || next.type === "year-start" ? "次へ" : "次の試合"}
                </span>
                <span className="shine-work-goal-name font-display text-xs font-bold uppercase">{dateLabel(next, who.style)}</span>
                <span className="shine-work-goal-days">{daysAwayLabel(turnsAway)}</span>
              </p>
              {ask ? <p className="mt-0.5 truncate font-ui text-[11px] text-cream/80">{speakGoal(ask.verb)}</p> : null}
            </div>
          </div>
          {open ? (
            <div id="shine-work-grade-panel" className="shine-grade-panel" role="group" aria-label="Her grades">
              {cells.map((c) => (
                <div key={c.stat} className="shine-grade-row" data-rank={c.rank}>
                  <span className="shine-grade-row-name">
                    <span className="shine-grade-row-kana">{c.kana}</span>
                    <span className="shine-grade-row-en">{c.en}</span>
                  </span>
                  <span className="shine-grade-row-track" style={{ ["--fill" as string]: c.fill, ["--cap" as string]: c.cap } as CSSProperties}>
                    <span className="shine-grade-row-fill" />
                    <span className="shine-grade-row-cap" title="As far as she can go" />
                  </span>
                  <b className="shine-grade-row-letter" data-grade={c.grade}>
                    {c.grade}
                  </b>
                </div>
              ))}
              <button type="button" className="shine-grade-close" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
          ) : null}
        </header>

        <div className="shine-work-body">
          {pic ? (
            <img
              key={pic}
              src={pic}
              alt=""
              className={`shine-work-art ${run.altLook ? "is-alt" : ""} ${still.bust ? "is-bust" : ""}`}
              data-work-still={still.year}
              data-season={still.season}
              style={grade}
            />
          ) : null}
          <div className="shine-work-wash" aria-hidden />
          <div key={`day-${run.turn}`} className="shine-work-stack">
            {note ? <p className="shine-work-note">{note}</p> : null}
            {after.chips.length ? (
              <div className="shine-work-chips" aria-label="What yesterday's work did">
                {after.chips.map((c, i) => (
                  <span key={c.text} className={`shine-gain-chip ${c.cost ? "is-cost" : ""}`} style={{ ["--i" as string]: i } as CSSProperties}>
                    {c.text}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="shine-speech shine-work-speech">
              <p className="shine-kana text-[11px] text-ink/50">
                #{who.number} {who.jp}
              </p>
              <p className="mt-0.5 font-ui text-sm leading-snug">{words}</p>
            </div>
            {facilities.length ? (
              <div className="shine-work-facilities" role="group" aria-label="Facilities">
                {facilities.map((f, i) => {
                  const s = STATIONS.find((x) => x.id === f.id)!;
                  const shut = !f.open || empty;
                  const face = facilityFace(f.id, run, f.open && !empty);
                  const name = s.short ?? s.label;
                  const says = !f.open
                    ? `${name}. ${face?.en ?? ""} work. ${f.reason ?? "Not open yet"}.`
                    : `${name}. ${face?.en ?? ""} work${face?.plusEn ? `, and a little ${face.plusEn}` : ""}.${face?.odds ? ` A gain is ${face.odds} today.` : ""}${face?.fail ? ` Tired or low, ${face.fail}% more risk it goes wrong.` : ""}`;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      disabled={shut}
                      aria-label={says}
                      data-lead={i === 0 ? "true" : undefined}
                      data-locked={!f.open ? "true" : undefined}
                      data-strain={tired && f.open ? "true" : undefined}
                      onClick={() => {
                        if (shut) return;
                        train(f.id, false);
                      }}
                      className="shine-station shine-facility"
                      style={{ ["--station-color"]: s.color, ["--station-kana"]: `"${s.kana}"` } as CSSProperties}
                    >
                      <span className="shine-facility-name font-display">{name}</span>
                      {face ? (
                        <>
                          <span className="shine-facility-kana" aria-hidden>
                            {face.kana}
                          </span>
                          <span className="shine-facility-stat" aria-hidden>
                            {face.en}
                          </span>
                          {face.plus ? (
                            <span className="shine-facility-plus" aria-hidden>
                              {face.plus}
                            </span>
                          ) : null}
                        </>
                      ) : null}
                      {!f.open ? (
                        <span className="shine-facility-lock" aria-hidden>
                          {f.reason ?? ""}
                        </span>
                      ) : face?.odds ? (
                        // The base roll's upside as arrows; 失敗 only for the risk rest and mood control (check-in 31, F2).
                        <span className="shine-facility-odds" aria-hidden>
                          <span className="shine-facility-arrows" data-odds={face.odds}>
                            {gainArrows(face.odds)}
                          </span>
                          {face.fail ? (
                            <span className="shine-facility-fail" data-risky={riskyFail(face.fail) ? "true" : undefined}>
                              <span className="shine-facility-fail-kana">失敗</span> {face.fail}%
                            </span>
                          ) : null}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
            <div className="shine-work-tiles" data-row={firstDay ? undefined : "rest"} style={{ ["--cols" as string]: grid.cols } as CSSProperties}>
              {stations.map((s, i) => {
                const shut = empty && s.id !== "treatment";
                // Day 1's forced session puts its point on the main stat only; the tile says just that.
                const lifts = firstDay ? stationLifts(s.id, run).slice(0, 1) : stationLifts(s.id, run);
                const wide = i === 0 && grid.leadSpan > 1;
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={shut}
                    data-lead={firstDay && i === 0 ? (wide ? "wide" : "true") : undefined}
                    data-strain={tired && isTrainingTile(s.id) ? "true" : undefined}
                    onClick={() => {
                      if (shut) return;
                      if (run.turn === 1 && (s.id === "cage" || s.id === "side")) {
                        finishForcedCage();
                        return;
                      }
                      if (s.id === "clubhouse") {
                        setCatchBeat(true);
                        return;
                      }
                      train(s.id, false);
                    }}
                    className="shine-station"
                    style={
                      {
                        ["--station-color"]: s.color,
                        ["--station-kana"]: `"${s.kana}"`,
                        gridColumn: wide ? `span ${grid.leadSpan}` : undefined,
                      } as CSSProperties
                    }
                  >
                    <span className="shine-station-kana">{s.kana}</span>
                    <span className="shine-station-label font-display">{s.label}</span>
                    {lifts.length ? (
                      <span className="shine-station-lift">
                        {lifts.map((l) => (
                          <span key={l.en} className="shine-lift">
                            <span className="shine-lift-kana">{l.kana}</span>
                            <b aria-hidden>{"↑".repeat(l.up)}</b>
                            <span className="shine-lift-en">{l.en}</span>
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            {empty ? <p className="shine-work-empty">She&apos;s empty. Trainer&apos;s room.</p> : null}
          </div>
        </div>
      </div>
    </main>
  );
}
