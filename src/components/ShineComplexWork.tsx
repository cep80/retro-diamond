import type { CSSProperties, Dispatch, SetStateAction } from "react";
import { ShineMute } from "@/components/ShineMute";
import { ShineBack, ShineRoundBtn } from "@/components/ShineRoundBtn";
import { dateLabel, daysAwayLabel, type CalendarBeat } from "@/shine/calendar.ts";
import { isPitcherStyle, officialFor, sheet } from "@/shine/bible.ts";
import { speakGoal } from "@/shine/goals.ts";
import { morningSpeech } from "@/shine/culture.ts";
import { liveStationIds, workLocked } from "@/shine/store.ts";
import type { StationId, TraineeRun } from "@/shine/types.ts";
import {
  energyTone,
  energyWords,
  herMorning,
  isTrainingTile,
  moodFace,
  morningAfter,
  orderTiles,
  stationLifts,
  strained,
  tileGrid,
} from "@/components/work-day";

export { MOOD_KANA } from "@/components/work-day";

// Her main training leads: the Cage for a hitter, the Bullpen for a pitcher (each only shows for one).
export const STATIONS: { id: StationId; label: string; kana: string; color: string }[] = [
  { id: "cage", label: "Cage", kana: "ケージ", color: "#ff718f" },
  { id: "side", label: "Bullpen", kana: "ブルペン", color: "#7ad7ff" },
  { id: "poles", label: "Poles", kana: "ポール", color: "#78eadc" },
  { id: "looks", label: "Live looks", kana: "見極め", color: "#7ad7ff" },
  { id: "bp", label: "On-field BP", kana: "打撃", color: "#ffd166" },
  { id: "situational", label: "Situational", kana: "状況", color: "#e07a3d" },
  { id: "charting", label: "Charting", kana: "映像", color: "#b794f6" },
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
  train: (station: StationId, intensive?: boolean, sideFocus?: "stuff" | "control") => void;
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
  const ids = orderTiles(liveStationIds(run), empty);
  const stations = ids.flatMap((id) => STATIONS.filter((s) => s.id === id));
  const grid = tileGrid(stations.length);
  const face = moodFace(moodIdx);
  const tone = energyTone(run.energy);
  const tired = strained(run.energy) && !empty;
  const after = morningAfter(run);
  const landFrom = after.energyFrom !== null && after.energyFrom !== run.energy ? after.energyFrom : null;
  const note = morningSpeech(lastLine, run.year, who.parkId, pitcher);
  const words = herMorning(run.characterId, run.turn, run.energy, moodIdx);
  const plate = art ?? "/bg/skyline-complex.png";
  return (
    <main className="shine-stage shine-work" data-energy={tone}>
      {/* The same painting, blurred to light, behind the HUD and a wide screen's flanks. */}
      <div className="shine-work-plate" aria-hidden>
        <img src={plate} alt="" />
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
            </div>
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
        </header>

        <div className="shine-work-body">
          {art ? <img src={art} alt="" className={`shine-work-art ${run.altLook ? "is-alt" : ""}`} /> : null}
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
            <div className="shine-work-tiles" style={{ ["--cols" as string]: grid.cols } as CSSProperties}>
              {stations.map((s, i) => {
                const shut = empty && s.id !== "treatment";
                const lifts = stationLifts(s.id, run);
                const wide = i === 0 && grid.leadSpan > 1;
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={shut}
                    data-lead={i === 0 ? (wide ? "wide" : "true") : undefined}
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
                      train(s.id);
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
