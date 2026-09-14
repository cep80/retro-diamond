import type { ParkId } from "./types.ts";

export interface Park {
  id: ParkId;
  name: string;
  bg: string;
  sky: string;
  blurb: string;
  hr: number;
  doubles: number;
  triples: number;
  hits: number;
}

export const NEUTRAL_PARK: Park = {
  id: "kings",
  name: "Night Classic",
  bg: "/bg/park-kings.jpg",
  sky: "#0c1210",
  blurb: "True park. Plays honest.",
  hr: 1,
  doubles: 1,
  triples: 1,
  hits: 1,
};

export const PARKS: Park[] = [
  {
    id: "heat",
    name: "The Gulf",
    bg: "/bg/park-heat.jpg",
    sky: "#87a0c0",
    blurb: "Short porch. The ball carries in the heat.",
    hr: 1.1,
    doubles: 0.96,
    triples: 0.88,
    hits: 1.02,
  },
  {
    id: "kings",
    name: "Night Classic",
    bg: "/bg/park-kings.jpg",
    sky: "#0c1210",
    blurb: "True park. Plays honest.",
    hr: 1,
    doubles: 1,
    triples: 0.96,
    hits: 1,
  },
  {
    id: "irons",
    name: "The Yard",
    bg: "/bg/park-irons.jpg",
    sky: "#6a8a48",
    blurb: "Room in the gaps. Extra triples.",
    hr: 0.95,
    doubles: 1.06,
    triples: 1.12,
    hits: 1.02,
  },
  {
    id: "koi",
    name: "Lantern Field",
    bg: "/bg/park-koi.jpg",
    sky: "#1a1430",
    blurb: "Pitcher's night. Fly balls die.",
    hr: 0.9,
    doubles: 0.98,
    triples: 0.9,
    hits: 0.97,
  },
  {
    id: "dusters",
    name: "Red Mesa",
    bg: "/bg/park-dusters.jpg",
    sky: "#c48a58",
    blurb: "Dry air. Extra fly balls.",
    hr: 1.14,
    doubles: 1.02,
    triples: 0.86,
    hits: 1.03,
  },
  {
    id: "rain",
    name: "The Sound",
    bg: "/bg/park-rain.jpg",
    sky: "#6a8898",
    blurb: "Marine layer. Arms like it here.",
    hr: 0.84,
    doubles: 0.94,
    triples: 1.06,
    hits: 0.95,
  },
  {
    id: "palms",
    name: "Palm Court",
    bg: "/bg/park-palms.jpg",
    sky: "#c48a6a",
    blurb: "Humid. The ball jumps.",
    hr: 1.12,
    doubles: 1,
    triples: 0.88,
    hits: 1.04,
  },
  {
    id: "peaks",
    name: "High Park",
    bg: "/bg/park-peaks.jpg",
    sky: "#3a5080",
    blurb: "Thin air. Everything flies.",
    hr: 1.3,
    doubles: 1.14,
    triples: 1.18,
    hits: 1.1,
  },
  {
    id: "harbor",
    name: "The Wall",
    bg: "/bg/park-harbor.jpg",
    sky: "#121018",
    blurb: "Doubles live. Homers die to left.",
    hr: 0.88,
    doubles: 1.24,
    triples: 0.82,
    hits: 1.04,
  },
  {
    id: "stars",
    name: "West Light",
    bg: "/bg/park-stars.jpg",
    sky: "#4a3a68",
    blurb: "Big outfield. Triples live.",
    hr: 0.94,
    doubles: 1.02,
    triples: 1.16,
    hits: 0.98,
  },
  {
    id: "range",
    name: "Open Range",
    bg: "/bg/park-range.jpg",
    sky: "#c4a060",
    blurb: "Heat. A few extra homers.",
    hr: 1.08,
    doubles: 1,
    triples: 0.94,
    hits: 1.02,
  },
  {
    id: "knights",
    name: "Blackstone",
    bg: "/bg/park-knights.jpg",
    sky: "#0a0a0a",
    blurb: "Deep alleys. Pitcher park.",
    hr: 0.92,
    doubles: 0.96,
    triples: 0.9,
    hits: 0.96,
  },
  {
    id: "north",
    name: "North Field",
    bg: "/bg/park-north.jpg",
    sky: "#7a9ab8",
    blurb: "Open grass. Gaps and triples.",
    hr: 1.04,
    doubles: 1.04,
    triples: 1.14,
    hits: 1.02,
  },
  {
    id: "mags",
    name: "Magnolia",
    bg: "/bg/park-mags.jpg",
    sky: "#88a070",
    blurb: "Cozy. The ball gets out.",
    hr: 1.1,
    doubles: 0.96,
    triples: 0.9,
    hits: 1.03,
  },
  {
    id: "forges",
    name: "The River",
    bg: "/bg/park-forges.jpg",
    sky: "#2a2418",
    blurb: "Big. Doubles off the wall.",
    hr: 0.9,
    doubles: 1.1,
    triples: 0.96,
    hits: 0.99,
  },
  {
    id: "smoke",
    name: "Fountain Yard",
    bg: "/bg/park-smoke.jpg",
    sky: "#6a90c0",
    blurb: "Spacious. Extra bases in the gaps.",
    hr: 0.96,
    doubles: 1.08,
    triples: 1.12,
    hits: 1.01,
  },
];

const BY_ID = Object.fromEntries(PARKS.map((p) => [p.id, p])) as Record<ParkId, Park>;

export function parkById(id: ParkId | undefined): Park {
  return (id && BY_ID[id]) || NEUTRAL_PARK;
}

export function parkForTeam(team: { parkId?: ParkId; id?: string }): Park {
  return parkById(team.parkId ?? (team.id as ParkId | undefined));
}

export function parkLabel(park: Park): string {
  if (park.hr >= 1.08) return "Hitter";
  if (park.hr <= 0.92) return "Pitcher";
  if (park.doubles >= 1.15) return "Wall";
  return "True";
}
