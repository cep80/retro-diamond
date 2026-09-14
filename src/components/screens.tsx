import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Dumbbell, Settings2, Sparkles, Trophy, UsersRound } from "lucide-react";
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
import { nextUserSlot, continueLabel, sessionHook, standings, teamById, userTeam } from "@/game/sim";
import { tradeOffers } from "@/game/roster";
import { useGame, type TrainStat, FACILITY_COSTS, COACH_COSTS, effectiveTrainCost } from "@/game/store";
import { extensionCost } from "@/game/economy";
import { handLabel } from "@/game/look";
import { parkById, parkForTeam, parkLabel } from "@/game/parks";
import { careerLine, legacySummary, RETIRE_AFTER_SEASONS, retireEligible } from "@/game/career";
import { ownerMood } from "@/game/economy";
import type { Difficulty, Player } from "@/game/types";
import { Card, Meter, PixelBtn, PlayerStars, RatingRow, Shell } from "./chrome";
import { sfxBlip, sfxSelect, startMusic, stopMusic, unlockAudio } from "@/game/audio";
import { cn } from "@/lib/utils";
import { spotlightForPlayer, spotlightPlayers } from "@/game/presentation";
import { PlayerAvatar } from "./PlayerAvatar";

function OfficeMusic() {
  const music = useGame((s) => s.settings.music);
  useEffect(() => {
    if (!music) return;
    unlockAudio();
    startMusic();
    return () => stopMusic();
  }, [music]);
  return null;
}

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
        src="/bg/diamond-rise-hero.png"
        alt=""
        className="absolute inset-0 size-full object-cover object-[62%_center]"
        crossOrigin="anonymous"
      />
      <div className="title-wash absolute inset-0" />
      <div className="title-halftone absolute inset-0" />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-end px-6 pb-8 pt-14 sm:px-10 sm:pb-12 lg:justify-center">
        <p className="episode-chip w-fit">Skyline League · 1989</p>
        <h1 className="anime-logo mt-6 max-w-2xl">
          <span>Retro</span>
          <strong>Diamond</strong>
        </h1>
        <p className="mt-6 max-w-md font-ui text-base font-medium leading-relaxed text-cream/90 sm:text-lg">
          Build the club. Trust your stars. Chase one unforgettable summer crown.
        </p>
        <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
          <PixelBtn
            className="h-14 justify-between px-5 text-sm"
            onClick={() => {
              unlockAudio();
              sfxSelect();
              stopMusic();
              setScreen("teams");
            }}
          >
            <span className="inline-flex items-center gap-2"><Sparkles className="size-4" aria-hidden="true" /> Begin a New Story</span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </PixelBtn>
          {career ? (
            <PixelBtn
              variant="ghost"
              className="h-auto min-h-14 justify-between px-5 py-3 leading-tight"
              onClick={() => {
                unlockAudio();
                sfxSelect();
                continueGame();
              }}
            >
              <span className="flex flex-col items-start gap-1">
                <span>Continue Season</span>
                <span className="font-ui text-xs font-normal normal-case tracking-normal text-muted">
                  {continueLabel(career).replace(/^Continue — /, "")}
                </span>
              </span>
              <ArrowRight className="size-4" aria-hidden="true" />
            </PixelBtn>
          ) : null}
          <PixelBtn
            variant="ghost"
            className="justify-start px-5"
            onClick={() => {
              unlockAudio();
              startMusic();
              setScreen("settings");
            }}
          >
            <Settings2 className="size-4" aria-hidden="true" /> Settings
          </PixelBtn>
        </div>
        <p className="mt-5 font-ui text-xs font-medium uppercase tracking-[0.18em] text-cream/60">
          Character-driven club drama · Real baseball decisions
        </p>
      </div>
    </div>
  );
}

