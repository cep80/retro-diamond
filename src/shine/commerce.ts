/**
 * Locked SKUs. USD only. Never sell sparks, plate, Clubhouse cards, Finale, or Never Quit.
 */
export type SkuKind = "base" | "deluxe" | "expansion" | "pass" | "cosmetic";

export interface Sku {
  id: string;
  kind: SkuKind;
  name: string;
  usd: number;
  blurb: string;
}

export const NEVER_SOLD = [
  "Sparks",
  "Clubhouse cards",
  "Ending ranks",
  "Fan-threshold verses",
  "Diamond Finale access",
  "Never Quit ◆",
  "Plate constants",
] as const;

export const SKUS: Sku[] = [
  {
    id: "base",
    kind: "base",
    name: "Diamond Shine",
    usd: 19.99,
    blurb: "Six girls, 16 parks, the 60-turn career, Clubhouse, weekly challenge.",
  },
  {
    id: "deluxe",
    kind: "deluxe",
    name: "Digital Deluxe",
    usd: 27.99,
    blurb: "Base plus first expansion girl and Opening Season cosmetics.",
  },
  {
    id: "girl-7",
    kind: "expansion",
    name: "Expansion girl",
    usd: 7.99,
    blurb: "One full career, one walk-up, three 応援歌 verses. No banner. No pull rate.",
  },
  {
    id: "season-1",
    kind: "pass",
    name: "Season 1 pass (girls 7–9)",
    usd: 19.99,
    blurb: "Bundle discount only. No exclusive content.",
  },
  {
    id: "lantern-pack",
    kind: "cosmetic",
    name: "Season of the Lantern",
    usd: 4.99,
    blurb: "Card frames, park palettes, alt kits. Zero plate. Zero sparks.",
  },
  {
    id: "opening-pack",
    kind: "cosmetic",
    name: "Opening Season pack",
    usd: 3.99,
    blurb: "Broadcast filter and throwback kits. Presentation only.",
  },
  {
    id: "walk-up-alt",
    kind: "cosmetic",
    name: "Walk-up alt",
    usd: 1.99,
    blurb: "One alternate walk-up for a girl you already Coach.",
  },
];

export function sellsPower(sku: Sku) {
  const blob = `${sku.name} ${sku.blurb}`.toLowerCase();
  return /spark|plate constant|finale access|never quit|clubhouse card/.test(blob) && sku.kind !== "cosmetic" && sku.kind !== "base";
}

export function sparkSkuCount() {
  return SKUS.filter((s) => /spark/i.test(`${s.name} ${s.blurb}`) && !/zero sparks|never/.test(s.blurb.toLowerCase())).length;
}

export function previewClaimable(sku: Sku) {
  return sku.kind === "cosmetic";
}

export function cosmeticClasses(owned: string[]) {
  const cls: string[] = [];
  if (owned.includes("lantern-pack")) cls.push("lantern-season");
  if (owned.includes("opening-pack")) cls.push("broadcast-filter");
  return cls.join(" ");
}
