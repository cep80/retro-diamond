/**
 * The picture budget for the end of a career (check-in 27, N4; the whole run since check-in 31, F1).
 *
 * The last screens run 優勝 (a won Finale) → done panel → curtain call → postgame → ending scene
 * → Winning Live or Last Bow → the scrapbook's first page, and no picture of her shows twice
 * anywhere in that run, not just on neighbouring screens.
 *
 * Some screens are fixed by what she did: a hitter's done panel (ShineRace settles on her
 * celebrate or crushed still), the curtain's still, the ending scene's first and last busts.
 * The rest choose from her stills and busts, in order of preference, skipping everything the
 * run has already spent, in this order:
 * 1. 優勝: her elated bust, else her biggest joy on film (a hitter's arms-up, a pitcher's K).
 * 2. A pitcher's done panel: a clean action still (the K, then the follow-through), a crushed
 *    bust when she missed; Sol, who has no clean still yet, stands on her focused bust.
 * 3. The Live or the Bow: her bust under the lights, never the scene's.
 * 4. The postgame: the night's mood bust, then a calm one, then a film.
 * 5. The scrapbook's first polaroid gives way to its next picture when the run just showed it.
 * 1 and 2 never depend on her rank (they play before the rank is settled), so they skip the
 * scene's busts for every rank.
 *
 * When a girl's art runs out (ENDING_ART_SHORT), a screen falls back to its first mood-right
 * choice that isn't on a neighbouring screen: a repeat, never a wrong face and never twice in a row.
 * Two file names for one picture (bible SAME_ART) count as one.
 *
 * Until §9.2's stage art lands (LIVE_STAGE_ART_READY), the Live is her bust on a stage-lit plate
 * (warm spotlights over the Finale's plate, in CSS), never the done panel's action still again.
 */
import { artKey, endingFilmSrc, FINALE_PARK_PLATE, isBustSrc, isPitcherStyle, parkSrc, sceneBustSrc, sceneFilmSrc, sheet, stillSrc } from "./bible.ts";
import { curtainFilmSrc, shouldCurtainCall } from "./culture.ts";
import { endingStage, LIVE_STAGE_ART_READY, type EndingStage } from "./ending.ts";
import { framedBust } from "./scene-frame.ts";
import { avoidOnFirstPage, type BookEntry, type BookPicture } from "./scrapbook.ts";
import { endingScene } from "./story-endings.ts";
import type { CharacterId, EndingRank } from "./types.ts";

type BustMood = "elated" | "focused" | "crushed" | "neutral";

/** One picture choice: an action still (film), or her bust over a plate. */
export type EndingPicture = { kind: "film"; src: string } | { kind: "bust"; src: string; mood: BustMood; plate: string; lit: boolean };

export type EndingScreen = "win" | "done" | "curtain" | "postgame" | "scene" | "stage" | "scrapbook";

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

/**
 * Girls whose art can't fill the run without a repeat until the art brief lands (§10.2, §11.4).
 * The run needs eight pictures of her (seven screens, the scene's two busts).
 * - Sol has no clean painted still: four busts.
 * - Reina's set, release and neutral bust wear the old mark, and her k and walk stills are her
 *   follow-through: five pictures.
 * - Kira's k and walk are her follow-through and her neutral bust is her focused one: seven.
 * The hitters have fifteen stills each and never repeat.
 */
export const ENDING_ART_SHORT: readonly CharacterId[] = ["sol", "reina", "kira"];

/** The ranks a played Finale can end on. */
const FINALE_RANKS: readonly EndingRank[] = ["S", "A", "B", "never-quit"];

function bust(id: CharacterId, mood: BustMood, plate: string = FINALE_PARK_PLATE, lit = false): EndingPicture {
  return { kind: "bust", src: sceneBustSrc(id, mood), mood, plate, lit };
}

function film(src: string): EndingPicture {
  return { kind: "film", src };
}

