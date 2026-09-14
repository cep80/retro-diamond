import { uid } from "../game/data.ts";
import { sheet } from "./bible.ts";
import { cardAltLook, peakStatKey } from "./ending.ts";
import type { CharacterId, ClubhouseCard, EndingRank, Spark, SparkKind, TraineeStatKey, TraineeStats } from "./types.ts";

const KINDS: SparkKind[] = [
  "contact",
  "speed",
  "eye",
  "power",
  "guts",
  "wit",
  "stuff",
  "control",
  "stamina",
  "legend",
  "polish",
];

const IDS: CharacterId[] = ["aoi", "reina", "miki", "sol", "kira", "yuki"];
const RANKS: EndingRank[] = ["S", "A", "B", "C", "D", "never-quit"];

type Wire = { v: 1; c: CharacterId; e: EndingRank; s: Spark[]; f: number; k?: "dirt" | "ball"; a?: 1; pk?: TraineeStatKey };

function toB64(s: string) {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const raw = globalThis.btoa(bin);
  return raw.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64(s: string) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const raw = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = globalThis.atob(raw);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function emptyPeak(): TraineeStats {
  return { contact: 0, speed: 0, eye: 0, power: 0, guts: 0, wit: 0, stuff: 0, control: 0, stamina: 0 };
}

function peakFromKey(k?: TraineeStatKey): TraineeStats {
  const stats = emptyPeak();
  if (k && k in stats) stats[k] = 16;
  return stats;
}

function isSpark(x: unknown): x is Spark {
  if (!x || typeof x !== "object") return false;
  const s = x as Spark;
  return KINDS.includes(s.kind) && typeof s.power === "number" && s.power > 0 && s.power <= 2;
}

export function encodeCard(card: ClubhouseCard) {
  const wire: Wire = {
    v: 1,
    c: card.characterId,
    e: card.ending,
    s: card.sparks.filter((s) => s.kind !== "polish").slice(0, 3),
    f: card.fans,
    k: card.keepsake === "dirt" || card.keepsake === "ball" ? card.keepsake : undefined,
    a: cardAltLook(card) ? 1 : undefined,
    pk: card.peakStats && card.peakStats[peakStatKey(card.peakStats)] > 0 ? peakStatKey(card.peakStats) : undefined,
  };
  return `SHINE-${toB64(JSON.stringify(wire))}`;
}

export function decodeCard(code: string): ClubhouseCard | null {
  const raw = code.trim();
  if (!raw.toUpperCase().startsWith("SHINE-")) return null;
  try {
    const parsed = JSON.parse(fromB64(raw.slice(6))) as Wire;
    if (parsed.v !== 1) return null;
    if (!IDS.includes(parsed.c) || !RANKS.includes(parsed.e)) return null;
    if (!Array.isArray(parsed.s) || parsed.s.length > 3 || !parsed.s.every(isSpark)) return null;
    if (typeof parsed.f !== "number" || parsed.f < 0 || parsed.f > 200) return null;
    const who = sheet(parsed.c);
    return {
      id: uid("carry"),
      characterId: parsed.c,
      ending: parsed.e,
      quote: "A Coach carried this card across the complex.",
      sparks: parsed.s,
      fans: parsed.f,
      style: who.style,
      aptitude: who.aptitude,
      keepsake: parsed.k === "dirt" || parsed.k === "ball" ? parsed.k : null,
      altLook: parsed.a === 1 || parsed.f >= 100,
      peakStats: peakFromKey(parsed.pk),
      runNumber: 1,
    };
  } catch {
    return null;
  }
}
