/**
 * The picture budget for the end of a career (check-in 27, N4).
 *
 * The last screens run done panel → curtain call → postgame → ending scene → Winning Live
 * or Last Bow → the scrapbook's first page, and no two in a row may show the same picture.
 * Some of those screens are fixed by what she did (the done panel's settled still, the
 * curtain's still, the scene's last bust); the postgame and the stage pick from her
 * existing stills and busts, in order of preference, skipping whatever the screen before
 * (and, for the stage, the page after) already shows.
 *
 * Until §9.2's stage art lands (LIVE_STAGE_ART_READY), the Live is her elated bust on a
 * stage-lit plate (warm spotlights over the Finale's plate, in CSS), never the done panel's
 * action still again.
 */
import { endingFilmSrc, FINALE_PARK_PLATE, isPitcherStyle, parkSrc, sceneBustSrc, sceneFilmSrc, sheet } from "./bible.ts";
import { curtainFilmSrc, shouldCurtainCall } from "./culture.ts";
import { LIVE_STAGE_ART_READY, type EndingStage } from "./ending.ts";
import { framedBust } from "./scene-frame.ts";
import type { BookEntry } from "./scrapbook.ts";
import { endingScene } from "./story-endings.ts";
import type { CharacterId, EndingRank } from "./types.ts";

type BustMood = "elated" | "focused" | "crushed" | "neutral";

/** One picture choice: an action still (film), or her bust over a plate. */
export type EndingPicture = { kind: "film"; src: string } | { kind: "bust"; src: string; mood: BustMood; plate: string; lit: boolean };

export type EndingScreen = "done" | "curtain" | "postgame" | "scene" | "stage" | "scrapbook";

/**
 * A screen and the pictures of her it shows (a plate with no girl on it doesn't count): the one
 * it opens on, and the one it leaves on (a scene's bust changes with her lines; `last` defaults
 * to `srcs`).
 */
export interface EndingShot {
  screen: EndingScreen;
  srcs: string[];
  last?: string[];
}

function bust(id: CharacterId, mood: BustMood, plate: string, lit = false): EndingPicture {
  return { kind: "bust", src: sceneBustSrc(id, mood), mood, plate, lit };
}

function film(src: string): EndingPicture {
  return { kind: "film", src };
}

/** The first candidate whose picture isn't on a neighbouring screen (the last one if all are). */
function pick(candidates: EndingPicture[], avoid: readonly string[]): EndingPicture {
  return candidates.find((c) => !avoid.includes(c.src)) ?? candidates.at(-1)!;
}

/**
 * The Finale's done panel, as it settles: a hitter on her painted still (celebrate when she got
 * it, crushed when she didn't; ShineRace never settles a met Finale on the trot, which is the
 * curtain's), a pitcher on her bust (ShineMound).
 */
export function finaleDoneSrcs(id: CharacterId, met: boolean): string[] {
  if (isPitcherStyle(sheet(id).style)) return [sceneBustSrc(id, met ? "elated" : "crushed")];
  return [`/art/action/${id}/${met ? "celebrate" : "crushed"}.webp`];
}

/** The curtain call's still, when the Finale earns one (her ask met). */
export function finaleCurtainSrc(id: CharacterId, met: boolean): string | null {
  return shouldCurtainCall("finale", met) ? curtainFilmSrc(id) : null;
}

/**
 * The Finale's postgame: her face over the Finale's plate, in the mood of the night (elated
 * when her side won it, composed when she got what she came for and they lost, crushed when
 * neither), never the picture just before it.
 */
export function finalePostgamePicture(id: CharacterId, met: boolean, teamWon: boolean, before: readonly string[], after: readonly string[] = []): EndingPicture {
  const plate = FINALE_PARK_PLATE;
  const mood: BustMood = teamWon ? "elated" : met ? "focused" : "crushed";
  return pick(
    [
      bust(id, mood, plate),
      bust(id, mood === "elated" ? "neutral" : "focused", plate),
      bust(id, "neutral", plate),
      bust(id, mood === "crushed" ? "focused" : "crushed", plate),
      film(sceneFilmSrc(id, mood === "crushed" ? "crushed" : "elated")),
    ],
    [...before, ...after],
  );
}

/** The bust the ending scene leaves on screen when its last line is read. */
export function endingSceneSrc(id: CharacterId, rank: EndingRank): string {
  const scene = endingScene(id, rank);
  const { still, mood } = framedBust(scene.beats, scene.beats.length - 1, id);
  return sceneBustSrc(still, mood as BustMood);
}

/** The bust the ending scene opens on (its first line). */
export function endingSceneOpenSrc(id: CharacterId, rank: EndingRank): string {
  const scene = endingScene(id, rank);
  const { still, mood } = framedBust(scene.beats, 0, id);
  return sceneBustSrc(still, mood as BustMood);
}