/** A picture path as the screen draws it: a cut-out bust stands on a plate, a painted still is its own backdrop. */
function asPicture(src: string, mood: BustMood, plate: string = FINALE_PARK_PLATE, lit = false): EndingPicture {
  return isBustSrc(src) ? { kind: "bust", src, mood, plate, lit } : film(src);
}

/** Her still for a pose (a clean stand-in when it's off-model), or her bust when she has none. */
function still(id: CharacterId, pose: string, mood: BustMood, plate: string = FINALE_PARK_PLATE): EndingPicture {
  return asPicture(stillSrc(id, pose, mood), mood, plate);
}

/**
 * The first candidate the run hasn't spent (`avoid`), skipping the `rather` ones too when it can
 * (a picture that could still give way, like the scrapbook's first polaroid); when every one is
 * spent, the first (mood-right) one that isn't on a neighbouring screen (`near`), else the first.
 */
function pick(
  candidates: EndingPicture[],
  avoid: readonly string[],
  rather: readonly string[] = [],
  near: readonly string[] = [],
  /** Only to keep off a neighbouring screen, when every candidate is on one. */
  lastResort: EndingPicture[] = [],
): EndingPicture {
  // Two names for one file are one picture (bible SAME_ART).
  const has = (list: readonly string[], c: EndingPicture) => list.some((s) => artKey(s) === artKey(c.src));
  return (
    candidates.find((c) => !has(avoid, c) && !has(rather, c)) ??
    candidates.find((c) => !has(avoid, c)) ??
    [...candidates, ...lastResort].find((c) => !has(near, c)) ??
    candidates[0]!
  );
}

function pitcherOf(id: CharacterId): boolean {
  return isPitcherStyle(sheet(id).style);
}

/**
 * A hitter's Finale done panel, as it settles (ShineRace): her painted celebrate still when she
 * got it, crushed when she didn't; ShineRace never settles a met Finale on the trot, which is
 * the curtain's. A pitcher's is `finaleDonePicture`.
 */
export function finaleDoneSrcs(id: CharacterId, met: boolean, teamWon = met): string[] {
  if (pitcherOf(id)) return [finaleDonePicture(id, met, teamWon).src];
  return [`/art/action/${id}/${met ? "celebrate" : "crushed"}.webp`];
}

