import { useState } from "react";
import {
  avg,
  era,
  isPitcher,
  ovr,
  payroll,
  SALARY_CAP,
  shortName,
  TEAMS,
  TRAIN_COST,
} from "@/game/data";
import { nextUserSlot, standings, teamById, userTeam } from "@/game/sim";
import { useGame, type TrainStat } from "@/game/store";
import type { Player } from "@/game/types";
import { Card, Meter, PixelBtn, PlayerStars, RatingRow, Shell } from "./chrome";
import { sfxBlip, sfxSelect, startMusic, stopMusic, unlockAudio } from "@/game/audio";
import { cn } from "@/lib/utils";

function weekLabel(week: number, phase: string) {
  if (phase === "offseason") return "OFFSEASON";
  if (week === 17) return "SEMIS";
  if (week === 18) return "FINAL";
  return `WEEK ${week}`;
}

export function TitleScreen() {
  const career = useGame((s) => s.career);
  const setScreen = useGame((s) => s.setScreen);
  const continueGame = useGame((s) => s.continueGame);

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-ink text-cream">
      <img
        src="/bg/title.jpg"
        alt=""
        className="absolute inset-0 size-full object-cover"
        crossOrigin="anonymous"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/20" />
      <div className="scanlines absolute inset-0" />
      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-end px-5 pb-10 pt-16">
        <p className="font-display text-[10px] text-grass-2">NEWSTAR PARK — 1989</p>
        <h1 className="mt-3 font-display text-[28px] leading-[1.35] text-cream">
          RETRO
          <br />
          DIAMOND
        </h1>
        <p className="mt-4 max-w-sm font-ui text-sm leading-relaxed text-muted">
          Call the shots from the office. Time the swing at the plate. Sixteen games. One ring.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <PixelBtn
            className="h-12"
            onClick={() => {
              unlockAudio();
              sfxSelect();
              stopMusic();
              setScreen("teams");
            }}
          >
            New Career
          </PixelBtn>
          {career ? (
            <PixelBtn
              variant="ghost"
              className="h-12"
              onClick={() => {
                unlockAudio();
                sfxSelect();
                continueGame();
              }}
            >
              Continue
            </PixelBtn>
          ) : null}
          <PixelBtn
            variant="ghost"
            onClick={() => {
              unlockAudio();
              startMusic();
              setScreen("settings");
            }}
          >
            Settings
          </PixelBtn>
        </div>
      </div>
    </div>
  );
}

export function TeamSelect() {
  const newGame = useGame((s) => s.newGame);
  const setScreen = useGame((s) => s.setScreen);
  const [picked, setPicked] = useState(TEAMS[0]!.id);
  const [coach, setCoach] = useState("COACH");
  const team = TEAMS.find((t) => t.id === picked)!;

  return (
    <Shell title="Select Club" onBack={() => setScreen("title")}>
      <label className="mb-4 block">
        <span className="mb-2 block font-display text-[8px] text-muted">COACH NAME</span>
        <input
          value={coach}
          maxLength={14}
          onChange={(e) => setCoach(e.target.value.toUpperCase())}
          className="h-11 w-full border border-line bg-panel px-3 font-ui text-base uppercase text-cream outline-none focus:border-grass-2"
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        {TEAMS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              sfxBlip();
              setPicked(t.id);
            }}
            className={cn(
              "min-h-16 border px-3 py-3 text-left",
              picked === t.id ? "border-grass-2 bg-panel-2" : "border-line bg-panel",
            )}
          >
            <span className="block h-1.5 w-10" style={{ background: t.color2 }} />
            <span className="mt-2 block font-display text-[9px] leading-relaxed">{t.city}</span>
            <span className="font-ui text-sm text-muted">{t.name}</span>
          </button>
        ))}
      </div>
      <div className="mt-6">
        <PixelBtn
          className="h-12 w-full"
          onClick={() => {
            sfxSelect();
            newGame(picked, coach);
          }}
        >
          Take {team.abbr}
        </PixelBtn>
      </div>
    </Shell>
  );
}

