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
  "the pictures on the Clubhouse wall",
  "how her year is written on the Last Bow",
  "the songs the crowd sings for her",
  "a way into the Diamond Finale",
  "Never Quit",
] as const;

/** One sentence for the Shop screen, from the list above. */
export function neverSoldLine(): string {
  const last = NEVER_SOLD[NEVER_SOLD.length - 1];
  const head = NEVER_SOLD.slice(0, -1).join(", ");
  return `Never sold: ${head}, and ${last}.`;
}

/** The Shop stamp already says Never for sale. These tap through under it. */
export function neverSoldLines(): string[] {
  return NEVER_SOLD.map((item, i, all) => {
    const body = `${item.charAt(0).toUpperCase()}${item.slice(1)}.`;
    return i === all.length - 1 ? `And ${item}.` : body;
  });
}

/** The Shop door, one sentence at a time. */
export const SHOP_INTRO: readonly string[] = [
  "Everything here changes how the game looks, and nothing else.",
  "This is a preview, so nothing actually charges you.",
  "The prices you see are the prices.",
];

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
    blurb: "The whole game, the first new girl, and the Opening Season uniforms.",
  },
  {
    id: "girl-7",
    kind: "expansion",
    name: "Expansion girl",
    usd: 7.99,
    blurb: "One new girl, with her own walk-up and her own crowd.",
  },
  {
    id: "season-1",
    kind: "pass",
    name: "Season 1 pass (girls 7–9)",
    usd: 19.99,
    blurb: "The next three girls for a little less, and nothing in it you can't buy on its own.",
  },
  {
    id: "lantern-pack",
    kind: "cosmetic",
    name: "Season of the Lantern",
    usd: 4.99,
    blurb: "Gold frames, and Koi at lantern-light.",
  },
  {
    id: "opening-pack",
    kind: "cosmetic",
    name: "Opening Season pack",
    usd: 3.99,
    blurb: "Parks like an old TV night, and throwback uniforms.",
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

/** A picture of the look, so the Shop is not a text list. Walk-up alt is a song, not a picture. */
export function skuPreview(id: string): { src: string; skin: string; caption: string } | null {
  if (id === "lantern-pack") return { src: "/bg/park-koi.jpg", skin: "lantern-season", caption: "Koi at lantern-light, gold on the Clubhouse wall." };
  if (id === "opening-pack") return { src: "/bg/park-kings.jpg", skin: "broadcast-filter", caption: "An old TV night, a little grain on the parks." };
  return null;
}
