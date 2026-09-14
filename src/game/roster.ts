import { clamp, ipFmt, isPitcher, ovr, SALARY_CAP, uid } from "./data.ts";
import { TRADE_FEE, tradeRefusal } from "./economy.ts";
import type { BoxLine, Career, Player, PlayerStats, Pos, Team } from "./types.ts";

export function findPlayer(team: Team, id: string) {
  return team.roster.find((p) => p.id === id) ?? null;
}

export function starterFor(team: Team, week: number) {
  if (team.rotation.length === 0) {
    return team.roster.find((p) => p.pos === "SP") ?? team.roster.find((p) => p.pos === "RP") ?? team.roster[0]!;
  }
  const id = team.rotation[(week - 1) % team.rotation.length]!;
  return findPlayer(team, id) ?? team.roster.find((p) => p.pos === "SP") ?? team.roster[0]!;
}

function healthyHitters(team: Team) {
  return team.roster.filter((p) => !isPitcher(p.pos) && p.injured === 0);
}

export function repairLineup(team: Team) {
  const healthy = healthyHitters(team);
  const used = new Set<string>();
  const next: string[] = [];
  for (const id of team.lineup) {
    if (next.length >= 9) break;
    if (healthy.some((p) => p.id === id) && !used.has(id)) {
      next.push(id);
      used.add(id);
    }
  }
  const order: Pos[] = ["CF", "SS", "LF", "1B", "DH", "RF", "3B", "C", "2B"];
  for (const pos of order) {
    if (next.length >= 9) break;
    const p = healthy.find((x) => x.pos === pos && !used.has(x.id));
    if (p) {
      next.push(p.id);
      used.add(p.id);
    }
  }
  for (const p of [...healthy].sort((a, b) => ovr(b) - ovr(a))) {
    if (next.length >= 9) break;
    if (!used.has(p.id)) {
      next.push(p.id);
      used.add(p.id);
    }
  }
  if (next.length < 9) {
    for (const p of team.roster.filter((x) => !isPitcher(x.pos))) {
      if (next.length >= 9) break;
      if (!used.has(p.id)) {
        next.push(p.id);
        used.add(p.id);
      }
    }
  }
  team.lineup = next;
}

export function repairStaff(team: Team) {
  const healthyArms = team.roster.filter((p) => isPitcher(p.pos) && p.injured === 0);
  const sps = healthyArms
    .filter((p) => p.pos === "SP")
    .sort((a, b) => b.stuff + b.control - (a.stuff + a.control));
  const used = new Set<string>();
  const rotation: string[] = [];
  for (const id of team.rotation) {
    if (rotation.length >= 5) break;
    if (sps.some((p) => p.id === id) && !used.has(id)) {
      rotation.push(id);
      used.add(id);
    }
  }
  for (const p of sps) {
    if (rotation.length >= 5) break;
    if (!used.has(p.id)) {
      rotation.push(p.id);
      used.add(p.id);
    }
  }
  if (rotation.length < 5) {
    for (const p of healthyArms.sort((a, b) => ovr(b) - ovr(a))) {
      if (rotation.length >= 5) break;
      if (!used.has(p.id)) {
        rotation.push(p.id);
        used.add(p.id);
      }
    }
  }
  team.rotation = rotation;
  const closer = team.closerId ? findPlayer(team, team.closerId) : null;
  if (!closer || closer.injured > 0 || !isPitcher(closer.pos)) {
    const cl =
      healthyArms.find((p) => p.pos === "CL") ??
      healthyArms.filter((p) => p.pos === "RP").sort((a, b) => b.stuff - a.stuff)[0] ??
      null;
    team.closerId = cl?.id ?? null;
  }
}

export function repairClub(team: Team) {
  repairLineup(team);
  repairStaff(team);
}

export function snapshotTeamStats(team: Team): Record<string, PlayerStats> {
  const snap: Record<string, PlayerStats> = {};
  for (const p of team.roster) snap[p.id] = { ...p.stats };
  return snap;
}

