/**
 * The parks the circuit plays in and how each one treats a batted ball.
 * Backdrops come from `bible.parkSrc`; culture and sky from `culture.ts` and
 * `stage.ts`. This file is only the factors the oracle multiplies by.
 */
export type ParkId =
  | "heat"
  | "kings"
  | "irons"
  | "koi"
  | "dusters"
  | "rain"
  | "palms"
  | "peaks"
  | "harbor"
  | "stars"
  | "range"
  | "knights"
  | "north"
  | "mags"
  | "forges"
  | "smoke";

export interface Park {
  id: ParkId;
  name: string;
  /** Multipliers on the neutral outcome odds; 1 plays honest. */
  hr: number;
  doubles: number;
  triples: number;
  hits: number;
}

export const NEUTRAL_PARK: Park = { id: "kings", name: "Night Classic", hr: 1, doubles: 1, triples: 1, hits: 1 };

export const PARKS: Park[] = [
  { id: "heat", name: "The Gulf", hr: 1.1, doubles: 0.96, triples: 0.88, hits: 1.02 },
  { id: "kings", name: "Night Classic", hr: 1, doubles: 1, triples: 0.96, hits: 1 },
  { id: "irons", name: "The Yard", hr: 0.95, doubles: 1.06, triples: 1.12, hits: 1.02 },
  { id: "koi", name: "Lantern Field", hr: 0.9, doubles: 0.98, triples: 0.9, hits: 0.97 },
  { id: "dusters", name: "Red Mesa", hr: 1.14, doubles: 1.02, triples: 0.86, hits: 1.03 },
  { id: "rain", name: "The Sound", hr: 0.84, doubles: 0.94, triples: 1.06, hits: 0.95 },
  { id: "palms", name: "Palm Court", hr: 1.12, doubles: 1, triples: 0.88, hits: 1.04 },
  { id: "peaks", name: "High Park", hr: 1.3, doubles: 1.14, triples: 1.18, hits: 1.1 },
  { id: "harbor", name: "The Wall", hr: 0.88, doubles: 1.24, triples: 0.82, hits: 1.04 },
  { id: "stars", name: "West Light", hr: 0.94, doubles: 1.02, triples: 1.16, hits: 0.98 },
  { id: "range", name: "Open Range", hr: 1.08, doubles: 1, triples: 0.94, hits: 1.02 },
  { id: "knights", name: "Blackstone", hr: 0.92, doubles: 0.96, triples: 0.9, hits: 0.96 },
  { id: "north", name: "North Field", hr: 1.04, doubles: 1.04, triples: 1.14, hits: 1.02 },
  { id: "mags", name: "Magnolia", hr: 1.1, doubles: 0.96, triples: 0.9, hits: 1.03 },
  { id: "forges", name: "The River", hr: 0.9, doubles: 1.1, triples: 0.96, hits: 0.99 },
  { id: "smoke", name: "Fountain Yard", hr: 0.96, doubles: 1.08, triples: 1.12, hits: 1.01 },
];

const BY_ID = Object.fromEntries(PARKS.map((p) => [p.id, p])) as Record<ParkId, Park>;

export function parkById(id: ParkId | string | undefined): Park {
  return (id && BY_ID[id as ParkId]) || NEUTRAL_PARK;
}
