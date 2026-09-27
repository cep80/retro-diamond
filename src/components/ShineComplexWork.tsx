import type { CSSProperties, Dispatch, SetStateAction } from "react";
import { ShineMute } from "@/components/ShineMute";
import { ShineBack, ShineRoundBtn } from "@/components/ShineRoundBtn";
import { dateLabel, daysAwayLabel, type CalendarBeat } from "@/shine/calendar.ts";
import { isPitcherStyle, officialFor, sheet } from "@/shine/bible.ts";
import { speakGoal } from "@/shine/goals.ts";
import { morningSpeech } from "@/shine/culture.ts";
import { liveStationIds, workLocked } from "@/shine/store.ts";
import type { StationId, TraineeRun } from "@/shine/types.ts";

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

export const MOOD_KANA = ["絶不調", "不調", "普通", "好調", "絶好調"] as const;

export function ShineComplexWork({
  run,
  art,
  meta,
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
  const ask = officialFor(run.characterId, next.turn);
  const firstMorning = run.turn === 1;
  const empty = workLocked(run);
  const stations = STATIONS.filter((s) => liveStationIds(run).includes(s.id));
  return (
    <main className="shine-stage">
      <img src="/bg/skyline-complex.png" alt="" className="absolute inset-0 size-full object-cover" />
      <div className="shine-stage-wash absolute inset-0" />
      {/* Exactly one screen tall: her portrait takes what the tiles leave, so every tile stays above the fold. */}
      <div className="relative z-10 flex h-dvh flex-col">
        <div className="px-3 pt-3 sm:px-5">
          <div className="shine-hud">
            <p className="episode-chip w-fit">
              {who.jp} · #{who.number} · {dateLabel(meta, who.style)}
            </p>
            {firstMorning ? null : (
              <p className="shine-kana text-sm text-gold">{MOOD_KANA[moodIdx]}</p>
            )}
            <div className="shine-goal-chip">
              <p className="shine-kana text-[11px] text-gold">
                {next.type === "forced-scene" || next.type === "year-start" ? "次へ" : "次の試合"}
              </p>
              <p className="mt-0.5 font-display text-xs font-bold uppercase">
                {dateLabel(next, who.style)} · {daysAwayLabel(turnsAway)}
              </p>
              <p className="mt-0.5 font-ui text-[11px] text-cream/80">{ask ? `${who.pgVerb} · ${speakGoal(ask.verb)}` : who.pgVerb}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <ShineMute />
              <ShineRoundBtn icon="settings" label="Settings" onClick={openSettings} />
              <ShineBack onClick={openTitle} />
            </div>
          </div>
        </div>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-end px-3 py-3 sm:px-5">
          {art ? (
            <img
              src={art}
              alt=""
              className={`shine-hero-stand min-h-0 w-full flex-1 object-contain object-bottom max-h-[min(52dvh,28rem)] sm:max-h-[min(64dvh,36rem)] ${run.altLook ? "shine-alt-look" : ""}`}
            />
          ) : null}
          <div className="shine-speech relative z-[2] mb-2 max-w-md -mt-6">
            <p className="shine-kana text-[11px] text-ink/50">
              #{who.number} {who.jp}
            </p>
            <p className="mt-1 font-ui text-sm leading-relaxed">{morningSpeech(lastLine, run.year, who.parkId, isPitcherStyle(who.style))}</p>
          </div>
        </div>

        <div className="relative z-10 px-3 pb-4 sm:px-5">
          {/* Five tiles (a low day opens the Trainer's room) go three across, so there's never a third row. */}
          <div className={`grid gap-2 sm:grid-cols-3 ${stations.length > 4 ? "grid-cols-3" : "grid-cols-2"}`}>
            {stations.map((s) => {
              const shut = empty && s.id !== "treatment";
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={shut}
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
                  className={`shine-station ${shut ? "opacity-40" : ""}`}
                  style={
                    {
                      ["--station-color"]: s.color,
                      ["--station-kana"]: `"${s.kana}"`,
                    } as CSSProperties
                  }
                >
                  <p className="shine-kana text-[11px] text-cream/80">{s.kana}</p>
                  <p className="mt-0.5 font-display text-xs font-bold uppercase tracking-wide">{s.label}</p>
                </button>
              );
            })}
          </div>
          {empty ? <p className="mt-2 font-ui text-sm text-coral">She&apos;s empty. Trainer&apos;s room.</p> : null}
        </div>
      </div>
    </main>
  );
}