/** The curtain call's still, when the Finale earns one (her ask met). */
export function finaleCurtainSrc(id: CharacterId, met: boolean): string | null {
  return shouldCurtainCall("finale", met) ? curtainFilmSrc(id) : null;
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

/** The ending scene's busts for every rank a played Finale can end on (the rank isn't settled at the done panel). */
function sceneBustsAnyRank(id: CharacterId): string[] {
  return [...new Set(FINALE_RANKS.flatMap((r) => [endingSceneOpenSrc(id, r), endingSceneSrc(id, r)]))];
}

/** What the run holds back before the 優勝 moment and the done panel choose. */
function fixedBeforeRank(id: CharacterId, met: boolean): string[] {
  const curtain = finaleCurtainSrc(id, met);
  return [...sceneBustsAnyRank(id), ...(curtain ? [curtain] : []), ...(pitcherOf(id) ? [] : finaleDoneSrcs(id, met))];
}

/**
 * The 優勝 moment's picture (a won Finale, over the done panel): her elated bust on the Finale's
 * plate, unless the ending scene holds it, then her biggest joy on film.
 */
export function finaleWinPicture(id: CharacterId, met: boolean): EndingPicture {
  const candidates = pitcherOf(id)
    ? [bust(id, "elated"), still(id, "k", "elated"), still(id, "follow", "elated"), still(id, "windup", "elated")]
    : [bust(id, "elated"), film(`/art/action/${id}/hr.webp`), film(`/art/action/${id}/celebrate.webp`), film(`/art/action/${id}/trot.webp`)];
  return pick(candidates, fixedBeforeRank(id, met));
}

/**
 * A pitcher's Finale done panel: a clean action still when she got it (the K, then the
 * follow-through, which the curtain may hold), her crushed bust when she didn't. Never the 優勝
 * moment's picture, which played over it. A hitter's is fixed (`finaleDoneSrcs`).
 */
export function finaleDonePicture(id: CharacterId, met: boolean, teamWon: boolean): EndingPicture {
  if (!pitcherOf(id)) return film(finaleDoneSrcs(id, met)[0]!);
  const avoid = [...fixedBeforeRank(id, met), ...(teamWon ? [finaleWinPicture(id, met).src] : [])];
  const candidates = met
    ? [still(id, "k", "focused"), still(id, "follow", "focused"), still(id, "windup", "focused"), still(id, "release", "focused"), bust(id, "focused")]
    : [bust(id, "crushed"), still(id, "windup", "crushed"), bust(id, "focused")];
  // The 優勝 moment plays over it and the curtain follows it: never theirs, even when her art runs out.
  const curtain = finaleCurtainSrc(id, met);
  return pick(candidates, avoid, [], [...(teamWon ? [finaleWinPicture(id, met).src] : []), ...(curtain ? [curtain] : [])]);
}

/**
 * The Finale's postgame: her face over the Finale's plate, in the mood of the night (elated
 * when her side won it, composed when she got what she came for and they lost, crushed when
 * neither), then a calm bust, then a film; never a picture the run has spent (`avoid`).
 */
export function finalePostgamePicture(
  id: CharacterId,
  met: boolean,
  teamWon: boolean,
  before: readonly string[],
  after: readonly string[] = [],
  rather: readonly string[] = [],
  near: readonly string[] = [],
): EndingPicture {
  const mood: BustMood = teamWon ? "elated" : met ? "focused" : "crushed";
  const pitcher = pitcherOf(id);
  const films =
    mood === "crushed"
      ? pitcher
        ? [still(id, "windup", "crushed"), still(id, "set", "crushed"), still(id, "walk", "crushed")]
        : [asPicture(sceneFilmSrc(id, "crushed"), "crushed"), film(`/art/action/${id}/take.webp`)]
      : pitcher
        ? [still(id, "follow", mood), still(id, "k", mood), still(id, "windup", mood), still(id, "release", mood), still(id, "set", mood)]
        : [asPicture(sceneFilmSrc(id, "elated"), mood), film(`/art/action/${id}/trot.webp`), film(`/art/action/${id}/contact.webp`), film(`/art/action/${id}/load.webp`)];
  const busts =
    mood === "elated"
      ? [bust(id, "elated"), bust(id, "neutral"), bust(id, "focused")]
      : mood === "focused"
        ? [bust(id, "focused"), bust(id, "neutral")]
        : [bust(id, "crushed"), bust(id, "focused"), bust(id, "neutral")];
  return pick([...busts, ...films], [...before, ...after], rather, near);
}

/** Her Live bust: elated, except Reina, whose elated bust wears the old mark (the wall's rule). */
function liveMood(id: CharacterId): BustMood {
  return id === "reina" ? "focused" : "elated";
}

/**
 * The Winning Live's or the Last Bow's picture. The Live: her stage still once §9.2 lands;
 * until then her bust on the stage-lit Finale plate, then her elated still, then the curtain's.
 * The Last Bow: her composed bust on the Finale's plate, then the curtain's still (a career that
 * closed early keeps its own still first). Never a picture in `before`/`after`.
 */
export function endingStagePicture(opts: {
  id: CharacterId;
  rank: EndingRank;
  stage: EndingStage;
  before: readonly string[];
  after?: readonly string[];
  /** Pictures to skip when there's another choice (the scrapbook's first polaroid, which can give way). */
  rather?: readonly string[];
  /** The neighbouring screens' pictures: never these, even when her art runs out. */
  near?: readonly string[];
  /** Her Finale ask was met (the Bow then never falls back to her crushed bust). */
  met?: boolean;
}): EndingPicture {
  const { id, rank, stage } = opts;
  const avoid = [...opts.before, ...(opts.after ?? [])];
  const rather = opts.rather ?? [];
  const near = opts.near ?? [];
  const home = parkSrc(sheet(id).parkId);
  if (stage === "live") {
    if (LIVE_STAGE_ART_READY) return film(`/art/action/${id}/live.webp`);
    // Always her bust under the lights first; an action still only when every bust is taken.
    const lit = (mood: BustMood) => bust(id, mood, FINALE_PARK_PLATE, true);
    return pick(
      [
        lit(liveMood(id)),
        lit("neutral"),
        lit(liveMood(id) === "focused" ? "elated" : "focused"),
        asPicture(curtainFilmSrc(id), "neutral", FINALE_PARK_PLATE, true),
        asPicture(sceneFilmSrc(id, "elated"), "neutral", FINALE_PARK_PLATE, true),
        // Her other big stills, when the run has spent every bust and the curtain's.
        ...(pitcherOf(id)
          ? [still(id, "windup", "elated"), still(id, "release", "elated"), still(id, "set", "elated")]
          : [film(`/art/action/${id}/hr.webp`), film(`/art/action/${id}/contact.webp`), film(`/art/action/${id}/follow.webp`)]),
      ],
      avoid,
      rather,
      near,
    );
  }
  if (rank === "C" || rank === "D") return pick([asPicture(endingFilmSrc(id, rank), "crushed", home), bust(id, "focused", home), bust(id, "neutral", home)], avoid, rather, near);
  // The Bow is still the Finale's night: her bust on its painted plate, unlit.
  return pick(
    [
      bust(id, "focused"),
      asPicture(curtainFilmSrc(id), "neutral"),
      bust(id, "neutral"),
      asPicture(sceneFilmSrc(id, "focused"), "focused"),
      asPicture(endingFilmSrc(id, rank), "focused"),
      // A girl who got what she came for doesn't bow with a crushed face (unless it's that or twice in a row).
      ...(opts.met ? [] : [bust(id, "crushed")]),
    ],
    avoid,
    rather,
    near,
    opts.met ? [bust(id, "crushed")] : [],
  );
}

/** Every picture of her an EndingPicture shows. */
export function pictureSrcs(p: EndingPicture): string[] {
  return [p.src];
}

/** The whole ending, screen by screen, for a career that played the Finale. */
export interface FinaleEnding {
  win: EndingPicture | null;
  done: EndingPicture;
  curtain: string | null;
  postgame: EndingPicture;
  sceneOpen: string;
  sceneLast: string;
  stage: EndingPicture;
  /** The book as the ending opens it (its first polaroid moved off the run's pictures), when given one. */
  book: BookEntry[] | null;
  /** The scrapbook's first polaroid picture, or null when the book opens on a note. */
  firstPage: BookPicture | string | null;
  shots: EndingShot[];
}

/**
 * The picture budget for the whole ending. `book` is her scrapbook (its first polaroid may give
 * way); `firstPage` pins a first polaroid instead (a picture that won't give way).
 */
export function finaleEnding(opts: {
  id: CharacterId;
  met: boolean;
  teamWon: boolean;
  rank: EndingRank;
  stage?: EndingStage;
  book?: readonly BookEntry[] | null;
  firstPage?: string | null;
}): FinaleEnding {
  const { id, met, teamWon, rank } = opts;
  const stage = opts.stage ?? endingStage(rank, teamWon);
  const win = teamWon ? finaleWinPicture(id, met) : null;
  const done = pitcherOf(id) ? finaleDonePicture(id, met, teamWon) : film(finaleDoneSrcs(id, met)[0]!);
  const curtain = finaleCurtainSrc(id, met);
  const sceneOpen = endingSceneOpenSrc(id, rank);
  const sceneLast = endingSceneSrc(id, rank);
  const bookFirst = opts.book ? firstPolaroidSrc(opts.book) : (opts.firstPage ?? null);
  const spent = [...(win ? [win.src] : []), done.src, ...(curtain ? [curtain] : []), sceneOpen, sceneLast];
  // The stage before the postgame: the Live's lit bust is worth more than the postgame's.
  // A book's first polaroid can give way, so the screens only rather not take it; a pinned one can't.
  const first = bookFirst ? [bookFirst] : [];
  const [hard, soft] = opts.book ? [[], first] : [first, []];
  // Her lit bust at the Live outranks the book's first polaroid, which can give way after it.
  const stagePic = endingStagePicture({ id, rank, stage, before: spent, after: hard, near: [sceneLast, ...hard], met });
  const postgame = finalePostgamePicture(id, met, teamWon, [...spent, stagePic.src], hard, soft, [curtain ?? done.src, sceneOpen]);
  const run = [...spent, postgame.src, stagePic.src];
  let book: BookEntry[] | null = null;
  let firstPage: BookPicture | string | null = opts.firstPage ?? null;
  if (opts.book) {
    book = avoidOnFirstPage(id, opts.book, run, [stagePic.src]);
    const first = book.find((e) => e.kind === "page");
    firstPage = first?.kind === "page" ? first.page.picture : null;
  }
  const firstSrc = typeof firstPage === "string" ? firstPage : (firstPage?.src ?? null);
  const shots: EndingShot[] = [];
  if (win) shots.push({ screen: "win", srcs: [win.src] });
  shots.push({ screen: "done", srcs: [done.src] });
  if (curtain) shots.push({ screen: "curtain", srcs: [curtain] });
  shots.push({ screen: "postgame", srcs: pictureSrcs(postgame) });
  // The scene opens on one bust and closes on another.
  shots.push({ screen: "scene", srcs: [sceneOpen], last: [sceneLast] });
  shots.push({ screen: "stage", srcs: pictureSrcs(stagePic) });
  if (firstSrc) shots.push({ screen: "scrapbook", srcs: [firstSrc] });
  return { win, done, curtain, postgame, sceneOpen, sceneLast, stage: stagePic, book, firstPage, shots };
}

/**
 * The whole run of ending screens for a career that played the Finale: what each one shows,
 * in order. `firstPage` is the scrapbook's first polaroid (pinned); `book` lets it give way.
 */
export function endingPictureRun(opts: {
  id: CharacterId;
  met: boolean;
  teamWon: boolean;
  rank: EndingRank;
  stage?: EndingStage;
  firstPage?: string | null;
  book?: readonly BookEntry[] | null;
}): EndingShot[] {
  return finaleEnding(opts).shots;
}

/** The scrapbook's first polaroid picture, or null when the book opens on a note (or is empty). */
export function firstPolaroidSrc(entries: readonly BookEntry[]): string | null {
  const first = entries.find((e) => e.kind === "page");
  return first?.kind === "page" ? first.page.picture.src : null;
}

/** The first pair of neighbouring screens that share a picture (two names for one file count as one), or null when none do. */
export function repeatedPicture(shots: readonly EndingShot[]): [EndingScreen, EndingScreen, string] | null {
  for (let i = 1; i < shots.length; i++) {
    const prev = shots[i - 1]!;
    const shared = shots[i]!.srcs.find((s) => (prev.last ?? prev.srcs).some((p) => artKey(p) === artKey(s)));
    if (shared) return [shots[i - 1]!.screen, shots[i]!.screen, shared];
  }
  return null;
}

/**
 * Every picture the run shows more than once, anywhere in it (two names for one file count as
 * one; a scene that opens and closes on the same bust shows it once).
 */
export function repeatsInRun(shots: readonly EndingShot[]): string[] {
  const seen = new Set<string>();
  const twice = new Set<string>();
  for (const s of shots) {
    for (const src of new Set([...s.srcs, ...(s.last ?? [])].map(artKey))) {
      if (seen.has(src)) twice.add(src);
      seen.add(src);
    }
  }
  return [...twice];
}