/** Her Live bust: elated, except Reina, whose elated bust wears the old mark (the wall's rule). */
function liveMood(id: CharacterId): BustMood {
  return id === "reina" ? "focused" : "elated";
}

/**
 * The Winning Live's or the Last Bow's picture. The Live: her stage still once §9.2 lands;
 * until then her bust on the stage-lit Finale plate, then her elated still, then the curtain's.
 * The Last Bow: her composed bust on her home park, then the curtain's still (a career that
 * closed early keeps its own still first). Never the scene's last bust or the scrapbook's
 * first page.
 */
export function endingStagePicture(opts: {
  id: CharacterId;
  rank: EndingRank;
  stage: EndingStage;
  before: readonly string[];
  after?: readonly string[];
}): EndingPicture {
  const { id, rank, stage } = opts;
  const avoid = [...opts.before, ...(opts.after ?? [])];
  const home = parkSrc(sheet(id).parkId);
  if (stage === "live") {
    if (LIVE_STAGE_ART_READY) return film(`/art/action/${id}/live.webp`);
    // Always her bust under the lights first (the scene may have closed on the elated one); an
    // action still only when every bust is taken.
    return pick(
      [
        bust(id, liveMood(id), FINALE_PARK_PLATE, true),
        bust(id, "neutral", FINALE_PARK_PLATE, true),
        bust(id, liveMood(id) === "focused" ? "elated" : "focused", FINALE_PARK_PLATE, true),
        film(curtainFilmSrc(id)),
        film(sceneFilmSrc(id, "elated")),
      ],
      avoid,
    );
  }
  if (rank === "C" || rank === "D") return pick([film(endingFilmSrc(id, rank)), bust(id, "focused", home), bust(id, "neutral", home)], avoid);
  // The Bow is still the Finale's night: her bust on its painted plate, unlit.
  const plate = FINALE_PARK_PLATE;
  return pick(
    [bust(id, "focused", plate), film(curtainFilmSrc(id)), bust(id, "neutral", plate), bust(id, "crushed", plate), film(sceneFilmSrc(id, "focused")), film(endingFilmSrc(id, rank))],
    avoid,
  );
}

/** Every picture of her an EndingPicture shows. */
export function pictureSrcs(p: EndingPicture): string[] {
  return [p.src];
}

/**
 * The whole run of ending screens for a career that played the Finale: what each one shows,
 * in order. `firstPage` is the scrapbook's first polaroid.
 */
export function endingPictureRun(opts: {
  id: CharacterId;
  met: boolean;
  teamWon: boolean;
  rank: EndingRank;
  stage: EndingStage;
  firstPage?: string | null;
}): EndingShot[] {
  const { id, met, teamWon, rank, stage } = opts;
  const shots: EndingShot[] = [{ screen: "done", srcs: finaleDoneSrcs(id, met) }];
  const curtain = finaleCurtainSrc(id, met);
  if (curtain) shots.push({ screen: "curtain", srcs: [curtain] });
  const sceneOpen = endingSceneOpenSrc(id, rank);
  const scene = endingSceneSrc(id, rank);
  const post = finalePostgamePicture(id, met, teamWon, shots.at(-1)!.srcs, [sceneOpen]);
  shots.push({ screen: "postgame", srcs: pictureSrcs(post) });
  // The scene opens on one bust and closes on another: the postgame avoids the first, the stage the last.
  shots.push({ screen: "scene", srcs: [sceneOpen], last: [scene] });
  const after = opts.firstPage ? [opts.firstPage] : [];
  shots.push({ screen: "stage", srcs: pictureSrcs(endingStagePicture({ id, rank, stage, before: [scene], after })) });
  if (opts.firstPage) shots.push({ screen: "scrapbook", srcs: [opts.firstPage] });
  return shots;
}

/** The scrapbook's first polaroid picture, or null when the book opens on a note (or is empty). */
export function firstPolaroidSrc(entries: readonly BookEntry[]): string | null {
  const first = entries.find((e) => e.kind === "page");
  return first?.kind === "page" ? first.page.picture.src : null;
}

/** The first pair of neighbouring screens that share a picture, or null when none do. */
export function repeatedPicture(shots: readonly EndingShot[]): [EndingScreen, EndingScreen, string] | null {
  for (let i = 1; i < shots.length; i++) {
    const prev = shots[i - 1]!;
    const shared = shots[i]!.srcs.find((s) => (prev.last ?? prev.srcs).includes(s));
    if (shared) return [shots[i - 1]!.screen, shots[i]!.screen, shared];
  }
  return null;
}