export function Office() {
  const career = useGame((s) => s.career)!;
  const setScreen = useGame((s) => s.setScreen);
  const startPlay = useGame((s) => s.startPlay);
  const simUserGame = useGame((s) => s.simUserGame);
  const resetSave = useGame((s) => s.resetSave);
  const team = userTeam(career);
  const slot = nextUserSlot(career);
  const opp = slot ? teamById(career, slot.homeId === team.id ? slot.awayId : slot.homeId) : null;
  const home = slot ? slot.homeId === team.id : true;
  const fired = career.owner <= 10 && career.history.length >= 1;

  if (fired) {
    return (
      <Shell title="Owner's Box">
        <p className="font-display text-[12px] leading-relaxed text-danger">YOU'RE FIRED</p>
        <p className="mt-3 font-ui text-sm text-muted">
          The owner had seen enough. Pack the office. The diamond will still be here.
        </p>
        <PixelBtn className="mt-6 w-full" onClick={() => resetSave()}>
          Leave town
        </PixelBtn>
      </Shell>
    );
  }

  const links: { id: Parameters<typeof setScreen>[0]; label: string }[] = [
    { id: "roster", label: "Roster" },
    { id: "lineup", label: "Lineup" },
    { id: "bullpen", label: "Staff" },
    { id: "free-agents", label: "Free Agt" },
    { id: "training", label: "Train" },
    { id: "standings", label: "League" },
    { id: "stadium", label: "Park" },
    { id: "stats", label: "Stats" },
  ];

  return (
    <div className="relative mx-auto min-h-dvh max-w-lg overflow-hidden bg-ink text-cream">
      <img
        src="/bg/office.jpg"
        alt=""
        className="absolute inset-0 size-full object-cover opacity-40"
        crossOrigin="anonymous"
      />
      <div className="absolute inset-0 bg-ink/75" />
      <div className="relative z-10 flex min-h-dvh flex-col px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        <span className="mb-3 block h-1.5 w-16" style={{ background: team.color2 }} />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-[8px] text-grass-2">{weekLabel(career.week, career.phase)}</p>
            <h1 className="mt-1 font-display text-[13px] leading-relaxed">
              {team.city} {team.name}
            </h1>
            <p className="font-ui text-sm text-muted">
              {team.wins}-{team.losses} · {career.coachName}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setScreen("settings")}
            className="size-11 border border-line bg-panel font-display text-[9px] text-muted"
            aria-label="Settings"
          >
            SET
          </button>
        </div>

        <Card className="mt-4">
          {career.phase === "offseason" ? (
            <>
              <p className="font-display text-[10px]">Offseason desk</p>
              <p className="mt-1 font-ui text-sm text-muted">Draft, sign, then open camp.</p>
              <PixelBtn className="mt-3 w-full" onClick={() => setScreen("offseason")}>
                Offseason
              </PixelBtn>
            </>
          ) : career.live ? (
            <>
              <p className="font-display text-[10px]">Game in progress</p>
              <p className="mt-1 font-ui text-sm text-muted">
                {career.live.scoreA} - {career.live.scoreH} · {career.live.half === "top" ? "TOP" : "BOT"} {career.live.inning}
              </p>
              <PixelBtn className="mt-3 w-full" onClick={() => setScreen("play")}>
                Resume
              </PixelBtn>
            </>
          ) : slot && opp ? (
            <>
              <p className="font-display text-[8px] text-muted">{home ? "HOME" : "ROAD"}</p>
              <p className="mt-1 font-display text-[12px] leading-relaxed">
                vs {opp.city} {opp.name}
              </p>
              <p className="mt-1 font-ui text-xs text-muted">
                {opp.wins}-{opp.losses} · prestige {opp.prestige}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <PixelBtn className="h-12" onClick={startPlay}>
                  Play
                </PixelBtn>
                <PixelBtn variant="ghost" className="h-12" onClick={simUserGame}>
                  Sim
                </PixelBtn>
              </div>
            </>
          ) : (
            <>
              <p className="font-display text-[10px]">No game this slot</p>
              <PixelBtn className="mt-3 w-full" onClick={() => setScreen("standings")}>
                League
              </PixelBtn>
            </>
          )}
        </Card>

        {career.pendingPress ? (
          <PixelBtn variant="cream" className="mt-3 w-full" onClick={() => setScreen("press")}>
            Press waiting
          </PixelBtn>
        ) : null}

        <div className="mt-4 grid grid-cols-4 gap-2">
          {links.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                sfxBlip();
                setScreen(l.id);
              }}
              className="flex min-h-14 items-center justify-center border border-line bg-panel px-1 text-center font-display text-[8px] uppercase leading-tight text-cream"
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="mt-auto pt-5">
          <Meter label="Fans" value={career.fans} color="bg-grass-2" />
          <div className="mt-2">
            <Meter label="Owner" value={career.owner} color={career.owner < 30 ? "bg-danger" : "bg-dirt"} />
          </div>
          <div className="mt-3 flex justify-between font-ui text-xs text-muted">
            <span>C {career.credits}</span>
            <span>
              Cap {payroll(team.roster)}/{SALARY_CAP}
            </span>
            <span>Rings {career.rings}</span>
          </div>
        </div>

        {career.news[0] ? (
          <p className="mt-3 border-t border-line pt-3 font-ui text-xs leading-relaxed text-muted">
            {career.news[0].text}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function PlayerRow({
  p,
  onClick,
  extra,
}: {
  p: Player;
  onClick?: () => void;
  extra?: string;
}) {
  return (
    <Card onClick={onClick} className="flex items-center gap-3">
      <div
        className={cn(
          "flex size-10 items-center justify-center font-display text-[9px]",
          p.injured ? "bg-danger/80 text-cream" : "bg-ink-2 text-grass-2",
        )}
      >
        {p.pos}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-ui text-sm font-medium">{p.name}</p>
          <PlayerStars player={p} />
        </div>
        <p className="font-ui text-xs text-muted">
          {p.age}y · ${p.salary}M · {p.years}yr
          {extra ? ` · ${extra}` : ""}
          {p.injured ? ` · OUT ${p.injured}W` : ""}
        </p>
      </div>
    </Card>
  );
}

export function Roster() {
  const career = useGame((s) => s.career)!;
  const setScreen = useGame((s) => s.setScreen);
  const cutPlayer = useGame((s) => s.cutPlayer);
  const team = userTeam(career);
  const [sel, setSel] = useState<string | null>(null);
  const p = team.roster.find((x) => x.id === sel) ?? null;
  const hitters = team.roster.filter((x) => !isPitcher(x.pos)).sort((a, b) => ovr(b) - ovr(a));
  const arms = team.roster.filter((x) => isPitcher(x.pos)).sort((a, b) => ovr(b) - ovr(a));

  return (
    <Shell title="Roster" onBack={() => setScreen("office")}>
      <p className="mb-3 font-ui text-xs text-muted">
        {team.roster.length} players · payroll {payroll(team.roster)} / {SALARY_CAP}
      </p>
      <p className="mb-2 font-display text-[8px] text-grass-2">BATS</p>
      <div className="flex flex-col gap-2">
        {hitters.map((h) => (
          <PlayerRow key={h.id} p={h} extra={avg(h.stats)} onClick={() => setSel(h.id)} />
        ))}
      </div>
      <p className="mb-2 mt-5 font-display text-[8px] text-grass-2">ARMS</p>
      <div className="flex flex-col gap-2">
        {arms.map((h) => (
          <PlayerRow key={h.id} p={h} extra={era(h.stats)} onClick={() => setSel(h.id)} />
        ))}
      </div>
      {p ? (
        <div className="mt-4 border border-grass-2 bg-panel p-3">
          <p className="font-display text-[10px]">{p.name}</p>
          <p className="mt-1 font-ui text-xs text-muted">
            {p.pos} · OVR {ovr(p)} · POT {p.potential} · Morale {Math.round(p.morale)}
          </p>
          <div className="mt-3 space-y-1.5">
            {isPitcher(p.pos) ? (
              <>
                <RatingRow label="Stuff" n={p.stuff} />
                <RatingRow label="Ctrl" n={p.control} />
                <RatingRow label="Stam" n={p.stamina} />
              </>
            ) : (
              <>
                <RatingRow label="Hit" n={p.contact} />
                <RatingRow label="Pwr" n={p.power} />
                <RatingRow label="Spd" n={p.speed} />
                <RatingRow label="Eye" n={p.eye} />
                <RatingRow label="Glove" n={p.fielding} />
              </>
            )}
          </div>
          <PixelBtn variant="danger" className="mt-4 w-full" onClick={() => cutPlayer(p.id)}>
            Cut {shortName(p.name)}
          </PixelBtn>
        </div>
      ) : null}
    </Shell>
  );
}

export function Lineup() {
  const career = useGame((s) => s.career)!;
  const setScreen = useGame((s) => s.setScreen);
  const setLineupSlot = useGame((s) => s.setLineupSlot);
  const team = userTeam(career);
  const [slot, setSlot] = useState<number | null>(null);
  const bats = team.roster.filter((p) => !isPitcher(p.pos) && p.injured === 0);

  return (
    <Shell title="Lineup" onBack={() => setScreen("office")}>
      <p className="mb-3 font-ui text-xs text-muted">Tap a slot, then a bat.</p>
      <div className="flex flex-col gap-2">
        {team.lineup.map((id, i) => {
          const p = team.roster.find((x) => x.id === id);
          return (
            <Card
              key={i}
              onClick={() => setSlot(i)}
              className={cn("flex items-center gap-3", slot === i && "border-grass-2")}
            >
              <span className="w-5 font-display text-[10px] text-muted">{i + 1}</span>
              <span className="w-8 font-display text-[9px] text-grass-2">{p?.pos ?? "--"}</span>
              <span className="flex-1 font-ui text-sm">{p?.name ?? "Empty"}</span>
              {p ? <PlayerStars player={p} /> : null}
            </Card>
          );
        })}
      </div>
      {slot != null ? (
        <div className="mt-4">
          <p className="mb-2 font-display text-[8px] text-muted">PUT IN SLOT {slot + 1}</p>
          <div className="flex flex-col gap-2">
            {bats.map((p) => (
              <PlayerRow key={p.id} p={p} extra={avg(p.stats)} onClick={() => setLineupSlot(slot, p.id)} />
            ))}
          </div>
        </div>
      ) : null}
    </Shell>
  );
}

export function Bullpen() {
  const career = useGame((s) => s.career)!;
  const setScreen = useGame((s) => s.setScreen);
  const setRotationSlot = useGame((s) => s.setRotationSlot);
  const setCloser = useGame((s) => s.setCloser);
  const team = userTeam(career);
  const [slot, setSlot] = useState<number | "cl" | null>(null);
  const arms = team.roster.filter((p) => isPitcher(p.pos) && p.injured === 0);

  return (
    <Shell title="Staff" onBack={() => setScreen("office")}>
      <p className="mb-2 font-display text-[8px] text-grass-2">ROTATION</p>
      <div className="flex flex-col gap-2">
        {team.rotation.map((id, i) => {
          const p = team.roster.find((x) => x.id === id);
          return (
            <Card
              key={i}
              onClick={() => setSlot(i)}
              className={cn("flex items-center gap-3", slot === i && "border-grass-2")}
            >
              <span className="w-8 font-display text-[9px] text-muted">SP{i + 1}</span>
              <span className="flex-1 font-ui text-sm">{p?.name ?? "Empty"}</span>
              {p ? <span className="font-ui text-xs text-muted">EN {Math.round(p.energy)}</span> : null}
            </Card>
          );
        })}
      </div>
      <p className="mb-2 mt-5 font-display text-[8px] text-grass-2">CLOSER</p>
      <Card
        onClick={() => setSlot("cl")}
        className={cn(slot === "cl" && "border-grass-2")}
      >
        {team.roster.find((p) => p.id === team.closerId)?.name ?? "None"}
      </Card>
      {slot != null ? (
        <div className="mt-4 flex flex-col gap-2">
          {arms.map((p) => (
            <PlayerRow
              key={p.id}
              p={p}
              extra={`EN ${Math.round(p.energy)}`}
              onClick={() => (slot === "cl" ? setCloser(p.id) : setRotationSlot(slot, p.id))}
            />
          ))}
        </div>
      ) : null}
    </Shell>
  );
}

export function FreeAgents() {
  const career = useGame((s) => s.career)!;
  const setScreen = useGame((s) => s.setScreen);
  const signFA = useGame((s) => s.signFA);
  const capLeft = SALARY_CAP - payroll(userTeam(career).roster);

  return (
    <Shell title="Free Agents" onBack={() => setScreen("office")}>
      <p className="mb-3 font-ui text-xs text-muted">Cap room {capLeft}. Signing costs 1C.</p>
      <div className="flex flex-col gap-2">
        {career.fa
          .slice()
          .sort((a, b) => ovr(b) - ovr(a))
          .map((p) => (
            <Card key={p.id} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate font-ui text-sm">
                    {p.pos} {p.name}
                  </p>
                  <PlayerStars player={p} />
                </div>
                <p className="font-ui text-xs text-muted">
                  ${p.salary}M · {p.age}y · pot {p.potential}
                </p>
              </div>
              <PixelBtn
                variant="ghost"
                className="shrink-0 px-3"
                disabled={p.salary > capLeft}
                onClick={() => signFA(p.id)}
              >
                Sign
              </PixelBtn>
            </Card>
          ))}
      </div>
    </Shell>
  );
}

const TRAIN_H: { key: TrainStat; label: string }[] = [
  { key: "contact", label: "Hit" },
  { key: "power", label: "Pwr" },
  { key: "speed", label: "Spd" },
  { key: "eye", label: "Eye" },
  { key: "fielding", label: "Glv" },
];
const TRAIN_P: { key: TrainStat; label: string }[] = [
  { key: "stuff", label: "Stf" },
  { key: "control", label: "Ctl" },
  { key: "stamina", label: "Sta" },
];

export function Training() {
  const career = useGame((s) => s.career)!;
  const setScreen = useGame((s) => s.setScreen);
  const trainPlayer = useGame((s) => s.trainPlayer);
  const [sel, setSel] = useState<string | null>(null);
  const team = userTeam(career);
  const p = team.roster.find((x) => x.id === sel) ?? null;
  const stats = p ? (isPitcher(p.pos) ? TRAIN_P : TRAIN_H) : [];

  return (
    <Shell title="Training" onBack={() => setScreen("office")}>
      <p className="mb-3 font-ui text-xs text-muted">
        {career.credits} credits. {TRAIN_COST}C per tick. Caps at potential.
      </p>
      <div className="flex flex-col gap-2">
        {team.roster
          .slice()
          .sort((a, b) => ovr(b) - ovr(a))
          .map((h) => (
            <PlayerRow key={h.id} p={h} extra={`POT ${h.potential}`} onClick={() => setSel(h.id)} />
          ))}
      </div>
      {p ? (
        <div className="mt-4 border border-line bg-panel p-3">
          <p className="font-display text-[10px]">{p.name}</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {stats.map((s) => (
              <PixelBtn
                key={s.key}
                variant="ghost"
                disabled={career.credits < TRAIN_COST || p[s.key] >= Math.min(20, p.potential + 2)}
                onClick={() => trainPlayer(p.id, s.key)}
              >
                {s.label} {p[s.key]}
              </PixelBtn>
            ))}
          </div>
        </div>
      ) : null}
    </Shell>
  );
}

export function Press() {
  const career = useGame((s) => s.career)!;
  const answer = useGame((s) => s.answer);
  const setScreen = useGame((s) => s.setScreen);
  const q = career.pendingPress;
  if (!q) {
    return (
      <Shell title="Press" onBack={() => setScreen("office")}>
        <p className="font-ui text-sm text-muted">No cameras today. Enjoy the quiet.</p>
      </Shell>
    );
  }
  return (
    <Shell title="Presser">
      <p className="font-display text-[10px] leading-relaxed text-grass-2">MEDIA</p>
      <p className="mt-3 font-ui text-base leading-relaxed">{q.prompt}</p>
      <div className="mt-6 flex flex-col gap-3">
        <PixelBtn className="min-h-14 whitespace-normal py-3 leading-relaxed" onClick={() => answer("a")}>
          {q.a}
        </PixelBtn>
        <PixelBtn variant="ghost" className="min-h-14 whitespace-normal py-3 leading-relaxed" onClick={() => answer("b")}>
          {q.b}
        </PixelBtn>
      </div>
    </Shell>
  );
}

export function Stadium() {
  const career = useGame((s) => s.career)!;
  const setScreen = useGame((s) => s.setScreen);
  const upgradeStadium = useGame((s) => s.upgradeStadium);
  const cost = 6 + career.stadium * 4;
  const names = ["Sandlot", "Municipal", "Classic Park", "Jewel Box", "Cathedral"];
  return (
    <Shell title="The Park" onBack={() => setScreen("office")}>
      <Card>
        <p className="font-display text-[10px]">{names[career.stadium - 1] ?? "Park"}</p>
        <p className="mt-2 font-ui text-sm text-muted">Level {career.stadium} / 5. Fans {career.fans}.</p>
        <div className="mt-3">
          <Meter label="Park" value={career.stadium} max={5} />
        </div>
      </Card>
      <PixelBtn
        className="mt-4 w-full"
        disabled={career.stadium >= 5 || career.credits < cost}
        onClick={upgradeStadium}
      >
        {career.stadium >= 5 ? "Maxed" : `Upgrade · ${cost}C`}
      </PixelBtn>
    </Shell>
  );
}

export function Standings() {
  const career = useGame((s) => s.career)!;
  const setScreen = useGame((s) => s.setScreen);
  const table = standings(career);
  const userGames = career.schedule.filter(
    (g) => g.homeId === career.userTeamId || g.awayId === career.userTeamId,
  );
  return (
    <Shell title="League" onBack={() => setScreen("office")}>
      <div className="border border-line">
        {table.map((t, i) => (
          <div
            key={t.id}
            className={cn(
              "flex items-center gap-2 border-b border-line px-3 py-2 last:border-0",
              t.id === career.userTeamId && "bg-panel-2",
            )}
          >
            <span className="w-5 font-display text-[9px] text-muted">{i + 1}</span>
            <span className="flex-1 font-ui text-sm">
              {t.abbr} {t.name}
            </span>
            <span className="font-ui text-sm tabular-nums">
              {t.wins}-{t.losses}
            </span>
          </div>
        ))}
      </div>
      <p className="mb-2 mt-5 font-display text-[8px] text-grass-2">YOUR SLATE</p>
      <div className="flex flex-col gap-1">
        {userGames.map((g, i) => {
          const opp = teamById(career, g.homeId === career.userTeamId ? g.awayId : g.homeId);
          return (
            <div key={i} className="flex justify-between font-ui text-sm text-muted">
              <span>
                W{g.week} {g.homeId === career.userTeamId ? "vs" : "@"} {opp.abbr}
                {g.playoff ? ` · ${g.playoff}` : ""}
              </span>
              <span className="tabular-nums">
                {g.played ? `${g.homeScore}-${g.awayScore}` : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

export function Stats() {
  const career = useGame((s) => s.career)!;
  const setScreen = useGame((s) => s.setScreen);
  const team = userTeam(career);
  const bats = team.roster.filter((p) => !isPitcher(p.pos)).sort((a, b) => b.stats.hr - a.stats.hr);
  const arms = team.roster.filter((p) => isPitcher(p.pos));
  return (
    <Shell title="Stats" onBack={() => setScreen("office")}>
      <p className="mb-2 font-display text-[8px] text-grass-2">HISTORY</p>
      {career.history.length === 0 ? (
        <p className="font-ui text-sm text-muted">First year. No ghosts yet.</p>
      ) : (
        career.history.map((h) => (
          <p key={h.year} className="font-ui text-sm">
            {h.year} · {h.wins}-{h.losses} · {h.result}
          </p>
        ))
      )}
      <p className="mb-2 mt-5 font-display text-[8px] text-grass-2">BATS</p>
      {bats.slice(0, 9).map((p) => (
        <p key={p.id} className="flex justify-between font-ui text-sm">
          <span>{shortName(p.name)}</span>
          <span className="tabular-nums text-muted">
            {avg(p.stats)} · {p.stats.hr} HR · {p.stats.rbi} RBI
          </span>
        </p>
      ))}
      <p className="mb-2 mt-5 font-display text-[8px] text-grass-2">ARMS</p>
      {arms.map((p) => (
        <p key={p.id} className="flex justify-between font-ui text-sm">
          <span>{shortName(p.name)}</span>
          <span className="tabular-nums text-muted">ERA {era(p.stats)}</span>
        </p>
      ))}
    </Shell>
  );
}

export function PostGame() {
  const career = useGame((s) => s.career)!;
  const setScreen = useGame((s) => s.setScreen);
  const advanceWeek = useGame((s) => s.advanceWeek);
  const r = career.lastResult;
  const team = userTeam(career);
  if (!r) {
    return (
      <Shell title="Box" onBack={() => setScreen("office")}>
        <PixelBtn onClick={() => setScreen("office")}>Office</PixelBtn>
      </Shell>
    );
  }
  const userHome = r.homeId === team.id;
  const us = userHome ? r.homeScore : r.awayScore;
  const them = userHome ? r.awayScore : r.homeScore;
  const won = us > them;
  const opp = teamById(career, userHome ? r.awayId : r.homeId);
  return (
    <Shell
      title={won ? "WIN" : "LOSS"}
      footer={
        <PixelBtn className="w-full" onClick={advanceWeek}>
          Continue
        </PixelBtn>
      }
    >
      <div className="border border-line bg-panel p-4 text-center">
        <p className="font-display text-[10px] text-muted">{team.abbr} vs {opp.abbr}</p>
        <p className="mt-3 font-display text-[28px] text-cream">
          {us} - {them}
        </p>
        <p className={cn("mt-2 font-display text-[10px]", won ? "text-grass-2" : "text-danger")}>
          {won ? "BALLGAME" : "DROP"}
        </p>
      </div>
      <p className="mt-4 font-ui text-sm text-muted">
        Hits {userHome ? r.hitsH : r.hitsA}-{userHome ? r.hitsA : r.hitsH}. Record now {team.wins}-{team.losses}.
      </p>
      <div className="mt-4 space-y-1">
        {r.log.slice(0, 8).map((l, i) => (
          <p key={i} className="font-ui text-xs text-muted">
            {l}
          </p>
        ))}
      </div>
    </Shell>
  );
}

export function Offseason() {
  const career = useGame((s) => s.career)!;
  const setScreen = useGame((s) => s.setScreen);
  const draft = useGame((s) => s.draft);
  const finishOffseason = useGame((s) => s.finishOffseason);
  const last = career.history[0];
  return (
    <Shell
      title="Winter"
      footer={
        <PixelBtn className="w-full" disabled={career.draftPicks > 0} onClick={finishOffseason}>
          {career.draftPicks > 0 ? `${career.draftPicks} picks left` : "Open camp"}
        </PixelBtn>
      }
    >
      {last ? (
        <p className="mb-4 font-ui text-sm text-muted">
          {last.year} closed {last.wins}-{last.losses}. {last.result}.
        </p>
      ) : null}
      <p className="mb-2 font-display text-[8px] text-grass-2">DRAFT BOARD</p>
      <div className="flex flex-col gap-2">
        {career.draftPool.slice(0, 12).map((p) => (
          <Card key={p.id} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-ui text-sm">
                {p.pos} {p.name}
              </p>
              <p className="font-ui text-xs text-muted">
                {p.age}y · pot {p.potential} · ovr {ovr(p)}
              </p>
            </div>
            <PixelBtn
              variant="ghost"
              disabled={career.draftPicks <= 0}
              onClick={() => draft(p.id)}
            >
              Pick
            </PixelBtn>
          </Card>
        ))}
      </div>
      <PixelBtn variant="ghost" className="mt-4 w-full" onClick={() => setScreen("free-agents")}>
        Free agents
      </PixelBtn>
    </Shell>
  );
}

export function Settings() {
  const settings = useGame((s) => s.settings);
  const patchSettings = useGame((s) => s.patchSettings);
  const resetSave = useGame((s) => s.resetSave);
  const setScreen = useGame((s) => s.setScreen);
  const career = useGame((s) => s.career);
  return (
    <Shell title="Settings" onBack={() => setScreen(career ? "office" : "title")}>
      <label className="flex items-center justify-between border border-line bg-panel px-3 py-3">
        <span className="font-ui text-sm">Sound</span>
        <input
          type="checkbox"
          checked={settings.sfx}
          onChange={(e) => patchSettings({ sfx: e.target.checked })}
        />
      </label>
      <label className="mt-2 flex items-center justify-between border border-line bg-panel px-3 py-3">
        <span className="font-ui text-sm">Music</span>
        <input
          type="checkbox"
          checked={settings.music}
          onChange={(e) => patchSettings({ music: e.target.checked })}
        />
      </label>
      <label className="mt-2 flex items-center justify-between border border-line bg-panel px-3 py-3">
        <span className="font-ui text-sm">Screen shake</span>
        <input
          type="checkbox"
          checked={settings.shake}
          onChange={(e) => patchSettings({ shake: e.target.checked })}
        />
      </label>
      <p className="mt-6 font-ui text-xs leading-relaxed text-muted">
        One pitch per at-bat. Tap Contact when the meter hits green. Power is a tighter window with more lift. Space
        is Contact, K is Power. Defense plays itself — Skip to hurry it.
      </p>
      <PixelBtn variant="danger" className="mt-6 w-full" onClick={resetSave}>
        Erase career
      </PixelBtn>
    </Shell>
  );
}
