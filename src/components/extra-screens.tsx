import { useRef, useState } from "react";
import { avg, era, isPitcher, ovr, shortName } from "@/game/data";
import { dynastyTier, hallOfFameCandidates, legacySummary } from "@/game/career";
import {
  currentIsoWeek,
  friendCodeFromCoach,
  readLocalChallenge,
  scenarioForWeek,
} from "@/game/challenge";
import { reportHonorBoards } from "@/game/honor";
import { handLabel } from "@/game/look";
import { tendency } from "@/game/plate";
import { teamById, userTeam } from "@/game/sim";
import { useGame } from "@/game/store";
import type { Career, Player } from "@/game/types";
import { Card, PixelBtn, PlayerStars, RatingRow, Shell } from "./chrome";
import { cn } from "@/lib/utils";

function findPlayer(career: Career, id: string): Player | null {
  for (const t of career.teams) {
    const p = t.roster.find((x) => x.id === id);
    if (p) return p;
  }
  return career.fa.find((x) => x.id === id) ?? career.draftPool.find((x) => x.id === id) ?? null;
}

function milestoneLabel(id: string): string {
  return id
    .replace(/_/g, " ")
    .replace(/\b(hr|mvp|sv|k)\b/gi, (m) => m.toUpperCase())
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ScheduleScreen() {
  const career = useGame((s) => s.career)!;
  const setScreen = useGame((s) => s.setScreen);
  const team = userTeam(career);
  const games = career.schedule.filter((g) => !g.playoff);

  return (
    <Shell title="Schedule" onBack={() => setScreen("office")}>
      <p className="mb-3 font-ui text-xs text-muted">
        {career.year} season · {team.wins}-{team.losses}
      </p>
      <div className="flex flex-col gap-1">
        {games.map((g, i) => {
          const userGame = g.homeId === career.userTeamId || g.awayId === career.userTeamId;
          const opp = teamById(career, g.homeId === career.userTeamId ? g.awayId : g.homeId);
          const home = g.homeId === career.userTeamId;
          return (
            <div
              key={i}
              className={cn(
                "flex items-center justify-between border border-line px-3 py-2",
                userGame ? "border-grass-2 bg-panel-2" : "bg-panel",
              )}
            >
              <span className="font-ui text-sm">
                W{g.week} {home ? "vs" : "@"} {opp.abbr}
              </span>
              <span className="font-ui text-sm tabular-nums text-muted">
                {g.played ? `${g.homeScore}-${g.awayScore}` : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

export function BracketScreen() {
  const career = useGame((s) => s.career)!;
  const setScreen = useGame((s) => s.setScreen);
  const inPlayoffs = career.phase === "playoffs" || career.week >= 17;
  const semis = career.schedule.filter((g) => g.playoff === "semi");
  const final = career.schedule.find((g) => g.playoff === "final");

  if (!inPlayoffs) {
    return (
      <Shell title="Playoffs" onBack={() => setScreen("office")}>
        <p className="font-ui text-sm text-muted">Regular season. October waits on the standings.</p>
      </Shell>
    );
  }

  return (
    <Shell title="Bracket" onBack={() => setScreen("office")}>
      <p className="mb-3 font-display text-[8px] text-grass-2">SEMIFINALS</p>
      <div className="flex flex-col gap-2">
        {semis.map((g, i) => {
          const home = teamById(career, g.homeId);
          const away = teamById(career, g.awayId);
          const userGame = g.homeId === career.userTeamId || g.awayId === career.userTeamId;
          return (
            <Card key={i} className={userGame ? "border-grass-2" : undefined}>
              <p className="font-ui text-sm">
                {away.abbr} @ {home.abbr}
              </p>
              <p className="mt-1 font-ui text-xs tabular-nums text-muted">
                {g.played ? `${g.awayScore}-${g.homeScore}` : "TBD"}
              </p>
            </Card>
          );
        })}
      </div>
      {final ? (
        <>
          <p className="mb-2 mt-5 font-display text-[8px] text-grass-2">FINAL</p>
          <Card className={final.homeId === career.userTeamId || final.awayId === career.userTeamId ? "border-grass-2" : undefined}>
            <p className="font-ui text-sm">
              {teamById(career, final.awayId).abbr} @ {teamById(career, final.homeId).abbr}
            </p>
            <p className="mt-1 font-ui text-xs tabular-nums text-muted">
              {final.played ? `${final.awayScore}-${final.homeScore}` : "TBD"}
            </p>
          </Card>
        </>
      ) : null}
    </Shell>
  );
}

export function RecordsScreen() {
  const career = useGame((s) => s.career)!;
  const setScreen = useGame((s) => s.setScreen);
  const rec = career.records as Record<string, number> | undefined;
  const entries = rec ? Object.entries(rec).filter(([, v]) => typeof v === "number") : [];
  const tier = dynastyTier(career);
  const hof = hallOfFameCandidates(career);

  return (
    <Shell title="Records" onBack={() => setScreen("office")}>
      <Card className="mb-4">
        <p className="font-display text-[8px] text-muted">FRANCHISE TIER</p>
        <p className="mt-2 font-display text-[12px] uppercase text-grass-2">{tier}</p>
        {career.rings > 0 ? (
          <p className="mt-1 font-ui text-xs text-muted">
            {career.rings} ring{career.rings > 1 ? "s" : ""}
          </p>
        ) : null}
      </Card>
      {hof.length > 0 ? (
        <>
          <p className="mb-2 font-display text-[8px] text-grass-2">HALL OF FAME CANDIDATES</p>
          <div className="mb-4 flex flex-col gap-2">
            {hof.map((c) => (
              <div key={c.name} className="border border-line bg-panel px-3 py-2">
                <p className="font-ui text-sm">{c.name}</p>
                <p className="font-ui text-xs text-muted">{c.line}</p>
              </div>
            ))}
          </div>
        </>
      ) : null}
      {entries.length === 0 ? (
        <p className="font-ui text-sm text-muted">The book is blank. History starts tonight.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map(([k, v]) => (
            <div key={k} className="flex justify-between border border-line bg-panel px-3 py-2">
              <span className="font-ui text-sm capitalize">{k.replace(/([A-Z])/g, " $1").trim()}</span>
              <span className="font-display text-[10px] tabular-nums text-grass-2">{v}</span>
            </div>
          ))}
        </div>
      )}
      <p className="mb-2 mt-5 font-display text-[8px] text-grass-2">SEASONS</p>
      {career.history.length === 0 ? (
        <p className="font-ui text-sm text-muted">Year one.</p>
      ) : (
        career.history.map((h) => (
          <p key={h.year} className="flex justify-between font-ui text-sm">
            <span>{h.year}</span>
            <span className="tabular-nums text-muted">
              {h.wins}-{h.losses} · {h.result}
            </span>
          </p>
        ))
      )}
    </Shell>
  );
}

export function AchievementsScreen() {
  const career = useGame((s) => s.career)!;
  const setScreen = useGame((s) => s.setScreen);
  const badges = career.milestonesHit ?? [];

  return (
    <Shell title="Achievements" onBack={() => setScreen("office")}>
      {badges.length === 0 ? (
        <p className="font-ui text-sm text-muted">Nothing in the trophy case yet. Play on.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {badges.map((id) => (
            <Card key={id} className="text-center py-4">
              <span className="mx-auto block size-8 rotate-45 bg-grass-2" aria-hidden />
              <p className="mt-3 font-display text-[7px] leading-relaxed text-grass-2">{milestoneLabel(id)}</p>
            </Card>
          ))}
        </div>
      )}
    </Shell>
  );
}

export function PlayerCard() {
  const career = useGame((s) => s.career)!;
  const viewPlayerId = useGame((s) => s.viewPlayerId);
  const setScreen = useGame((s) => s.setScreen);
  const setViewPlayerId = useGame((s) => s.setViewPlayerId);
  const p = viewPlayerId ? findPlayer(career, viewPlayerId) : null;
  const tend = p && !isPitcher(p.pos) ? tendency(p) : "";

  const close = () => {
    setViewPlayerId(null);
    setScreen("roster");
  };

  if (!p) {
    return (
      <Shell title="Player" onBack={close}>
        <p className="font-ui text-sm text-muted">Player not found.</p>
      </Shell>
    );
  }

  return (
    <Shell title={shortName(p.name)} onBack={close}>
      <Card>
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-[10px]">{p.name}</p>
          <PlayerStars player={p} />
        </div>
        <p className="mt-2 font-ui text-xs text-muted">
          {p.pos} · {handLabel(p)} · {p.age}y · OVR {ovr(p)} · POT {p.potential}
          {p.scoutedPotential != null ? ` · Scout ${p.scoutedPotential}` : ""}
        </p>
        {tend ? <p className="mt-2 font-display text-[8px] text-grass-2">{tend}</p> : null}
      </Card>
      <div className="mt-4 space-y-1.5">
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
      <p className="mb-2 mt-5 font-display text-[8px] text-grass-2">THIS SEASON</p>
      <p className="font-ui text-sm text-muted">
        {isPitcher(p.pos)
          ? `${p.stats.w}-${p.stats.l} · ${p.stats.sv} SV · ERA ${era(p.stats)} · ${p.stats.k} K`
          : `${avg(p.stats)} · ${p.stats.hr} HR · ${p.stats.rbi} RBI · ${p.stats.sb} SB`}
      </p>
    </Shell>
  );
}

export function YearbookScreen() {
  const career = useGame((s) => s.career)!;
  const setScreen = useGame((s) => s.setScreen);
  const last = career.history[0];
  const L = legacySummary(career);
  const tier = dynastyTier(career);
  const hof = hallOfFameCandidates(career);

  return (
    <Shell title="Yearbook" onBack={() => setScreen("office")}>
      <Card className="mb-4">
        <p className="font-display text-[8px] text-muted">DYNASTY TIER</p>
        <p className="mt-2 font-display text-[12px] uppercase text-grass-2">{tier}</p>
      </Card>
      {hof.length > 0 ? (
        <>
          <p className="mb-2 font-display text-[8px] text-grass-2">HALL OF FAME WATCH</p>
          <div className="mb-4 flex flex-col gap-2">
            {hof.slice(0, 4).map((c) => (
              <div key={c.name} className="border border-line bg-panel px-3 py-2">
                <p className="font-ui text-sm">{c.name}</p>
                <p className="font-ui text-xs text-muted">{c.line}</p>
              </div>
            ))}
          </div>
        </>
      ) : null}
      {last ? (
        <Card>
          <p className="font-display text-[8px] text-muted">{last.year}</p>
          <p className="mt-2 font-display text-[14px] leading-relaxed">
            {last.wins}-{last.losses}
          </p>
          <p className="mt-2 font-ui text-sm text-muted">{last.result}</p>
          <p className="mt-4 font-ui text-sm leading-relaxed text-cream">{L.epitaph}</p>
        </Card>
      ) : (
        <p className="font-ui text-sm text-muted">The yearbook opens after your first season closes.</p>
      )}
    </Shell>
  );
}

const HELP_COPY = (
  <>
    <span className="text-cream">Hitting.</span> Before the pitch, tap a cell on the SIT ON grid (or arrows) to pick where
    you are looking; pick Contact, Power, or Bunt below. Tap the field when the meter hits green. A swing far from where
    you sat is a weak one. The pitch type shows as ? until your hitter reads it.
    <br />
    <span className="text-cream">Pitching.</span> Tap the pitch button to cycle your arsenal (1–4), tap a spot on the zone
    (arrows), then Throw. Tap once at KICK and once at RELEASE. Auto lets the catcher call it. Escape skips the half.
    <br />
    Keys: Space = Swing / Throw / Tap · Shift = Power · C / P / B = swing type · Tab = Auto · Enter = Skip.
  </>
);

export function HelpScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const career = useGame((s) => s.career);
  return (
    <Shell title="Help" onBack={() => setScreen(career ? "office" : "settings")}>
      <p className="font-ui text-xs leading-relaxed text-muted">{HELP_COPY}</p>
    </Shell>
  );
}

export function CreditsScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const career = useGame((s) => s.career);
  return (
    <Shell title="Credits" onBack={() => setScreen(career ? "office" : "title")}>
      <Card className="text-center py-6">
        <p className="font-display text-[12px] leading-relaxed">RETRO DIAMOND</p>
        <p className="mt-4 font-ui text-sm text-muted">A studio circle-up production.</p>
        <p className="mt-2 font-ui text-xs text-muted">
          Game design, systems, UX, economy, live-ops, analytics, art direction, and engine tech — the whole clubhouse.
        </p>
        <p className="mt-4 font-display text-[8px] text-grass-2">THANKS FOR PLAYING</p>
      </Card>
    </Shell>
  );
}

export function ScoutScreen() {
  const career = useGame((s) => s.career)!;
  const setScreen = useGame((s) => s.setScreen);

  if (career.phase !== "offseason") {
    return (
      <Shell title="Scouting" onBack={() => setScreen("office")}>
        <p className="font-ui text-sm text-muted">Scouts report in during the winter. Check back in the offseason.</p>
      </Shell>
    );
  }

  return (
    <Shell title="Scout Report" onBack={() => setScreen("office")}>
      <p className="mb-3 font-ui text-xs text-muted">Draft pool with scouting estimates. True potential may differ.</p>
      <div className="flex flex-col gap-2">
        {career.draftPool.slice(0, 16).map((p) => (
          <Card key={p.id} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-ui text-sm">
                {p.pos} {p.name}
              </p>
              <p className="font-ui text-xs text-muted">
                {p.age}y · scout {p.scoutedPotential ?? p.potential} · true {p.potential} · ovr {ovr(p)}
              </p>
            </div>
            <PlayerStars player={p} />
          </Card>
        ))}
      </div>
    </Shell>
  );
}

export function CloudConflictModal() {
  const cloudConflict = useGame((s) => s.cloudConflict);
  const resolveConflict = useGame((s) => s.resolveConflict);
  if (!cloudConflict) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 px-4">
      <Card className="w-full max-w-sm">
        <p className="font-display text-[10px] text-grass-2">SAVE CONFLICT</p>
        <p className="mt-3 font-ui text-sm text-muted">Two copies of your career disagree. Pick one to keep.</p>
        <div className="mt-4 space-y-2 font-ui text-xs">
          <p>
            <span className="text-muted">Local: </span>
            {cloudConflict.localSummary}
          </p>
          <p>
            <span className="text-muted">Cloud: </span>
            {cloudConflict.cloudSummary}
          </p>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <PixelBtn className="w-full" onClick={() => resolveConflict("local")}>
            Keep local
          </PixelBtn>
          <PixelBtn variant="ghost" className="w-full" onClick={() => resolveConflict("cloud")}>
            Keep cloud
          </PixelBtn>
        </div>
      </Card>
    </div>
  );
}

export function AccountScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const exportSave = useGame((s) => s.exportSave);
  const importSave = useGame((s) => s.importSave);
  const setToast = useGame((s) => s.setToast);
  const fileRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  const onExport = async () => {
    const json = exportSave();
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setToast("Save copied to clipboard.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setToast("Could not copy. Use the download instead.");
    }
  };

  const onImport = (text: string) => {
    const ok = importSave(text);
    setToast(ok ? "Save imported." : "Import failed — bad file.");
  };

  return (
    <Shell title="Account" onBack={() => setScreen("office")}>
      <CloudConflictModal />
      <Card>
        <p className="font-display text-[8px] text-grass-2">GUEST MODE</p>
        <p className="mt-2 font-ui text-sm text-muted">
          Playing offline on this device. Sign-in and cloud save arrive with the social layer.
        </p>
      </Card>
      <div className="mt-4 flex flex-col gap-2">
        <PixelBtn
          variant="ghost"
          className="w-full"
          onClick={() => setToast("Cloud sync needs sign-in.")}
        >
          Sync to cloud
        </PixelBtn>
        <PixelBtn className="w-full" onClick={onExport}>
          {copied ? "Copied" : "Export save"}
        </PixelBtn>
        <PixelBtn
          variant="ghost"
          className="w-full"
          onClick={() => {
            const blob = new Blob([exportSave()], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "retro-diamond.rdsave";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Download .rdsave
        </PixelBtn>
        <PixelBtn variant="ghost" className="w-full" onClick={() => fileRef.current?.click()}>
          Import save
        </PixelBtn>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.rdsave,application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const reader = new FileReader();
            reader.onload = () => onImport(String(reader.result ?? ""));
            reader.readAsText(f);
            e.target.value = "";
          }}
        />
      </div>
    </Shell>
  );
}

export function ChallengeScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const startChallenge = useGame((s) => s.startChallenge);
  const isoWeek = currentIsoWeek();
  const scenario = scenarioForWeek(isoWeek);
  const best = readLocalChallenge(isoWeek);

  return (
    <Shell title="Challenge" onBack={() => setScreen("office")}>
      <Card>
        <p className="font-display text-[8px] text-muted">WEEK</p>
        <p className="mt-1 font-ui text-sm">{isoWeek}</p>
        <p className="mt-4 font-display text-[10px]">{scenario}</p>
        <p className="mt-3 font-ui text-sm text-muted">
          Pro difficulty. All-Star rosters from a fixed seed. Best score saves locally until sign-in.
        </p>
        {best ? (
          <p className="mt-3 font-display text-[10px] text-grass-2">Your best: {best.score}</p>
        ) : null}
      </Card>
      <div className="mt-4 flex flex-col gap-2">
        <PixelBtn className="w-full" onClick={() => startChallenge()}>
          Play challenge
        </PixelBtn>
        <PixelBtn variant="ghost" className="w-full" onClick={() => setScreen("leaderboard")}>
          Leaderboard
        </PixelBtn>
      </div>
    </Shell>
  );
}

export function LeaderboardScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const career = useGame((s) => s.career);
  const isoWeek = currentIsoWeek();
  const scenario = scenarioForWeek(isoWeek);
  const best = readLocalChallenge(isoWeek);
  const honor = career ? reportHonorBoards(career) : [];

  return (
    <Shell title="Leaderboard" onBack={() => setScreen("office")}>
      <Card>
        <p className="font-display text-[8px] text-muted">{isoWeek}</p>
        <p className="mt-2 font-display text-[10px]">{scenario}</p>
      </Card>
      <div className="mt-4">
        {best ? (
          <Card>
            <p className="font-display text-[8px] text-muted">YOUR BEST</p>
            <p className="mt-2 font-display text-[14px] text-grass-2">{best.score}</p>
            <p className="mt-2 font-ui text-xs text-muted">
              Submitted {new Date(best.at).toLocaleDateString()}
            </p>
          </Card>
        ) : (
          <p className="font-ui text-sm text-muted">No local score this week. Play the challenge from the Office.</p>
        )}
      </div>
      {honor.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="font-display text-[8px] text-muted">HONOR BOARDS · UNVERIFIED</p>
          {honor.map((h) => (
            <Card key={h.board}>
              <p className="font-display text-[8px] text-muted">{h.board.toUpperCase()}</p>
              <p className="mt-1 font-display text-[12px] text-gold">{h.score}</p>
              <p className="mt-1 font-ui text-xs text-muted">{h.detail}</p>
            </Card>
          ))}
        </div>
      )}
      <div className="mt-4">
        <PixelBtn variant="ghost" className="w-full" onClick={() => setScreen("challenge")}>
          Weekly challenge
        </PixelBtn>
      </div>
    </Shell>
  );
}

export function FriendsScreen() {
  const setScreen = useGame((s) => s.setScreen);
  const coachName = useGame((s) => s.career?.coachName ?? "Coach");
  const code = friendCodeFromCoach(coachName);

  return (
    <Shell title="Friends" onBack={() => setScreen("office")}>
      <Card>
        <p className="font-display text-[8px] text-muted">YOUR FRIEND CODE</p>
        <p className="mt-3 font-display text-[14px] tracking-widest text-grass-2">{code}</p>
        <p className="mt-3 font-ui text-xs text-muted">
          Derived from your coach name on this device. Sign in to share and add friends.
        </p>
      </Card>
    </Shell>
  );
}
