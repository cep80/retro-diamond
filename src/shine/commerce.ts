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

/** What the shop will never sell, said plainly. The list reads as one sentence on the Shop screen. */
export const NEVER_SOLD = [
  "anything that makes her better at baseball",
  "what she passes on to the next girl",
  "Clubhouse cards",
  "ending ranks",
  "the songs the crowd sings for her",
  "a way into the Diamond Finale",
  "Never Quit",
] as const;

export const SKUS: Sku[] = [
  {
    id: "base",
    kind: "base",
    name: "Diamond Shine",
    usd: 19.99,
    blurb: "Six girls, sixteen parks, and three years with each of them.",
  },
  {
    id: "deluxe",
    kind: "deluxe",
    name: "Digital Deluxe",
    usd: 27.99,
    blurb: "The whole game, the first new girl, and the Opening Season looks.",
  },
  {
    id: "girl-7",
    kind: "expansion",
    name: "Expansion girl",
    usd: 7.99,
    blurb: "One new girl with her own three years, her own walk-up song, and her own crowd. No banners, no pull rates.",
  },
  {
    id: "season-1",
    kind: "pass",
    name: "Season 1 pass (girls 7–9)",
    usd: 19.99,
    blurb: "The next three girls for a little less. Nothing in it you can't buy on its own.",
  },
  {
    id: "lantern-pack",
    kind: "cosmetic",
    name: "Season of the Lantern",
    usd: 4.99,
    blurb: "Warm lantern light over the parks, and new frames for her cards. It only changes how things look.",
  },
  {
    id: "opening-pack",
    kind: "cosmetic",
    name: "Opening Season pack",
    usd: 3.99,
    blurb: "An old TV broadcast look and throwback uniforms. It only changes how things look.",
  },
  {
    id: "walk-up-alt",
    kind: "cosmetic",
    name: "Walk-up alt",
    usd: 1.99,
    blurb: "A second walk-up song for a girl you've already coached.",
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