export function TeamSelect() {
  const newGame = useGame((s) => s.newGame);
  const setScreen = useGame((s) => s.setScreen);
  const [picked, setPicked] = useState(TEAMS[0]!.id);
  const [coach, setCoach] = useState("COACH");
  const [difficulty, setDifficulty] = useState<Difficulty>("pro");
  const team = TEAMS.find((t) => t.id === picked)!;
  const diffOptions: { id: Difficulty; label: string; hint: string }[] = [
    { id: "rookie", label: "Rookie", hint: "Wider timing, softer arms" },
    { id: "pro", label: "Pro", hint: "Standard league" },
    { id: "legend", label: "Legend", hint: "Tight windows, tax bite" },
  ];

  return (
    <Shell title="Select Club" onBack={() => setScreen("title")} bg="/bg/teams.jpg">
      <label className="mb-4 block">
        <span className="mb-2 block font-display text-[8px] text-muted">COACH NAME</span>
        <input
          value={coach}
          maxLength={14}
          onChange={(e) => setCoach(e.target.value.toUpperCase())}
          className="h-11 w-full border border-line bg-panel px-3 font-ui text-base uppercase text-cream outline-none focus:border-grass-2"
        />
      </label>
      <p className="mb-2 font-display text-[8px] text-muted">DIFFICULTY</p>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {diffOptions.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => {
              sfxBlip();
              setDifficulty(d.id);
            }}
            className={cn(
              "border px-2 py-2 text-left",
              difficulty === d.id ? "border-grass-2 bg-panel-2" : "border-line bg-panel",
            )}
          >
            <span className="block font-display text-[8px] text-cream">{d.label}</span>
            <span className="mt-1 block font-ui text-[9px] leading-snug text-muted">{d.hint}</span>
          </button>
        ))}
      </div>
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
            <span className="mt-1 flex items-center gap-1">
              <span className="h-2 w-3 border border-line bg-[#e8eadf]" title="Home" />
              <span className="h-2 w-3" style={{ background: t.color2 }} title="Away" />
            </span>
            <span className="mt-1 block font-ui text-[10px] text-muted">
              {parkById(t.parkId).name} · {parkLabel(parkById(t.parkId))}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-6">
        <PixelBtn
          className="h-12 w-full"
          onClick={() => {
            sfxSelect();
            newGame(picked, coach, difficulty);
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
  const settings = useGame((s) => s.settings);
  const patchSettings = useGame((s) => s.patchSettings);
  const setScreen = useGame((s) => s.setScreen);
  const startPlay = useGame((s) => s.startPlay);
  const simUserGame = useGame((s) => s.simUserGame);
  const quitLiveGame = useGame((s) => s.quitLiveGame);
  const advanceWeek = useGame((s) => s.advanceWeek);
  const resetSave = useGame((s) => s.resetSave);
  const rehiredByClub = useGame((s) => s.rehiredByClub);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const team = userTeam(career);
  const slot = nextUserSlot(career);
  const opp = slot ? teamById(career, slot.homeId === team.id ? slot.awayId : slot.homeId) : null;
  const home = slot ? slot.homeId === team.id : true;
  const fired = career.owner <= 10 && (career.history.length >= 1 || team.wins + team.losses >= 8);
  const spotlights = spotlightPlayers(team);
  const captain = spotlights.find((spotlight) => spotlight.role === "captain") ?? spotlights[0];

  if (fired) {
    return (
      <Shell title="Owner's Box">
        <p className="font-display text-[12px] leading-relaxed text-danger">YOU&apos;RE FIRED</p>
        <p className="mt-3 font-ui text-sm text-muted">
          The owner had seen enough. A smaller market might still want your number.
        </p>
        <PixelBtn className="mt-6 w-full" onClick={() => rehiredByClub()}>
          Take a new job
        </PixelBtn>
        <PixelBtn variant="ghost" className="mt-3 w-full" onClick={() => resetSave()}>
          Leave baseball
        </PixelBtn>
      </Shell>
    );
  }

  const mainLinks = [
    { id: "roster" as const, label: "Team", hint: "Roster & contracts", icon: UsersRound },
    { id: "training" as const, label: "Develop", hint: "Raise your stars", icon: Dumbbell },
    { id: "standings" as const, label: "League", hint: "The crown race", icon: Trophy },
    { id: "schedule" as const, label: "Season", hint: "Your next chapters", icon: CalendarDays },
  ];
  const links: { id: Parameters<typeof setScreen>[0]; label: string }[] = [
    { id: "lineup", label: "Lineup" },
    { id: "bullpen", label: "Pitching" },
    { id: "free-agents", label: "Sign" },
    { id: "trade", label: "Trade" },
    { id: "stadium", label: "Park" },
    { id: "stats", label: "Stats" },
    ...(career.phase === "playoffs" || career.week >= 17 ? [{ id: "bracket" as const, label: "Bracket" }] : []),
    { id: "records", label: "Records" },
    { id: "achievements", label: "Achievements" },
    ...(career.phase === "offseason" ? [{ id: "scout" as const, label: "Scout" }] : []),
    { id: "account", label: "Account" },
  ];

  const showOnboarding =
    career.year === 1989 &&
    career.week === 1 &&
    !settings.skipOnboarding &&
    !settings.onboardingOfficeDone;

  return (
    <div
      className="app-shell relative mx-auto min-h-dvh max-w-xl overflow-hidden bg-ink text-cream"
      style={{ ["--team-primary" as string]: team.color, ["--team-accent" as string]: team.color2 }}
    >
      <img
        src="/bg/office.jpg"
        alt=""
        className="absolute inset-0 size-full object-cover opacity-25"
        crossOrigin="anonymous"
      />
      <div className="absolute inset-0 bg-ink/82" />
      <OfficeMusic />
      <div className="relative z-10 flex min-h-dvh flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-5">
        <span className="mb-3 block h-1.5 w-20 -skew-x-12 rounded-full bg-grass-2" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-grass-2">
              Episode {String(career.week).padStart(2, "0")} · {weekLabel(career.week, career.phase)}
            </p>
            <h1 className="mt-1 font-display text-xl font-bold leading-tight tracking-tight">
              {team.city} {team.name}
            </h1>
            <p className="mt-1 font-ui text-sm font-medium text-muted">
              {team.wins}-{team.losses} · {career.coachName}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setScreen("settings")}
            className="flex size-11 items-center justify-center rounded-xl border border-line bg-panel/90 text-muted transition hover:border-grass-2 hover:text-cream"
            aria-label="Settings"
          >
            <Settings2 className="size-5" aria-hidden="true" />
          </button>
        </div>

        <Card className="match-card relative mt-5 min-h-64 overflow-hidden border-grass-2/50 p-5 pr-[38%]">
          {captain ? (
            <img
              src={captain.portrait}
              alt=""
              className="character-cutout pointer-events-none absolute -bottom-16 -right-24 z-0 h-[22rem] w-[19rem] max-w-none object-contain object-bottom opacity-95"
              crossOrigin="anonymous"
            />
          ) : null}
          <div className="relative z-10">
          {career.phase === "offseason" ? (
            <>
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-coral">Next chapter</p>
              <p className="mt-2 font-display text-lg font-bold leading-tight">Build the new roster</p>
              <p className="mt-2 font-ui text-sm text-muted">Draft, sign, then open camp.</p>
              <PixelBtn className="mt-3 w-full" onClick={() => setScreen("offseason")}>
                Offseason
              </PixelBtn>
            </>
          ) : career.live ? (
            <>
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-coral">Live episode</p>
              <p className="mt-2 font-display text-lg font-bold leading-tight">Game in progress</p>
              <p className="mt-2 font-ui text-sm text-muted">
                {career.live.scoreA} - {career.live.scoreH} · {career.live.half === "top" ? "TOP" : "BOT"} {career.live.inning}
              </p>
              {confirmQuit ? (
                <div className="mt-3 border border-danger bg-ink-2 p-3">
                  <p className="font-ui text-sm text-cream">Quit this game? Nothing from it will count.</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <PixelBtn variant="ghost" onClick={() => setConfirmQuit(false)}>
                      Keep playing
                    </PixelBtn>
                    <PixelBtn variant="danger" onClick={quitLiveGame}>
                      Quit game
                    </PixelBtn>
                  </div>
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <PixelBtn onClick={() => setScreen("play")}>Resume</PixelBtn>
                  <PixelBtn variant="danger" onClick={() => setConfirmQuit(true)}>
                    Quit game
                  </PixelBtn>
                </div>
              )}
            </>
          ) : slot && opp ? (
            <>
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-coral">
                Next match · {home ? "Home" : "Road"}
              </p>
              <p className="mt-3 font-display text-lg font-bold leading-tight">
                vs {opp.city} {opp.name}
              </p>
              <p className="mt-2 font-ui text-sm text-muted">
                {opp.wins}-{opp.losses} · prestige {opp.prestige}
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <PixelBtn className="h-14 text-sm" onClick={startPlay}>
                  Take the Field <ArrowRight className="size-4" aria-hidden="true" />
                </PixelBtn>
                <PixelBtn variant="ghost" className="min-h-10 px-2 text-[10px]" onClick={simUserGame}>
                  Sim Match
                </PixelBtn>
              </div>
              {ownerMood(career.owner) === "hot-seat" || ownerMood(career.owner) === "fired" ? (
                <p className="mt-2 font-ui text-xs text-danger">
                  Owner is counting losses. Finish the year under 25 and he takes a draft pick.
                </p>
              ) : ownerMood(career.owner) === "backed" ? (
                <p className="mt-2 font-ui text-xs text-grass-2">Owner is all in. Hold 75+ to year end for a bonus.</p>
              ) : career.owner < 40 ? (
                <p className="mt-2 font-ui text-xs text-muted">Owner confidence wobbling — wins matter.</p>
              ) : null}
            </>
          ) : (
            <>
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-coral">Between games</p>
              <p className="mt-2 font-display text-lg font-bold leading-tight">The clubhouse is quiet</p>
              <p className="mt-2 font-ui text-sm text-muted">No game on the slate. Advance the week.</p>
              <PixelBtn className="mt-3 w-full" onClick={advanceWeek}>
                Advance
              </PixelBtn>
            </>
          )}
          </div>
        </Card>

        {career.pendingPress ? (
          <PixelBtn variant="cream" className="mt-3 w-full" onClick={() => setScreen("press")}>
            Press waiting
          </PixelBtn>
        ) : null}

        {showOnboarding ? (
          <Card className="mt-3 border-grass-2">
            <p className="font-display text-[8px] text-grass-2">WELCOME TO THE OFFICE</p>
            <p className="mt-2 font-ui text-sm leading-relaxed text-muted">
              Set your lineup, pick your starter, then hit Play when the slate shows a game. The owner watches the
              standings. You watch the meter.
            </p>
            <PixelBtn
              variant="ghost"
              className="mt-3 w-full"
              onClick={() => patchSettings({ onboardingOfficeDone: true })}
            >
              Got it
            </PixelBtn>
          </Card>
        ) : null}

        <div className="mt-6 flex items-end justify-between gap-3">
          <div>
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-grass-2">Club Spotlight</p>
            <p className="mt-1 font-ui text-sm text-muted">The faces carrying this season.</p>
          </div>
          <span className="font-display text-[10px] font-bold text-coral">02 STARS</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {spotlights.map((spotlight) => (
            <div key={spotlight.role} className="spotlight-card min-h-40 rounded-2xl border border-line p-3">
              <img
                src={spotlight.portrait}
                alt=""
                className="character-cutout pointer-events-none absolute -bottom-10 -right-12 h-44 w-40 max-w-none object-contain object-bottom opacity-80"
                crossOrigin="anonymous"
              />
              <div className="relative z-10 max-w-[70%]">
                <p className="font-display text-[9px] font-bold uppercase tracking-[0.12em] text-coral">{spotlight.label}</p>
                <p className="mt-2 font-display text-sm font-bold leading-tight">{shortName(spotlight.player.name)}</p>
                <p className="mt-2 font-ui text-xs font-medium text-muted">
                  {spotlight.player.pos} · OVR {ovr(spotlight.player)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="mb-3 mt-6 font-display text-[10px] font-bold uppercase tracking-[0.16em] text-grass-2">Clubhouse</p>
        <div className="grid grid-cols-2 gap-3">
          {mainLinks.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => {
                  sfxBlip();
                  setScreen(link.id);
                }}
                className="club-nav-tile p-4"
              >
                <Icon className="size-5 text-coral" strokeWidth={2.2} aria-hidden="true" />
                <span className="mt-3 block font-display text-sm font-bold uppercase tracking-wide text-cream">{link.label}</span>
                <span className="mt-1 block font-ui text-xs font-medium text-muted">{link.hint}</span>
              </button>
            );
          })}
        </div>

        <p className="mb-3 mt-6 font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted">More</p>
        <div className="grid grid-cols-3 gap-2">
          {links.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                sfxBlip();
                setScreen(l.id);
              }}
              className="flex min-h-12 items-center justify-center rounded-xl border border-line bg-panel/90 px-2 text-center font-display text-[10px] font-bold uppercase leading-tight tracking-wide text-cream transition hover:border-grass-2 hover:bg-panel-2"
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

        {career.news.length ? (
          <div className="mt-3 space-y-1.5 border-t border-line pt-3">
            {career.news.slice(0, 4).map((n) => (
              <p key={n.id} className="font-ui text-xs leading-relaxed text-muted">
                {n.text}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SpriteThumb({ p, stripe }: { p: Player; stripe?: string }) {
  const arm = isPitcher(p.pos);
  const flip = arm ? p.throws === "L" : p.bats === "L";
  return (
    <div className="relative size-10 shrink-0 overflow-hidden bg-ink">
      {stripe ? (
        <span className="absolute inset-x-0 top-0 z-10 h-1" style={{ background: stripe }} />
      ) : null}
      <img
        src={arm ? "/sprites/pitcher.png" : "/sprites/batter-idle.png"}
        alt=""
        className="pointer-events-none absolute -left-[6%] -top-[10%] h-[200%] w-[200%] max-w-none"
        style={{
          imageRendering: "pixelated",
          transform: flip ? "scaleX(-1)" : undefined,
        }}
      />
      <span className="absolute bottom-0 left-0 z-10 bg-ink/75 px-0.5 font-display text-[7px] text-grass-2">
        {p.pos}
      </span>
    </div>
  );
}

function PlayerRow({
  p,
  onClick,
  extra,
  jersey,
}: {
  p: Player;
  onClick?: () => void;
  extra?: string;
  jersey?: string;
}) {
  return (
    <Card onClick={onClick} className="flex items-center gap-3">
      <SpriteThumb p={p} stripe={jersey} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-ui text-sm font-medium">{p.name}</p>
          <PlayerStars player={p} />
        </div>
        <p className="font-ui text-xs text-muted">
          {handLabel(p)} · {p.age}y · ${p.salary}M · {p.years}yr
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
  const extendPlayer = useGame((s) => s.extendPlayer);
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
          <PlayerRow key={h.id} p={h} jersey={team.color2} extra={avg(h.stats)} onClick={() => setSel(h.id)} />
        ))}
      </div>
      <p className="mb-2 mt-5 font-display text-[8px] text-grass-2">ARMS</p>
      <div className="flex flex-col gap-2">
        {arms.map((h) => (
          <PlayerRow key={h.id} p={h} jersey={team.color2} extra={era(h.stats)} onClick={() => setSel(h.id)} />
        ))}
      </div>
      {p ? (
        <div className="mt-4 border border-grass-2 bg-panel p-3">
          <p className="font-display text-[10px]">{p.name}</p>
          <p className="mt-1 font-ui text-xs text-muted">
            {p.pos} · {handLabel(p)} · Bats {p.bats} · Throws {p.throws} · OVR {ovr(p)} · POT {p.potential} ·
            Morale {Math.round(p.morale)}
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
          {p.years === 1 ? (
            <PixelBtn
              variant="cream"
              className="mt-3 w-full"
              onClick={() => extendPlayer(p.id)}
            >
              Extend · {extensionCost(ovr(p))}C
            </PixelBtn>
          ) : null}
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
              {p ? <SpriteThumb p={p} stripe={team.color2} /> : <span className="w-8 font-display text-[9px] text-grass-2">--</span>}
              <span className={cn("flex-1 font-ui text-sm", !p && "text-danger")}>{p?.name ?? "Empty — fill this"}</span>
              {p ? <span className="font-display text-[8px] text-muted">{handLabel(p)}</span> : null}
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
              <PlayerRow key={p.id} p={p} jersey={team.color2} extra={avg(p.stats)} onClick={() => setLineupSlot(slot, p.id)} />
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
              {p ? <SpriteThumb p={p} stripe={team.color2} /> : null}
              <span className={cn("flex-1 font-ui text-sm", !p && "text-danger")}>{p?.name ?? "Empty — fill this"}</span>
              {p ? <span className="font-display text-[8px] text-muted">{handLabel(p)}</span> : null}
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
              jersey={team.color2}
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
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate font-ui text-sm">
                    {p.pos} {p.name}
                  </p>
                  <span className="shrink-0 font-display text-[8px] text-grass-2">{handLabel(p)}</span>
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
        {career.credits} credits. {effectiveTrainCost(career)}C per tick. Caps at potential. Glove tightens team defense; Eye reads
        pitches sooner.
      </p>
      <div className="flex flex-col gap-2">
        {team.roster
          .slice()
          .sort((a, b) => ovr(b) - ovr(a))
          .map((h) => (
            <PlayerRow key={h.id} p={h} jersey={team.color2} extra={`POT ${h.potential}`} onClick={() => setSel(h.id)} />
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
                disabled={career.credits < effectiveTrainCost(career) || p[s.key] >= Math.min(20, p.potential + 2)}
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
  const buyFacility = useGame((s) => s.buyFacility);
  const hireCoach = useGame((s) => s.hireCoach);
  const team = userTeam(career);
  const owned = new Set(career.facilities ?? []);
  const park = parkForTeam(team);
  const cost = 6 + career.stadium * 4;
  const names = ["Sandlot", "Municipal", "Classic Park", "Jewel Box", "Cathedral"];
  return (
    <Shell title="The Park" onBack={() => setScreen("office")} bg={park.bg}>
      <Card>
        <img
          src={park.bg}
          alt=""
          className="mb-3 h-36 w-full border border-line object-cover"
          crossOrigin="anonymous"
        />
        <p className="font-display text-[10px]">{park.name}</p>
        <p className="mt-1 font-ui text-[10px] text-grass-2">
          {parkLabel(park)} park · HR {park.hr.toFixed(2)} · 2B {park.doubles.toFixed(2)}
        </p>
        <p className="mt-2 font-ui text-sm text-muted">
          {team.city} {team.name} · {park.blurb}
        </p>
        <p className="mt-2 font-ui text-xs leading-relaxed text-muted">
          This yard changes the ball. Seats pay the bills: every level past the sandlot adds a credit to each home
          game, a full house (fans 70+) adds another, and a bigger park holds the crowd through a losing week.
          Level {career.stadium} / 5. Fans {career.fans}.
        </p>
        <div className="mt-3">
          <Meter label={names[career.stadium - 1] ?? "Park"} value={career.stadium} max={5} />
        </div>
      </Card>
      <PixelBtn
        className="mt-4 w-full"
        disabled={career.stadium >= 5 || career.credits < cost}
        onClick={upgradeStadium}
      >
        {career.stadium >= 5 ? "Maxed" : `Upgrade · ${cost}C`}
      </PixelBtn>
      <p className="mb-2 mt-6 font-display text-[8px] text-grass-2">FACILITIES</p>
      <div className="flex flex-col gap-2">
        {Object.entries(FACILITY_COSTS).map(([id, fc]) => (
          <PixelBtn
            key={id}
            variant="ghost"
            className="h-auto min-h-11 justify-between px-3 text-[10px]"
            disabled={owned.has(id) || career.credits < fc}
            onClick={() => buyFacility(id)}
          >
            <span>{id}</span>
            <span>{owned.has(id) ? "Built" : `${fc}C`}</span>
          </PixelBtn>
        ))}
      </div>
      <p className="mb-2 mt-5 font-display text-[8px] text-grass-2">COACHING</p>
      <div className="flex flex-col gap-2">
        {Object.entries(COACH_COSTS).map(([role, cc]) => {
          const hired = career.coaches?.some((c) => c.role === role);
          return (
            <PixelBtn
              key={role}
              variant="ghost"
              className="h-auto min-h-11 justify-between px-3 text-[10px]"
              disabled={hired || career.credits < cc}
              onClick={() => hireCoach(role)}
            >
              <span>{role}</span>
              <span>{hired ? "Hired" : `${cc}C`}</span>
            </PixelBtn>
          );
        })}
      </div>
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
          <span className="tabular-nums text-muted">
            {p.stats.w}-{p.stats.l} · {p.stats.sv} SV · ERA {era(p.stats)}
          </span>
        </p>
      ))}
      {team.roster.some((p) => (p.seasons ?? 0) > 0) ? (
        <>
          <p className="mb-2 mt-5 font-display text-[8px] text-grass-2">CAREER · CLUB LEADERS</p>
          {bats
            .map((p) => ({ p, c: careerLine(p) }))
            .sort((a, b) => b.c.hr - a.c.hr)
            .slice(0, 5)
            .map(({ p, c }) => (
              <p key={p.id} className="flex justify-between font-ui text-sm">
                <span>
                  {shortName(p.name)} <span className="text-xs text-muted">{(p.seasons ?? 0) + 1}y</span>
                </span>
                <span className="tabular-nums text-muted">
                  {avg(c)} · {c.hr} HR · {c.rbi} RBI
                </span>
              </p>
            ))}
          {arms
            .map((p) => ({ p, c: careerLine(p) }))
            .sort((a, b) => b.c.w + b.c.sv - (a.c.w + a.c.sv))
            .slice(0, 3)
            .map(({ p, c }) => (
              <p key={p.id} className="flex justify-between font-ui text-sm">
                <span>{shortName(p.name)}</span>
                <span className="tabular-nums text-muted">
                  {c.w}-{c.l} · {c.sv} SV · ERA {era(c)}
                </span>
              </p>
            ))}
        </>
      ) : null}
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
        <div className="grid grid-cols-3 gap-2">
          <PixelBtn variant="ghost" onClick={() => setScreen("office")}>
            Office
          </PixelBtn>
          <PixelBtn className="col-span-2" onClick={advanceWeek}>
            Next Week
          </PixelBtn>
        </div>
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
      {r.income ? (
        <p className="mt-1 font-ui text-sm text-grass-2">
          +{r.income.total}C
          <span className="ml-2 text-xs text-muted">
            {r.income.base} result{r.income.live ? ` · ${r.income.live} played it` : ""}
            {r.income.gate ? ` · ${r.income.gate} gate` : ""}
          </span>
        </p>
      ) : null}
      <p className="mt-2 font-ui text-sm text-cream">{sessionHook(career)}</p>
      {r.box && r.box.length > 0 ? (
        <>
          <p className="mb-2 mt-5 font-display text-[8px] text-grass-2">BOX</p>
          {r.box.slice(0, 10).map((line) => (
            <p key={line.playerId} className="flex justify-between gap-3 font-ui text-sm">
              <span className="truncate">
                {line.pos} {shortName(line.name)}
              </span>
              <span className="shrink-0 tabular-nums text-muted">{line.line}</span>
            </p>
          ))}
        </>
      ) : null}
      {r.weekScores && r.weekScores.length > 1 ? (
        <>
          <p className="mb-2 mt-5 font-display text-[8px] text-grass-2">AROUND THE LEAGUE</p>
          {r.weekScores.map((g, i) => (
            <p
              key={i}
              className={cn("flex justify-between font-ui text-sm", g.user ? "text-cream" : "text-muted")}
            >
              <span>
                {g.awayAbbr} @ {g.homeAbbr}
              </span>
              <span className="tabular-nums">
                {g.awayScore}-{g.homeScore}
              </span>
            </p>
          ))}
        </>
      ) : null}
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

export function Trade() {
  const career = useGame((s) => s.career)!;
  const setScreen = useGame((s) => s.setScreen);
  const trade = useGame((s) => s.trade);
  const team = userTeam(career);
  const [mine, setMine] = useState<string | null>(null);
  const offers = mine ? tradeOffers(career, mine) : [];
  const selected = team.roster.find((p) => p.id === mine) ?? null;

  return (
    <Shell title="Trade" onBack={() => setScreen("office")}>
      <p className="mb-3 font-ui text-xs text-muted">
        Send a bat for a bat, or an arm for an arm. They won&apos;t eat a star for scraps.
      </p>
      <p className="mb-2 font-display text-[8px] text-grass-2">YOUR CLUB</p>
      <div className="flex flex-col gap-2">
        {team.roster
          .slice()
          .sort((a, b) => ovr(b) - ovr(a))
          .map((p) => (
            <PlayerRow
              key={p.id}
              p={p}
              jersey={team.color2}
              extra={isPitcher(p.pos) ? era(p.stats) : avg(p.stats)}
              onClick={() => setMine(p.id)}
            />
          ))}
      </div>
      {selected ? (
        <div className="mt-5">
          <p className="mb-2 font-display text-[8px] text-grass-2">
            OFFERS FOR {selected.name.split(" ").pop()?.toUpperCase()}
          </p>
          {offers.length === 0 ? (
            <p className="font-ui text-sm text-muted">Nobody&apos;s calling. Try a different name.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {offers.map((o) => (
                <Card key={o.player.id} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-ui text-sm">
                      {o.teamAbbr} · {o.player.pos} {o.player.name} {handLabel(o.player)}
                    </p>
                    <p className="font-ui text-xs text-muted">
                      ${o.player.salary}M · ovr {ovr(o.player)} · {o.player.age}y
                    </p>
                  </div>
                  <PixelBtn
                    variant="ghost"
                    className="shrink-0 px-3"
                    onClick={() => trade(selected.id, o.player.id)}
                  >
                    Deal
                  </PixelBtn>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </Shell>
  );
}

export function Offseason() {
  const career = useGame((s) => s.career)!;
  const setScreen = useGame((s) => s.setScreen);
  const draft = useGame((s) => s.draft);
  const scoutPick = useGame((s) => s.scoutPick);
  const finishOffseason = useGame((s) => s.finishOffseason);
  const retire = useGame((s) => s.retire);
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
        <p className="mb-2 font-ui text-sm text-muted">
          {last.year} closed {last.wins}-{last.losses}. {last.result}.
        </p>
      ) : null}
      {last?.awards ? (
        <Card className="mb-4">
          <p className="font-display text-[8px] text-grass-2">HARDWARE</p>
          {last.awards.mvp ? (
            <p className="mt-2 font-ui text-sm">
              MVP · {last.awards.mvp.teamAbbr} {shortName(last.awards.mvp.name)}
              <span className="ml-2 text-xs text-muted">{last.awards.mvp.line}</span>
            </p>
          ) : null}
          {last.awards.arm ? (
            <p className="mt-1 font-ui text-sm">
              Arm of the Year · {last.awards.arm.teamAbbr} {shortName(last.awards.arm.name)}
              <span className="ml-2 text-xs text-muted">{last.awards.arm.line}</span>
            </p>
          ) : null}
          {last.awards.clubBat ? (
            <p className="mt-1 font-ui text-sm text-grass-2">
              Club bat · {shortName(last.awards.clubBat.name)}
              <span className="ml-2 text-xs text-muted">{last.awards.clubBat.line}</span>
            </p>
          ) : null}
        </Card>
      ) : null}
      <p className="mb-2 font-display text-[8px] text-grass-2">DRAFT BOARD</p>
      <div className="flex flex-col gap-2">
        {career.draftPool.slice(0, 12).map((p) => (
          <Card key={p.id} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-ui text-sm">
                {p.pos} {p.name}{" "}
                <span className="font-display text-[8px] text-grass-2">{handLabel(p)}</span>
              </p>
              <p className="font-ui text-xs text-muted">
                {p.age}y · pot {p.scoutedPotential ?? "?"} · ovr {ovr(p)}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              <PixelBtn variant="ghost" className="px-2 text-[8px]" onClick={() => scoutPick(p.id, 2)}>
                Scout 1C
              </PixelBtn>
              <PixelBtn
                variant="ghost"
                disabled={career.draftPicks <= 0}
                onClick={() => draft(p.id)}
              >
                Pick
              </PixelBtn>
            </div>
          </Card>
        ))}
      </div>
      <PixelBtn variant="ghost" className="mt-4 w-full" onClick={() => setScreen("free-agents")}>
        Free agents
      </PixelBtn>
      {retireEligible(career) ? (
        <PixelBtn variant="danger" className="mt-3 w-full" onClick={retire}>
          Hang it up · see your legacy
        </PixelBtn>
      ) : (
        <p className="mt-3 text-center font-ui text-xs text-muted">
          Retirement opens after {RETIRE_AFTER_SEASONS} full seasons.
        </p>
      )}
    </Shell>
  );
}

export function Legacy() {
  const career = useGame((s) => s.career)!;
  const resetSave = useGame((s) => s.resetSave);
  const unretire = useGame((s) => s.unretire);
  const team = userTeam(career);
  const L = legacySummary(career);
  const park = parkForTeam(team);
  return (
    <Shell title="Legacy" bg={park.bg}>
      <div className="border border-line bg-panel p-4 text-center">
        <p className="font-display text-[8px] text-muted">
          {team.city} {team.name}
        </p>
        <p className="mt-2 font-display text-[16px] leading-relaxed text-cream">{career.coachName}</p>
        <p className="mt-3 font-display text-[22px] text-grass-2">{L.grade.toUpperCase()}</p>
        <p className="mt-2 font-ui text-sm text-muted">{L.epitaph}</p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          ["Seasons", String(L.seasons)],
          ["Record", `${L.wins}-${L.losses}`],
          ["Rings", String(L.rings)],
          ["Octobers", String(L.playoffs)],
          ["MVPs here", String(L.mvpsOnClub)],
          ["Best year", L.best ? `${L.best.wins}-${L.best.losses}` : "—"],
        ].map(([k, v]) => (
          <Card key={k} className="py-3">
            <p className="font-display text-[7px] text-muted">{k.toUpperCase()}</p>
            <p className="mt-1 font-display text-[12px]">{v}</p>
          </Card>
        ))}
      </div>
      <p className="mb-2 mt-5 font-display text-[8px] text-grass-2">SEASONS</p>
      {career.history.map((h) => (
        <p key={h.year} className="flex justify-between font-ui text-sm">
          <span>{h.year}</span>
          <span className="tabular-nums text-muted">
            {h.wins}-{h.losses} · {h.result}
          </span>
        </p>
      ))}
      <div className="mt-6 flex flex-col gap-2">
        <PixelBtn variant="ghost" onClick={unretire}>
          One more year
        </PixelBtn>
        <PixelBtn variant="danger" onClick={() => resetSave()}>
          Leave town for good
        </PixelBtn>
      </div>
    </Shell>
  );
}

export function Settings() {
  const settings = useGame((s) => s.settings);
  const patchSettings = useGame((s) => s.patchSettings);
  const resetSave = useGame((s) => s.resetSave);
  const setScreen = useGame((s) => s.setScreen);
  const career = useGame((s) => s.career);

  const toggle = (label: string, key: keyof typeof settings, hint?: string) => (
    <label className="mt-2 flex min-h-11 items-center justify-between gap-3 border border-line bg-panel px-3 py-3">
      <span className="font-ui text-sm leading-snug">
        {label}
        {hint ? <span className="mt-0.5 block text-xs text-muted">{hint}</span> : null}
      </span>
      <input
        type="checkbox"
        checked={Boolean(settings[key])}
        onChange={(e) => patchSettings({ [key]: e.target.checked })}
      />
    </label>
  );

  return (
    <Shell title="Settings" onBack={() => setScreen(career ? "office" : "title")}>
      {toggle("Sound", "sfx")}
      {toggle("Music", "music")}
      {toggle("Screen shake", "shake")}
      {toggle("Share anonymous play data", "telemetry")}
      {toggle("Auto-pitch", "autoPitch", "CPU pitches for you. Defense becomes a Skip ticker.")}
      {toggle("Auto-baserun", "autoBaserun", "Runners hold on every send/hold prompt.")}
      {toggle("High contrast", "highContrast")}
      {toggle("Left-hand layout", "leftHand", "Play bar mirrors for thumb reach.")}
      {toggle("Haptics", "haptics")}
      {toggle("Timing assist", "timingAssist", "Wider swing window. Flags assist sessions.")}
      {toggle("Narration", "narration", "Screen reader reads play-by-play aloud.")}
      {toggle("Skip onboarding", "skipOnboarding", "No teach cards on first visit.")}

      <label className="mt-2 flex min-h-11 items-center justify-between gap-3 border border-line bg-panel px-3 py-3">
        <span className="font-ui text-sm">Text scale</span>
        <select
          value={settings.textScale}
          onChange={(e) => patchSettings({ textScale: Number(e.target.value) })}
          className="border border-line bg-ink-2 px-2 py-1 font-ui text-sm text-cream"
        >
          <option value={0.85}>Small</option>
          <option value={1}>Default</option>
          <option value={1.15}>Large</option>
          <option value={1.3}>Extra large</option>
        </select>
      </label>

      <label className="mt-2 flex min-h-11 items-center justify-between gap-3 border border-line bg-panel px-3 py-3">
        <span className="font-ui text-sm">Colorblind mode</span>
        <select
          value={settings.colorblind}
          onChange={(e) => patchSettings({ colorblind: e.target.value as typeof settings.colorblind })}
          className="border border-line bg-ink-2 px-2 py-1 font-ui text-sm text-cream"
        >
          <option value="none">Off</option>
          <option value="protan">Protan</option>
          <option value="deutan">Deutan</option>
          <option value="tritan">Tritan</option>
        </select>
      </label>

      <label className="mt-2 flex min-h-11 items-center justify-between gap-3 border border-line bg-panel px-3 py-3">
        <span className="font-ui text-sm">Reduced motion</span>
        <select
          value={settings.reducedMotion}
          onChange={(e) => patchSettings({ reducedMotion: e.target.value as typeof settings.reducedMotion })}
          className="border border-line bg-ink-2 px-2 py-1 font-ui text-sm text-cream"
        >
          <option value="system">System</option>
          <option value="off">Off</option>
          <option value="on">On</option>
        </select>
      </label>

      <label className="mt-2 flex items-center justify-between border border-line bg-panel px-3 py-3">
        <span className="font-ui text-sm">
          Auto-baserun
          <span className="block text-xs text-muted">Always hold runners on extra-base decisions.</span>
        </span>
        <input
          type="checkbox"
          checked={settings.autoBaserun === true}
          onChange={(e) => patchSettings({ autoBaserun: e.target.checked })}
        />
      </label>
      {career ? (
        <div className="mt-2 border border-line bg-panel px-3 py-3">
          <span className="font-ui text-sm">Difficulty</span>
          <p className="mt-1 font-display text-[10px] uppercase text-grass-2">
            {career.difficulty ?? "pro"}
          </p>
          <p className="mt-1 font-ui text-xs text-muted">Locked when career starts.</p>
        </div>
      ) : null}
      <p className="mt-6 font-ui text-xs leading-relaxed text-muted">
        <span className="text-cream">Hitting.</span> Before the pitch, tap a cell on the SIT ON grid (or arrows) to pick where
        you are looking; pick Contact, Power, or Bunt below. Tap the field when the meter hits green. A swing far from
        where you sat is a weak one. The pitch type shows as ? until your hitter reads it.
        <br />
        <span className="text-cream">Pitching.</span> Tap the pitch button to cycle your arsenal (1–4), tap a spot on the
        zone (arrows), then Throw. Tap once at KICK and once at RELEASE. Auto lets the catcher call it. Escape skips the
        half.
        <br />
        Keys: Space = Swing / Throw / Tap · Shift = Power · C / P / B = swing type · Tab = Auto · Enter = Skip.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <PixelBtn variant="ghost" onClick={() => setScreen("help")}>
          Full help
        </PixelBtn>
        <PixelBtn variant="ghost" onClick={() => setScreen("credits")}>
          Credits
        </PixelBtn>
      </div>
      <PixelBtn variant="danger" className="mt-6 w-full" onClick={resetSave}>
        Erase career
      </PixelBtn>
    </Shell>
  );
}