export function boxFromDiff(team: Team, before: Record<string, PlayerStats>): BoxLine[] {
  const lines: BoxLine[] = [];
  for (const p of team.roster) {
    const prev = before[p.id];
    if (!prev) continue;
    const s = p.stats;
    if (isPitcher(p.pos)) {
      const ip = Math.round((s.ip - prev.ip) * 10) / 10;
      const k = s.k - prev.k;
      const er = s.er - prev.er;
      const w = s.w - prev.w;
      const l = s.l - prev.l;
      const sv = s.sv - prev.sv;
      if (ip <= 0 && k === 0 && w === 0 && l === 0 && sv === 0) continue;
      const bits = [`${ipFmt(Math.max(0, ip))} IP`, `${er} ER`, `${k} K`];
      if (w) bits.push("W");
      if (l) bits.push("L");
      if (sv) bits.push("SV");
      lines.push({ playerId: p.id, name: p.name, pos: p.pos, line: bits.join(" · ") });
    } else {
      const ab = s.ab - prev.ab;
      const h = s.h - prev.h;
      const hr = s.hr - prev.hr;
      const rbi = s.rbi - prev.rbi;
      const bb = s.bb - prev.bb;
      if (ab <= 0 && bb === 0) continue;
      const bits = [`${h}-${ab}`];
      if (hr) bits.push(`${hr} HR`);
      if (rbi) bits.push(`${rbi} RBI`);
      if (bb && ab <= 0) bits.push(`${bb} BB`);
      lines.push({ playerId: p.id, name: p.name, pos: p.pos, line: bits.join(" · ") });
    }
  }
  return lines.sort((a, b) => {
    const ap = isPitcher(a.pos) ? 1 : 0;
    const bp = isPitcher(b.pos) ? 1 : 0;
    return ap - bp;
  });
}

export interface TradeOffer {
  teamId: string;
  teamAbbr: string;
  player: Player;
}

export function tradeOffers(career: Career, myPlayerId: string): TradeOffer[] {
  const mine = career.teams.flatMap((t) => t.roster).find((p) => p.id === myPlayerId);
  if (!mine) return [];
  const myOvr = ovr(mine);
  const offers: TradeOffer[] = [];
  for (const team of career.teams) {
    if (team.id === career.userTeamId) continue;
    for (const p of team.roster) {
      if (isPitcher(p.pos) !== isPitcher(mine.pos)) continue;
      const diff = ovr(p) - myOvr;
      if (diff > 3 || diff < -5) continue;
      offers.push({ teamId: team.id, teamAbbr: team.abbr, player: p });
    }
  }
  return offers.sort((a, b) => ovr(b.player) - ovr(a.player)).slice(0, 12);
}

export function executeTrade(career: Career, myPlayerId: string, theirPlayerId: string): string | null {
  const user = career.teams.find((t) => t.id === career.userTeamId);
  if (!user) return "No club.";
  const mine = findPlayer(user, myPlayerId);
  if (!mine) return "He's not on the club.";
  let theirs: Player | null = null;
  let other: Team | null = null;
  for (const team of career.teams) {
    if (team.id === user.id) continue;
    const p = findPlayer(team, theirPlayerId);
    if (p) {
      theirs = p;
      other = team;
      break;
    }
  }
  if (!theirs || !other) return "Deal died.";
  const refusal = tradeRefusal(mine, theirs);
  if (refusal) return refusal;
  const nextPayroll = user.roster.reduce((s, p) => s + (p.id === mine.id ? 0 : p.salary), 0) + theirs.salary;
  if (nextPayroll > SALARY_CAP) return "Cap is tight.";
  if (career.credits < TRADE_FEE) return `Filing a deal costs ${TRADE_FEE}C. Front office is broke.`;
  career.credits -= TRADE_FEE;
  user.roster = user.roster.filter((p) => p.id !== mine.id);
  other.roster = other.roster.filter((p) => p.id !== theirs!.id);
  user.roster.push(theirs);
  other.roster.push(mine);
  theirs.morale = clamp(theirs.morale + 6, 20, 100);
  mine.morale = clamp(mine.morale - 8, 20, 100);
  if (ovr(mine) >= 14) {
    for (const p of user.roster) p.morale = clamp(p.morale - 3, 20, 100);
  }
  repairClub(user);
  repairClub(other);
  career.news.unshift({
    id: uid("n"),
    week: career.week,
    year: career.year,
    text: `Traded ${mine.name} to ${other.abbr} for ${theirs.name}.`,
  });
  return null;
}
