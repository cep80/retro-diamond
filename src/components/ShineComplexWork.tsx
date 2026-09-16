import type { CSSProperties, Dispatch, SetStateAction } from "react";
import { PixelBtn } from "@/components/pixel-btn";
import { ShineMute } from "@/components/ShineMute";
import { clubhouseOpen, looksUnlocked, powerStationsUnlocked, type CalendarBeat } from "@/shine/calendar.ts";
import { sheet } from "@/shine/bible.ts";
import type { CoachBrief, WorkComparison } from "@/shine/coach.ts";
import { workMorningLine } from "@/shine/culture.ts";
import { finaleGap } from "@/shine/ending.ts";
import { workPreviewWindow } from "@/shine/oracle.ts";
import { energyBand, stationStaff, stationStat } from "@/shine/training.ts";
import { stationOpen, workLocked } from "@/shine/store.ts";
import type { StationId, TraineeRun, TraineeStatKey } from "@/shine/types.ts";

export const STATIONS: { id: StationId; label: string; blurb: string; kana: string; color: string }[] = [
  { id: "cage", label: "Cage", blurb: "Contact. Soft toss, the window.", kana: "ケージ", color: "#ff718f" },
  { id: "poles", label: "Poles", blurb: "Speed. Foul pole to foul pole.", kana: "ポール", color: "#78eadc" },
  { id: "looks", label: "Live looks", blurb: "Eye. Read it out of the hand.", kana: "見極め", color: "#7ad7ff" },
  { id: "bp", label: "On-field BP", blurb: "Power. Let it travel.", kana: "打撃", color: "#ffd166" },
  { id: "situational", label: "Situational", blurb: "Guts. Two-strike baseball.", kana: "状況", color: "#e07a3d" },
  { id: "charting", label: "Charting", blurb: "Wit. Film, tendencies, last-3 column.", kana: "映像", color: "#b794f6" },
  { id: "off-day", label: "Off day", blurb: "Energy +25. Let her breathe.", kana: "休養", color: "#ffd166" },
  { id: "treatment", label: "Trainer's room", blurb: "Energy +35. Mood dips.", kana: "治療", color: "#c4d4e0" },
  { id: "clubhouse", label: "Clubhouse", blurb: "Catch with Coach. Once a year.", kana: "キャッチ", color: "#ffd166" },
  { id: "hitch", label: "Her hitch", blurb: "She's throwing her mother's BP. Same work math.", kana: "受け継ぎ", color: "#ff718f" },
  { id: "side", label: "Side", blurb: "Stuff or Control. Bullpen. Pitchers only.", kana: "ブルペン", color: "#7ad7ff" },
];

const STAT_BOARD: { key: TraineeStatKey; jp: string; en: string; color: string }[] = [
  { key: "contact", jp: "ミート", en: "Contact", color: "#ff718f" },
  { key: "speed", jp: "走塁", en: "Speed", color: "#78eadc" },
  { key: "eye", jp: "見極め", en: "Eye", color: "#7ad7ff" },
  { key: "power", jp: "長打", en: "Power", color: "#ffd166" },
  { key: "guts", jp: "根性", en: "Guts", color: "#e07a3d" },
  { key: "wit", jp: "頭脳", en: "Wit", color: "#b794f6" },
];

const PITCH_BOARD: { key: TraineeStatKey; jp: string; en: string; color: string }[] = [
  { key: "stuff", jp: "球威", en: "Stuff", color: "#7ad7ff" },
  { key: "control", jp: "制球", en: "Control", color: "#c4d4e0" },
  { key: "stamina", jp: "スタミナ", en: "Stamina", color: "#55d99b" },
];

export const MOOD_KANA = ["絶不調", "不調", "普通", "好調", "絶好調"] as const;

function cagePreviewPct(run: TraineeRun, station: StationId, sideFocus: "stuff" | "control") {
  const stat = stationStat(station, sideFocus, run) ?? "contact";
  const half = workPreviewWindow(stat, run.stats[stat], run.carry);
  return Math.min(72, Math.max(12, (half / 0.6) * 100));
}

function StatTrack({ jp, en, value, color }: { jp: string; en: string; value: number; color: string }) {
  const pct = Math.max(6, Math.min(100, (value / 20) * 100));
  return (
    <div
      className="shine-stat"
      role="meter"
      aria-label={en}
      aria-valuemin={0}
      aria-valuemax={20}
      aria-valuenow={value}
      style={{ ["--stat-color" as string]: color }}
    >
      <span className="shine-stat-kana">{jp}</span>
      <span className="shine-stat-en">{en}</span>
      <div className="shine-stat-track">
        <div className="shine-stat-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="shine-stat-val">{value}</span>
    </div>
  );
}

export function ShineComplexWork({
  run,
  art,
  meta,
  mood,
  moodIdx,
  pitcher,
  brief,
  comparison,
  lastLine,
  preview,
  setPreview,
  intensive,
  setIntensive,
  sideFocus,
  setSideFocus,
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
  pitcher: boolean;
  brief: CoachBrief;
  comparison: WorkComparison | null;
  lastLine: string | null;
  preview: StationId | null;
  setPreview: Dispatch<SetStateAction<StationId | null>>;
  intensive: boolean;
  setIntensive: Dispatch<SetStateAction<boolean>>;
  sideFocus: "stuff" | "control";
  setSideFocus: Dispatch<SetStateAction<"stuff" | "control">>;
  train: (station: StationId, intensive?: boolean, sideFocus?: "stuff" | "control") => void;
  finishForcedCage: () => void;
  setCatchBeat: Dispatch<SetStateAction<boolean>>;
  openTitle: () => void;
  openSettings: () => void;
  next: CalendarBeat;
  turnsAway: number;
}) {
  const who = sheet(run.characterId);
  return (
    <main className="shine-stage">
      <img src="/bg/skyline-complex.png" alt="" className="absolute inset-0 size-full object-cover" />
      <div className="shine-stage-wash absolute inset-0" />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <div className="px-3 pt-3 sm:px-5">
          <div className="shine-hud">
            <p className="episode-chip w-fit">
              {who.jp} · #{who.number} · {meta.label}
            </p>
            <div className="shine-hud-meter">
              <p className="font-display text-[10px] uppercase tracking-widest text-muted">
                体力 · {energyBand(run.energy)}
              </p>
              <div className="shine-energy-bar mt-1" aria-hidden>
                <div className="shine-energy-fill" style={{ width: `${Math.max(0, Math.min(100, run.energy))}%` }} />
              </div>
            </div>
            <p className="font-ui text-sm">
              <span className="shine-kana text-gold">{MOOD_KANA[moodIdx]}</span>
              <span className="ml-2 text-cream/80">{mood}</span>
            </p>
            <p className="font-ui text-sm text-cream/80">ファン {run.fans}</p>
            <div className="shine-goal-chip">
              <p className="shine-kana text-[11px] text-gold">次の試合</p>
              <p className="mt-0.5 font-display text-xs font-bold uppercase">
                {next.label} · {turnsAway === 0 ? "today" : `${turnsAway} turn${turnsAway === 1 ? "" : "s"}`}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <ShineMute />
              <PixelBtn variant="ghost" className="h-9 px-3 text-[10px]" onClick={openSettings} ariaLabel="Settings">
                Settings
              </PixelBtn>
              <PixelBtn variant="ghost" className="h-9 px-3 text-[10px]" onClick={openTitle}>
                Title
              </PixelBtn>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-4 px-3 py-3 sm:flex-row sm:items-end sm:px-5">
          <aside className="shine-board order-2 space-y-3 sm:order-1">
            <p className="font-display text-[10px] uppercase tracking-widest text-gold">
              {who.name} · {who.pgVerb}
            </p>
            <div className="space-y-2">
              {(pitcher ? [...STAT_BOARD, ...PITCH_BOARD] : STAT_BOARD).map((s) => (
                <StatTrack key={s.key} jp={s.jp} en={s.en} value={run.stats[s.key]} color={s.color} />
              ))}
            </div>
            {lastLine ? <p className="font-ui text-xs text-grass-2">{lastLine}</p> : null}
            {comparison ? (
              <div className="rounded-xl border border-grass-2/40 bg-ink/60 px-3 py-2" data-testid="work-comparison">
                <p className="font-display text-[10px] uppercase tracking-widest text-grass-2">After the work</p>
                <p className="mt-1 font-ui text-sm text-cream/90">{comparison.line}</p>
                <p className="font-ui text-xs text-muted">{comparison.where}</p>
              </div>
            ) : null}
            <div className="rounded-xl border border-gold/30 bg-ink/50 p-3" data-testid="coach-brief">
              <p className="font-display text-[10px] uppercase tracking-widest text-gold">Coaching decision</p>
              <p className="mt-1 font-ui text-xs text-cream/80">
                {brief.condition.energy} · {brief.condition.mood} · {brief.condition.line}
              </p>
              <p className="mt-2 font-ui text-sm text-cream/90">{brief.need}</p>
              <p className="mt-1 font-ui text-xs text-grass-2">
                {STATIONS.find((s) => s.id === brief.choice.station)?.label ?? brief.choice.station} · {brief.choice.why}
              </p>
              {brief.nextTest.definition ? <p className="mt-1 font-ui text-xs text-muted">{brief.nextTest.definition}</p> : null}
            </div>
            {preview ? (
              <div>
                <p className="font-display text-xs uppercase tracking-widest text-gold">Window preview</p>
                <div
                  className="shine-window-preview mt-2"
                  style={
                    {
                      ["--window-pct"]: `${cagePreviewPct(run, preview, sideFocus)}%`,
                    } as CSSProperties
                  }
                  aria-hidden
                >
                  <div className="shine-window-preview-fill" />
                </div>
              </div>
            ) : null}
            <p className="font-ui text-xs text-muted">
              Turn {run.turn} / 60 · Year {run.year} · Potential {run.potential}
            </p>
            {run.pgResults.some((m) => m !== "pending") ? (
              <p className="font-ui text-xs text-muted">
                Gate {run.pgResults[0]} · First Light {run.pgResults[1]}
                {run.pgResults[2] !== "pending" ? ` · Lantern ${run.pgResults[2]}` : ""}
              </p>
            ) : null}
            {run.turn >= 6 && !run.finaleUnlocked ? <p className="font-ui text-xs text-gold">{finaleGap(run)}</p> : null}
          </aside>

          <div className="order-1 flex flex-1 flex-col items-center justify-end sm:order-2 sm:items-end">
            {art ? (
              <img
                src={art}
                alt=""
                className={`shine-hero-stand h-[min(52dvh,28rem)] w-auto object-contain object-bottom sm:h-[min(64dvh,36rem)] ${run.altLook ? "shine-alt-look" : ""}`}
              />
            ) : null}
            <div className="shine-speech relative z-[2] mb-2 max-w-md -mt-6">
              <p className="shine-kana text-[11px] text-ink/50">
                #{who.number} {who.jp}
              </p>
              <p className="mt-1 font-ui text-sm leading-relaxed">{workMorningLine(who.parkId)}</p>
              <p className="mt-1 font-ui text-xs text-ink/60">
                vs {sheet(who.rival).jp} · {who.sg}
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 px-3 pb-4 sm:px-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {STATIONS.filter((s) => {
              if (s.id === "clubhouse") return clubhouseOpen(run.turn);
              if (s.id === "hitch") return Boolean(run.parentId);
              if (s.id === "side") return pitcher;
              if (s.id === "cage" && pitcher && run.turn === 1) return false;
              return true;
            }).map((s) => {
              const open = stationOpen(run, s.id);
              const stat = stationStat(s.id, sideFocus, run);
              const staff = stationStaff(s.id, run);
              const blurb =
                s.id === "clubhouse" && run.turn < 6
                  ? "The complex is quiet. Sometimes the Coach will be around."
                  : s.id === "off-day" && run.turn <= 4
                    ? "Recover 25 energy. No stat progress. Sometimes the right call."
                    : s.blurb;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={!open.open}
                  title={open.reason || blurb}
                  data-preview={preview === s.id ? "true" : undefined}
                  onClick={() => {
                    if (run.turn === 1 && (s.id === "cage" || s.id === "side")) {
                      setPreview(s.id);
                      window.setTimeout(() => finishForcedCage(), 1000);
                      return;
                    }
                    if (s.id === "clubhouse") {
                      setCatchBeat(true);
                      return;
                    }
                    if (s.id === "off-day" || s.id === "treatment") {
                      train(s.id);
                      return;
                    }
                    setPreview(s.id);
                    window.setTimeout(() => train(s.id, intensive, sideFocus), 1000);
                  }}
                  className="shine-station"
                  style={
                    {
                      ["--station-color"]: s.color,
                      ["--station-kana"]: `"${s.kana}"`,
                    } as CSSProperties
                  }
                >
                  <p className="shine-kana text-[11px] text-cream/80">{s.kana}</p>
                  <p className="mt-0.5 font-display text-xs font-bold uppercase tracking-wide">{s.label}</p>
                  {staff && open.open ? <p className="mt-1 truncate font-ui text-[10px] text-gold/85">{staff}</p> : null}
                  {stat ? (
                    <p className="mt-1 font-display text-[10px] uppercase text-cream/90">
                      {stat} {run.stats[stat]}
                    </p>
                  ) : (
                    <p className="mt-1 font-ui text-[10px] text-cream/60">{blurb}</p>
                  )}
                </button>
              );
            })}
          </div>
          {run.turn > 5 && looksUnlocked(run.turn) === false ? (
            <p className="mt-2 font-ui text-xs text-muted">Live looks and Charting unlock after the Gate.</p>
          ) : null}
          {run.turn > 5 && !powerStationsUnlocked(run.turn) ? (
            <p className="mt-1 font-ui text-xs text-muted">On-field BP and Situational open at Turn 6.</p>
          ) : null}
          {workLocked(run) ? <p className="mt-2 font-ui text-sm text-coral">She&apos;s empty. Trainer&apos;s room.</p> : null}
          <div className="mt-3 flex flex-wrap items-center gap-4">
            {pitcher ? (
              <label className="flex items-center gap-2 font-ui text-sm text-muted">
                <input
                  type="checkbox"
                  checked={sideFocus === "control"}
                  onChange={(e) => setSideFocus(e.target.checked ? "control" : "stuff")}
                />
                Side focus: {sideFocus === "control" ? "Control" : "Stuff"}
              </label>
            ) : null}
            <label className="flex items-center gap-2 font-ui text-sm text-muted">
              <input type="checkbox" checked={intensive} onChange={(e) => setIntensive(e.target.checked)} />
              Intensive (−18 energy)
            </label>
          </div>
        </div>
      </div>
    </main>
  );
}
