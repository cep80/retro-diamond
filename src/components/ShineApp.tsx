"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { PixelBtn } from "@/components/pixel-btn";
import { ShineMute } from "@/components/ShineMute";
import { ROUND_ICON_PATHS, ShineBack, ShineRoundBtn } from "@/components/ShineRoundBtn";
import {
  careerMuteAppliesToScreen,
  playScreenMusic,
  screenMusicKey,
  setMasterMuted,
  setMix,
  sfxCowbell,
  sfxGain,
  sfxSelect,
  sfxStamp,
  sfxTitleSting,
  stopMusic,
  unlockAudio,
  type ScreenMusic,
} from "@/shine/audio.ts";
import { ShineHelp, ShineSettings } from "@/components/ShineSettings";
import { nextNamedBeat, nextDateLine, turnMeta, dateLabel, daysAwayLabel, yearOf, PLATE_TURNS, FINALE_POSTGAME } from "@/shine/calendar.ts";
import { BIBLE, careerFilmSrc, endingClipSrc, endingFilmSrc, isPitcherStyle, parkSrc, sceneBustSrc, sceneFilmSrc, sheet, yearStillLine, type PortraitMood } from "@/shine/bible.ts";
import { NEVER_SOLD, SKUS, cosmeticClasses, previewClaimable } from "@/shine/commerce.ts";
import { kitAccent } from "@/shine/stage.ts";
import {
  cheerLines,
  CURTAIN_STAMP,
  curtainCallLine,
  curtainCaption,
  curtainFilmSrc,
  curtainSkin,
  datePark,
  dateSpeech,
  endingRankLabel,
  fanLetter,
  postgamePicture,
  shouldCurtainCall,
  yearCard,
} from "@/shine/culture.ts";
import { doneStamp, postgameFiller } from "@/components/race-ui";
import { ShineComplexWork, YearGrades, markSpring } from "./ShineComplexWork";
import {
  careerStill,
  cardAltLook,
  cardBanner,
  endingRank,
  endingStageCta,
  endingStageLabel,
  nextGirlId,
  nextGirlName,
  parentEligible,
  pickInheritSparks,
  postgameLeaveLabel,
  rankReveal,
  rankTone,
  runEndingStage,
  seriesFinaleLine,
  sparkEffectLine,
  sparkGapLine,
  sparkSummary,
  wallCardPicture,
  yearFoldLine,
} from "@/shine/ending.ts";
import { coachWarningTone, PG_INDEX } from "@/shine/run.ts";
import { ShineExhibition, ShinePlate } from "./ShineRace";
import { loadActionManifest, warmActionExhibition } from "./action/action-manifest";
import { filmReady, type ActionManifest } from "@/shine/action-art.ts";
import { MOOD_LABELS, moodLevel } from "@/shine/training.ts";
import { useShine } from "@/shine/store.ts";
import { finaleEveScene, promiseScene, TITLE_LINES, type SceneLike } from "@/shine/story.ts";
import { lowPointScene, rivalIntro, RIVAL_KINDS, type RivalKind } from "@/shine/story-arcs.ts";
import { cappedEffect, effectChips, eventChip, eventDue, eventKey, type EventChoice, type TrainingEvent } from "@/shine/training-events.ts";
import { EVENT_LIBRARY } from "@/shine/training-events-library.ts";
import { endingChip, endingScene, endingTier } from "@/shine/story-endings.ts";
import { endingSceneOpenSrc, endingSceneSrc, endingStagePicture, finaleDoneSrcs, finalePostgamePicture, firstPolaroidSrc } from "@/shine/ending-pictures.ts";

function isRivalKind(t: string | null): t is RivalKind {
  return t !== null && (RIVAL_KINDS as readonly string[]).includes(t);
}
import { ScenePlayer } from "./ScenePlayer";
import { catchWithCoachScene, memoryLine, relationshipScene, type RelationshipScene } from "@/shine/relationship.ts";
import { keepsakeWallLine, letterPage, replayLines, scrapbookBook } from "@/shine/scrapbook.ts";
import type { CharacterId, DefiningPa, Highlight, Spark } from "@/shine/types.ts";

/** A layout effect in the browser; the server render has no layout to wait for. */
const useScreenLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

type TitleIcon = "exhibition" | "clubhouse" | "shop" | "settings";

/** Line icons for the title's four side doors; stroke follows the label colour. */
const TITLE_ICON_PATHS: Record<TitleIcon, ReactNode> = {
  // A ball with its two seams.
  exhibition: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M7.6 5.3c1.5 1.8 2.3 4.1 2.3 6.7s-.8 4.9-2.3 6.7M16.4 5.3c-1.5 1.8-2.3 4.1-2.3 6.7s.8 4.9 2.3 6.7" />
    </>
  ),
  clubhouse: (
    <>
      <path d="M3.5 11 12 4l8.5 7" />
      <path d="M6 9.5V20h12V9.5M10 20v-5h4v5" />
    </>
  ),
  shop: (
    <>
      <path d="M5 8.5h14l-1.1 11.5H6.1L5 8.5z" />
      <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" />
    </>
  ),
  // The same sliders as the round Settings button in every header.
  settings: ROUND_ICON_PATHS.settings,
};

function TitleIconButton({ icon, label, count = 0, onClick }: { icon: TitleIcon; label: string; count?: number; onClick: () => void }) {
  return (
    <button type="button" className="shine-title-door" onClick={onClick} aria-label={count > 0 ? `${label}, ${count}` : label}>
      <span className="shine-title-door-icon">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {TITLE_ICON_PATHS[icon]}
        </svg>
        {count > 0 ? (
          <span className="shine-title-door-count" aria-hidden>
            {count}
          </span>
        ) : null}
      </span>
      <span className="shine-title-door-label" aria-hidden>
        {label}
      </span>
    </button>
  );
}

/** Set once the player taps to start; the title skips the gate for the rest of the session. */
let titleStarted = false;

/** The title's bed: the lantern field, shared with Select and her promise scene. */
const TITLE_MUSIC: ScreenMusic = { kind: "title" };

function Title() {
  const run = useShine((s) => s.run);
  const clubhouse = useShine((s) => s.clubhouse);
  const openSelect = useShine((s) => s.openSelect);
  const openShop = useShine((s) => s.openShop);
  const openWall = useShine((s) => s.openWall);
  const openExhibition = useShine((s) => s.openExhibition);
  const continueRun = useShine((s) => s.continueRun);
  const openSettings = useShine((s) => s.openSettings);
  const nextHook = sparkGapLine(clubhouse);
  const [endYear, setEndYear] = useState(false);
  // Tap to start: the tap is the gesture that lets the sound play at all. Once per session;
  // coming back from the Shop or the Clubhouse goes straight to the menu, no second sting.
  const [started, setStarted] = useState(() => titleStarted);
  // The title belongs to whoever is next: her if a year is running, else the girl the
  // Clubhouse hook names (Select opens on her too), else Aoi for a first-time player.
  const lastCard = clubhouse.at(-1)?.characterId;
  const girl: CharacterId = run?.characterId ?? (lastCard ? nextGirlId(lastCard) : "aoi");
  const who = sheet(girl);
  // The key art is Aoi; anyone else stands in her own painted still, so her line never sits under another girl's face.
  const art = girl === "aoi" ? "/bg/diamond-shine-hero.png" : careerFilmSrc(girl);

  // The lantern bed (check-in 27, N9). It keeps playing into Select and her promise scene, which
  // ask for the same cue, so it starts once; every other door out of the title stops it (`go`).
  useEffect(() => {
    warmActionExhibition();
    if (titleStarted) playScreenMusic(TITLE_MUSIC);
  }, []);

  const start = () => {
    if (started) return;
    unlockAudio();
    sfxTitleSting();
    playScreenMusic(TITLE_MUSIC);
    titleStarted = true;
    setStarted(true);
  };

  useEffect(() => {
    if (started) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        start();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const go = (fn: () => void, keepBed = false) => () => {
    sfxSelect();
    if (!keepBed) stopMusic();
    fn();
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-ink text-cream" style={{ ["--shine-accent" as string]: kitAccent(girl) }}>
      {/* On a wide screen the portrait art stands whole at the right; this blurred copy fills the rest. Phones never show it. */}
      <img src={art} alt="" className="shine-title-fill" aria-hidden />
      <img src={art} alt="" className={`shine-title-art ${started ? "" : "shine-title-breathe"}`} data-art={girl === "aoi" ? "key" : "still"} />
      <div className="shine-title-wash absolute inset-0" />
      {started ? (
        <div className="shine-title-corner">
          <ShineMute />
        </div>
      ) : null}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-end px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-14 sm:px-10 lg:justify-center">
        <p className="episode-chip w-fit">ダイヤシャイン</p>
        <h1 className="anime-logo shine-title-logo mt-6 max-w-2xl">
          <span>Diamond</span>
          <strong>Shine</strong>
        </h1>
        {!started ? (
          <button type="button" className="shine-title-tap mt-10" onClick={start} data-title-tap>
            Tap to start
          </button>
        ) : (
          <div className="shine-title-menu-in mt-5 flex w-full max-w-sm flex-col gap-3">
            {/* Her face already fills the screen, so her line sits on the art like a subtitle. */}
            <p className="shine-title-sub">
              <span className="shine-title-sub-name">{who.jp}</span>
              {TITLE_LINES[girl]}
            </p>
            {nextHook ? <p className="shine-title-hook">{nextHook}</p> : null}
            {run ? (
              <PixelBtn className="min-h-14 justify-between px-5 py-2.5 text-sm" onClick={go(continueRun)}>
                {run.clubhouseCard ? `${who.name} · The year is over` : `Continue ${who.name} · Day ${run.turn}`}
                <span aria-hidden>→</span>
              </PixelBtn>
            ) : (
              // Her line above says who she is; the door says what the year is.
              <PixelBtn className="min-h-14 justify-between px-5 py-2.5 text-sm" onClick={go(openSelect, true)}>
                <span className="flex flex-col items-start gap-1 text-left">
                  Begin her year
                  <span className="font-ui text-[11px] font-medium normal-case tracking-normal text-ink/70">Pick a girl. Coach her three years.</span>
                </span>
                <span aria-hidden>→</span>
              </PixelBtn>
            )}
            <nav className="shine-title-dock" aria-label="More">
              <TitleIconButton icon="exhibition" label="Exhibition" onClick={go(openExhibition)} />
              <TitleIconButton icon="clubhouse" label="Clubhouse" count={clubhouse.length} onClick={go(openWall)} />
              <TitleIconButton icon="shop" label="Shop" onClick={go(openShop)} />
              <TitleIconButton
                icon="settings"
                label="Settings"
                onClick={() => {
                  sfxSelect();
                  openSettings();
                }}
              />
            </nav>
            {run && !run.clubhouseCard ? (
              endYear ? (
                <button type="button" className="shine-title-end is-armed" onClick={go(openSelect, true)}>
                  This year ends here. Start a new one?
                </button>
              ) : (
                <button
                  type="button"
                  className="shine-title-end"
                  onClick={() => {
                    // The confirm step lands in the same spot: re-arm the guard so a double tap can't skip it.
                    useShine.getState().bumpView();
                    setEndYear(true);
                  }}
                >
                  New Rookie year
                </button>
              )
            ) : run?.clubhouseCard ? (
              <button type="button" className="shine-title-end" onClick={go(openSelect, true)}>
                New Rookie year
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

/** A tap on an empty Clubhouse frame opens Select on her. Select reads it once, on its first render. */
let wallPick: CharacterId | null = null;

function Wall() {
  const clubhouse = useShine((s) => s.clubhouse);
  const run = useShine((s) => s.run);
  const openTitle = useShine((s) => s.openTitle);
  const openSelect = useShine((s) => s.openSelect);
  const nextHook = sparkGapLine(clubhouse);
  const liveQuote = run?.clubhouseCard ? careerStill(run).quote : null;
  // Six frames, one for each of them: a card once her career is done, an empty frame until then.
  const coached = new Set(clubhouse.map((c) => c.characterId));
  const waiting = BIBLE.filter((c) => !coached.has(c.id));
  const lastCard = clubhouse.at(-1)?.characterId;
  const nextUp: CharacterId = lastCard ? nextGirlId(lastCard) : "aoi";
  const frames = (
    <ul className="shine-wall-frames is-waiting">
      {waiting.map((c) => (
        <li key={c.id}>
          <button
            type="button"
            className={`shine-wall-frame ${c.id === nextUp ? "is-next" : ""}`}
            style={{ ["--face-accent" as string]: kitAccent(c.id) }}
            aria-label={`Coach ${c.name}`}
            onClick={() => {
              sfxSelect();
              wallPick = c.id;
              openSelect();
            }}
          >
            <img src={sceneBustSrc(c.id, "neutral")} alt="" onError={(e) => fallBackTo(e.currentTarget, careerFilmSrc(c.id))} />
            <span className="shine-wall-frame-tag">
              <span className="shine-kana">{c.jp}</span>
              {c.name}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
  return (
    <main className="shine-stage shine-wall text-cream">
      <div className="shine-backdrop" aria-hidden>
        <img src="/bg/park-koi.jpg" alt="" className="shine-scene-plate" />
        <div className="shine-stage-wash absolute inset-0" />
        <div className="shine-keylight" />
      </div>
      <div className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-8">
        <div className="flex items-center gap-3">
          <ShineBack onClick={openTitle} />
          <p className="episode-chip w-fit">ダイヤシャイン</p>
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold">Clubhouse</h1>
        <p className="mt-2 max-w-lg font-ui text-sm text-cream/80">
          Every girl you coach to the end gets a card on the wall. What she learned stays with her. Everything else starts over. None of it is for sale.
        </p>
        {nextHook ? (
          <p className="mt-4 rounded-xl border border-gold/40 bg-ink/70 px-4 py-3 font-ui text-sm text-gold">{nextHook}</p>
        ) : null}
        {clubhouse.length === 0 ? (
          <>
            <p className="mt-6 font-ui text-sm text-muted">No cards yet. Finish a Rookie year.</p>
            {/* The wall already has a frame for each of them, dimmed until her year is done. */}
            {frames}
          </>
        ) : (
          <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {clubhouse.map((c) => {
              const who = sheet(c.characterId);
              const pic = wallCardPicture(c.characterId);
              const rank = endingRankLabel(c.ending);
              const keepsake = keepsakeWallLine(c.characterId, c.keepsake);
              const passes = sparkSummary(c.sparks);
              return (
                <article
                  key={c.id}
                  className={`shine-clubhouse-card shine-wall-card is-rank-${rankTone(c.ending)} club-nav-tile overflow-hidden px-0 py-0 ${
                    c.ending === "S" || c.ending === "A" ? "shine-dohage-card" : c.ending === "never-quit" ? "shine-never-quit" : ""
                  }`}
                  data-rank={c.ending}
                >
                  <div className="relative bg-ink/90 px-4 pb-3 pt-4">
                    <p className="shine-wall-card-rank font-display text-[10px] uppercase tracking-widest">{rank}</p>
                    <p className="shine-kana text-sm text-gold">{who.jp}</p>
                    {/* Her face, never her back: a hitter's celebrate still, a pitcher's bust on her home park. */}
                    <div className={`shine-wall-card-photo ${cardAltLook(c) ? "shine-alt-look" : ""}`} data-clubhouse-film={c.characterId}>
                      {pic.kind === "bust" ? (
                        <>
                          <img src={parkSrc(who.parkId)} alt="" className="shine-wall-card-plate" />
                          <img src={sceneBustSrc(c.characterId, pic.mood)} alt="" className="shine-wall-card-bust" onError={(e) => fallBackTo(e.currentTarget, endingFilmSrc(c.characterId, c.ending))} />
                        </>
                      ) : (
                        <img src={pic.src} alt="" className="shine-wall-card-film" onError={(e) => fallBackTo(e.currentTarget, endingFilmSrc(c.characterId, c.ending))} />
                      )}
                    </div>
                    <p className="mt-3 font-display text-sm font-bold uppercase tracking-wide">
                      #{who.number} {who.name}
                    </p>
                    <p className="mt-1 font-ui text-xs text-muted">
                      Her rival: {sheet(who.rival).name}
                    </p>
                    {cardBanner(c) ? (
                      <p className="mt-1 font-ui text-xs text-gold">Park banner · #{who.number}</p>
                    ) : null}
                    {cardAltLook(c) ? (
                      <p className="mt-1 font-ui text-xs text-gold">The kids at the gate are wearing her number now.</p>
                    ) : null}
                    {keepsake ? <p className="mt-1 font-ui text-xs text-cream/70">{keepsake}</p> : null}
                    <p className="mt-2 font-ui text-sm leading-relaxed text-cream/85">
                      {run?.clubhouseCard?.id === c.id && liveQuote ? liveQuote : c.quote}
                    </p>
                  </div>
                  <div className="border-t border-white/10 bg-panel/80 px-4 py-3">
                    <p className="font-display text-[10px] uppercase tracking-widest text-muted">What she passes on</p>
                    <p className="mt-1 font-ui text-xs text-gold">{passes || "Nothing yet"}</p>
                  </div>
                </article>
              );
            })}
          </div>
          {waiting.length ? (
            <>
              {/* The girls not coached yet wait in their frames, dimmed. A tap opens her Rookie year. */}
              <p className="mt-6 font-display text-[10px] uppercase tracking-widest text-muted">Waiting on the wall</p>
              {frames}
            </>
          ) : null}
          </>
        )}
      </div>
      {clubhouse.length > 0 ? (
        <GoDock>
          <GoButton
            onClick={() => {
              sfxSelect();
              wallPick = nextUp;
              openSelect();
            }}
          >
            {`Coach ${sheet(nextUp).name} next`}
          </GoButton>
        </GoDock>
      ) : null}
    </main>
  );
}

function Shop() {
  const openTitle = useShine((s) => s.openTitle);
  const claimSku = useShine((s) => s.claimSku);
  const owned = useShine((s) => s.ownedCosmetics);
  const [note, setNote] = useState<string | null>(null);
  return (
    <main className="relative min-h-dvh overflow-hidden bg-ink text-cream">
      <div className="title-wash absolute inset-0" />
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <div className="flex items-center gap-3">
          <ShineBack onClick={openTitle} />
          <p className="episode-chip w-fit">ダイヤシャイン</p>
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold">Shop</h1>
        <p className="mt-2 max-w-lg font-ui text-sm text-cream/80">
          Looks only. The prices are the list. This preview does not charge. No banners. No pull rates. Her years, her games, and the Clubhouse are never for sale.
        </p>
        <ul className="mt-6 space-y-3">
          {SKUS.filter((s) => previewClaimable(s)).map((s) => (
            <li key={s.id} className="club-nav-tile px-4 py-3">
              <p className="font-display text-xs font-bold uppercase tracking-wide">
                {s.name} · ${s.usd.toFixed(2)}
              </p>
              <p className="mt-1 font-ui text-sm text-muted">{s.blurb}</p>
              <PixelBtn
                variant="ghost"
                className="mt-3 h-10"
                onClick={() => {
                  sfxSelect();
                  claimSku(s.id);
                  setNote(useShine.getState().lastLine);
                }}
              >
                {owned.includes(s.id) ? "On" : "Preview"}
              </PixelBtn>
            </li>
          ))}
        </ul>
        {note ? <p className="mt-4 font-ui text-sm text-grass-2">{note}</p> : null}
        <p className="mt-6 font-display text-[10px] uppercase tracking-widest text-gold">Never sold</p>
        <p className="mt-2 font-ui text-sm text-cream/80">{NEVER_SOLD.join(" · ")}</p>
      </div>
    </main>
  );
}

/**
 * What she says the first time you look at her, and one line about her the way
 * a teammate would put it. No goals and no numbers: those come in her year.
 */
const MEET: Record<CharacterId, { line: string; lore: string }> = {
  aoi: {
    line: "I run out every ground ball. Even the easy outs. Mom says I don't have to. …I do.",
    lore: "Koi Park's lead-off. Her mom runs the okonomiyaki shop by the gate.",
  },
  reina: {
    line: "I put every pitch where I say it'll go. When I miss, I want to know by how much.",
    lore: "Koi Park's ace. She has never once walked a batter.",
  },
  miki: {
    line: "I hit it foul until the pitcher gives up. I'm annoying like that. Coaches think so too. So. Hi.",
    lore: "North Field's toughest out. Two melon pan in her bag, always. In case.",
  },
  sol: {
    line: "I throw hard, Jefe. People clap. That's the whole story. Don't ask about the rest.",
    lore: "The Dusters' ace. Her big sister taught her three more pitches. She won't throw them where anyone can see.",
  },
  kira: {
    line: "Here's the deal, Partner. You get me a lead, I get you three outs. Then I'm out the door. Deal?",
    lore: "Stars Park's closer. Two taps on the bullpen door, then the ninth. Gone by the last bus.",
  },
  yuki: {
    line: "Everybody says wait. Wait for the pitch, wait for the sign, wait for— no. I don't wait.",
    lore: "The Palms' base stealer. First one at the park, every single morning.",
  },
};

/** A missing bust falls back once to her plate still, never to a broken image. */
function fallBackTo(img: HTMLImageElement, src: string) {
  if (img.dataset.fallback) return;
  img.dataset.fallback = "true";
  img.src = src;
}

function Select() {
  const startRun = useShine((s) => s.startRun);
  const openTitle = useShine((s) => s.openTitle);
  const importCarry = useShine((s) => s.importCarry);
  const clubhouse = useShine((s) => s.clubhouse);
  const [pick, setPick] = useState<CharacterId>(() => {
    if (wallPick) return wallPick;
    const last = clubhouse.at(-1)?.characterId;
    return last ? nextGirlId(last) : "aoi";
  });
  // The frame's pick is spent once Select has opened on her.
  useEffect(() => {
    wallPick = null;
  }, []);
  const [carryNote, setCarryNote] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [carry, setCarry] = useState("");
  const [manifest, setManifest] = useState<ActionManifest | null>(null);
  // Parent card and carry wait in a sheet, so the first look is only her.
  const [legacyOpen, setLegacyOpen] = useState(false);
  const who = sheet(pick);
  const meet = MEET[pick];
  const still = careerFilmSrc(pick);
  const eligible = clubhouse.filter((c) => parentEligible(c, pick, clubhouse.length));
  const parent = eligible.find((c) => c.id === parentId);
  const accent = kitAccent(pick);
  const pending = manifest === null;
  const ready = filmReady(pick, manifest);
  const legacyLabel = parent
    ? `She learns from ${sheet(parent.characterId).name}${sparks.length ? ` · ${sparks.length} to pass on` : ""}`
    : eligible.length
      ? "Who does she learn from?"
      : "Bring in a friend's card";

  useEffect(() => {
    let live = true;
    loadActionManifest().then((m) => {
      if (live) setManifest(m);
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <main className="shine-pick text-cream" style={{ ["--shine-accent" as string]: accent }} data-pick={pick}>
      <div className="shine-pick-backdrop" aria-hidden>
        <img src={parkSrc(who.parkId)} alt="" className="shine-pick-plate" />
        <img key={pick} src={sceneBustSrc(pick, "neutral")} alt="" className="shine-pick-bust" onError={(e) => fallBackTo(e.currentTarget, still)} />
        <div className="shine-pick-shade" />
      </div>
      <div className="shine-pick-top">
        <ShineBack onClick={openTitle} />
        <h1 className="shine-pick-ask">Who will you coach?</h1>
      </div>
      <div className="shine-pick-grid" role="group" aria-label="The girls">
        {BIBLE.map((c) => {
          const on = pick === c.id;
          const inFilm = pending || filmReady(c.id, manifest);
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={on}
              aria-label={inFilm ? `${c.name}, number ${c.number}` : `${c.name}. Her film is not in.`}
              data-locked={inFilm ? undefined : "true"}
              onClick={() => {
                if (on) return;
                sfxSelect();
                setPick(c.id);
                setParentId(null);
                setSparks([]);
              }}
              className="shine-pick-face"
              style={{ ["--face-accent" as string]: kitAccent(c.id) }}
            >
              <span className="shine-pick-face-art">
                <img src={sceneBustSrc(c.id, "neutral")} alt="" onError={(e) => fallBackTo(e.currentTarget, careerFilmSrc(c.id))} />
                <span className="shine-pick-face-num">{c.number}</span>
              </span>
              <span className="shine-pick-face-name">{c.name}</span>
            </button>
          );
        })}
      </div>
      <div className="shine-pick-spacer" />
      <div className="shine-pick-dock">
        {clubhouse.length > 0 ? (
          <button
            type="button"
            className="shine-choice shine-pick-legacy"
            onClick={() => {
              sfxSelect();
              setLegacyOpen(true);
            }}
          >
            {legacyLabel}
          </button>
        ) : null}
        <section className="shine-pick-box" aria-live="polite">
          <span className="shine-pick-name">
            <span className="shine-kana">{who.jp}</span>
            {who.name}
            <span className="shine-pick-num">#{who.number}</span>
          </span>
          <p key={pick} className="shine-pick-line">
            {meet.line}
          </p>
          <p className="shine-pick-lore">{meet.lore}</p>
          <PixelBtn
            className="shine-pick-go h-12 w-full justify-between px-5 text-sm"
            disabled={pending || !ready}
            onClick={() => {
              if (pending || !ready) return;
              startRun(pick, parentId, pickInheritSparks(parent?.sparks ?? [], sparks));
            }}
          >
            {pending || ready ? `Coach ${who.name}` : "Her film is not in."}
            {pending || ready ? <span aria-hidden>→</span> : null}
          </PixelBtn>
        </section>
      </div>
      {legacyOpen ? (
        <div className="shine-pick-sheet" role="dialog" aria-modal="true" aria-label={eligible.length ? "Who she learns from" : "A friend's card"}>
          <div className="shine-pick-sheet-body">
            <p className="shine-pick-sheet-title">{eligible.length ? `Who ${who.name} learns from` : "A friend's card"}</p>
            {eligible.length ? (
              <div className="mt-4">
                <p className="font-display text-[10px] uppercase tracking-widest text-gold">Parent card</p>
                <p className="mt-1 font-ui text-xs text-muted">What she learned stays with her. Everything else starts over.</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    aria-pressed={parentId === null}
                    onClick={() => {
                      setParentId(null);
                      setSparks([]);
                    }}
                    className={`club-nav-tile px-4 py-3 text-left ${parentId === null ? "border-gold" : ""}`}
                  >
                    <p className="font-display text-xs font-bold uppercase">No parent</p>
                    <p className="mt-1 font-ui text-sm text-muted">First year. Fresh.</p>
                  </button>
                  {eligible.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={parentId === c.id}
                      onClick={() => {
                        setParentId(c.id);
                        setSparks(c.sparks.filter((s) => s.kind !== "polish").slice(0, 3));
                      }}
                      className={`club-nav-tile px-4 py-3 text-left ${parentId === c.id ? "border-gold" : ""}`}
                    >
                      <p className="font-display text-xs font-bold uppercase">
                        {sheet(c.characterId).name} · {c.ending}
                      </p>
                      <p className="mt-1 font-ui text-sm text-muted">
                        {c.sparks.slice(0, 3).map((s) => s.kind).join(" · ") || "Nothing to pass on"}
                      </p>
                    </button>
                  ))}
                </div>
                {parent ? (
                  <p className="mt-2 font-ui text-xs text-grass-2">
                    {parent.sparks.slice(0, 3).map((s) => sparkEffectLine(s.kind)).join(" · ")}
                  </p>
                ) : null}
                {parent && cardAltLook(parent) ? (
                  <p className="mt-2 font-ui text-xs text-gold">She wears the look the kids at the gate copied last time.</p>
                ) : null}
                {parent && parent.sparks.length ? (
                  <div className="mt-3">
                    <p className="font-display text-[10px] uppercase tracking-widest text-gold">Pick up to 3 to pass on</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {parent.sparks.filter((s) => s.kind !== "polish").map((s, i) => {
                        const on = sparks.includes(s);
                        return (
                          <button
                            key={`${s.kind}-${i}`}
                            type="button"
                            aria-pressed={on}
                            onClick={() => {
                              if (on) setSparks(sparks.filter((p) => p !== s));
                              else if (sparks.length < 3) setSparks([...sparks, s]);
                            }}
                            className={`club-nav-tile px-3 py-2 ${on ? "border-gold" : ""}`}
                          >
                            <p className="font-display text-[10px] font-bold uppercase">{s.kind}</p>
                            <p className="font-ui text-[10px] text-muted">{sparkEffectLine(s.kind)}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            {clubhouse.length > 0 ? (
              <div className="mt-6">
                <p className="font-display text-[10px] uppercase tracking-widest text-gold">Carry a card</p>
                <p className="mt-1 font-ui text-xs text-muted">A finished year can walk into the next. Stats start fresh.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <input
                    value={carry}
                    onChange={(e) => setCarry(e.target.value)}
                    placeholder="A friend's card"
                    className="min-h-11 min-w-[12rem] flex-1 rounded-xl border border-white/20 bg-ink/70 px-3 font-ui text-sm text-cream"
                    aria-label="Friend carry code"
                  />
                  <PixelBtn
                    variant="ghost"
                    className="h-11"
                    onClick={() => {
                      const ok = importCarry(carry);
                      setCarryNote(useShine.getState().lastLine);
                      if (ok) setCarry("");
                    }}
                  >
                    Carry
                  </PixelBtn>
                </div>
                {carryNote ? <p className="mt-2 font-ui text-xs text-grass-2">{carryNote}</p> : null}
              </div>
            ) : null}
          </div>
          <div className="shine-pick-sheet-foot">
            <PixelBtn className="h-12 w-full" onClick={() => setLegacyOpen(false)}>
              Done
            </PixelBtn>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function Complex() {
  const run = useShine((s) => s.run)!;
  const train = useShine((s) => s.train);
  const finishForcedCage = useShine((s) => s.finishForcedCage);
  const finishMentor = useShine((s) => s.finishMentor);
  const finishYearStart = useShine((s) => s.finishYearStart);
  const lastLine = useShine((s) => s.lastLine);
  const storyCard = useShine((s) => s.storyCard);
  const dismissStoryCard = useShine((s) => s.dismissStoryCard);
  const openTitle = useShine((s) => s.openTitle);
  const openSettings = useShine((s) => s.openSettings);
  const [catchBeat, setCatchBeat] = useState(false);
  const meta = turnMeta(run.turn);
  const mood = MOOD_LABELS[moodLevel(run.mood)];
  const who = sheet(run.characterId);
  const art = careerFilmSrc(run.characterId);
  const next = nextNamedBeat(run.turn);
  const turnsAway = Math.max(0, next.turn - run.turn);
  const moodIdx = moodLevel(run.mood);

  if (storyCard) {
    return (
      <Shell runTurn={run.turn} label="Letters" mood="elated" pill={{ kana: "ファンレター", name: "Letters", tone: "gold" }} action={{ label: "Morning", onClick: dismissStoryCard }}>
        <p className="shine-shell-line">{fanLetter(run)}</p>
        <p className="shine-shell-aside text-gold">Letters at the complex. People come to see her now.</p>
      </Shell>
    );
  }

  if (catchBeat) {
    const catchScene = catchWithCoachScene(run);
    return (
      <Shell
        runTurn={run.turn}
        label="Catch with Coach"
        chipLabel
        mood={catchScene.mood}
        pill={{ kana: who.jp, name: who.name, tone: "accent" }}
        action={{
          label: "Toss it back",
          onClick: () => {
            train("clubhouse");
            setCatchBeat(false);
          },
        }}
      >
        <SceneLines scene={catchScene} />
        <p className="shine-shell-aside text-muted">She looks lighter.</p>
      </Shell>
    );
  }

  if (meta.type === "year-start") {
    const card = yearCard(run.year);
    return (
      <Shell
        runTurn={run.turn}
        label={meta.label}
        chipLabel
        card={
          <div className="shine-year-card" data-year-card={run.year}>
            <span className="shine-year-card-kana shine-kana">{card.kana}</span>
            <span className="shine-year-card-name">{card.name}</span>
            <span className="shine-year-card-sub">{card.sub}</span>
            {/* Growth since last spring, letter to letter: the year's work, in one line. */}
            <YearGrades run={run} />
          </div>
        }
        action={{
          label: "Morning",
          onClick: () => {
            finishYearStart();
            markSpring();
          },
        }}
      >
        {/* The card already names the year, and the Coach's note next morning carries the new coach: this is her. */}
        <p className="shine-shell-line">
          {run.year === 2
            ? "She was at the complex before the gate opened. A year older. Same number."
            : run.year === 3
              ? "Her last spring at the Academy. She knows where everything is now, even the good hose."
              : "The year is open."}
        </p>
      </Shell>
    );
  }

  if (meta.type === "mentor-event") {
    const pitcher = isPitcherStyle(who.style);
    return (
      <Shell
        runTurn={run.turn}
        label={dateLabel(meta, who.style)}
        mood="focused"
        pill={{ kana: "居残り", name: dateLabel(meta, who.style), tone: "gold" }}
        action={{ label: "Listen", onClick: finishMentor }}
      >
        <p className="shine-shell-line">
          {pitcher
            ? "She and the Bullpen Coach stay after the last pitch. You hold the bucket."
            : "She and the Cage Coach stay after the last bucket. You feed the machine."}
        </p>
      </Shell>
    );
  }

  return (
    <ShineComplexWork
      run={run}
      art={art}
      meta={meta}
      mood={mood}
      moodIdx={moodIdx}
      lastLine={lastLine}
      train={train}
      finishForcedCage={finishForcedCage}
      setCatchBeat={(on) => {
        // "Toss it back" sits where the bottom row of tiles was; re-arm the guard so a double tap can't spend the catch.
        useShine.getState().bumpView();
        setCatchBeat(on);
      }}
      openTitle={openTitle}
      openSettings={openSettings}
      next={next}
      turnsAway={turnsAway}
    />
  );
}

function Postgame() {
  const run = useShine((s) => s.run)!;
  const dismissPostgame = useShine((s) => s.dismissPostgame);
  const bumpView = useShine((s) => s.bumpView);
  const lastLine = useShine((s) => s.lastLine);
  const reduced = useShine((s) => s.settings.reducedMotion);
  const last = run.calendar.at(-1);
  const who = sheet(run.characterId);
  const idx = last?.type && last.type in PG_INDEX ? PG_INDEX[last.type as keyof typeof PG_INDEX] : 0;
  const parkId = datePark(last?.type ?? "", who.parkId);
  const skin = curtainSkin(parkId);
  const calledOut = shouldCurtainCall(last?.type ?? "", run.pgResults[idx] === "met");
  const [curtain, setCurtain] = useState(calledOut);
  const verses = cheerLines(run.characterId, run.fans);
  const [canSkipCurtain, setCanSkipCurtain] = useState(() => last?.type !== "lantern-classic");

  useEffect(() => {
    if (last?.type !== "lantern-classic") return;
    const t = window.setTimeout(() => setCanSkipCurtain(true), 18000);
    return () => window.clearTimeout(t);
  }, [last?.type]);

  const met = run.pgResults[idx] === "met";
  const seriesFinale = last?.type === "series" ? seriesFinaleLine(run) : null;
  // The date's own name heads both screens: the stamp says how it went, the name says which one.
  const dateName = last ? dateLabel(turnMeta(last.turn), who.style) : "The game";
  // Never the picture that was just on screen (the done panel's settled still, or the Call's).
  const picture = postgamePicture(run.characterId, met, calledOut);
  // The Finale's postgame (check-in 27, N4): her face over the Finale's plate in the night's mood,
  // never the done panel's still or the curtain's.
  const finalePic =
    last?.type === "finale"
      ? finalePostgamePicture(
          run.characterId,
          met,
          run.finaleTeamWon ?? met,
          calledOut ? [curtainFilmSrc(run.characterId)] : finaleDoneSrcs(run.characterId, met),
          // The ending scene comes next: never the bust it opens on.
          [endingSceneOpenSrc(run.characterId, endingRank(run, true, met))],
        )
      : null;
  const film = finalePic?.kind === "film" ? finalePic.src : sceneFilmSrc(run.characterId, picture.mood);
  const bust = finalePic ? (finalePic.kind === "bust" ? finalePic.src : null) : picture.kind === "bust" ? sceneBustSrc(run.characterId, picture.mood) : null;
  const bustMood = finalePic?.kind === "bust" ? finalePic.mood : picture.mood;
  const plate = finalePic?.kind === "bust" ? finalePic.plate : parkSrc(parkId);
  const stamp = doneStamp(met);
  const keptToday = run.highlights.some((h) => h.kind === "keepsake" && h.turn === last?.turn);

  if (curtain) {
    const call = curtainFilmSrc(run.characterId);
    // The Call's line, its caption, then each verse the crowd has earned, one after another.
    const verseLines = [curtainCallLine(who.curtainCall, skin), `${curtainCaption(run.characterId)} ${skin === "otachidai" ? "The 応援団 sings her name." : "The organ finds her."}`, ...verses];
    return (
      <main className={`shine-after shine-curtain ${reduced ? "is-reduced" : ""}`} data-curtain={last?.type ?? "date"}>
        <div className="shine-backdrop" aria-hidden>
          <img src={call} alt="" className="shine-after-film shine-curtain-film" data-curtain-film={run.characterId} />
          <div className="shine-after-shade" />
        </div>
        <header className="shine-after-top">
          <p className="episode-chip w-fit">{skin === "otachidai" ? "お立ち台" : "Dugout"}</p>
          <TopButtons />
        </header>
        <div className="flex-1" />
        <section className="shine-after-body">
          <div className="shine-after-head">
            <div className={`shine-stamp shine-stamp-${CURTAIN_STAMP.tone} shine-after-stamp shine-curtain-stamp ${reduced ? "shine-stamp-still" : ""}`} role="img" aria-label={CURTAIN_STAMP.en}>
              <span className="shine-stamp-jp" aria-hidden>
                {CURTAIN_STAMP.jp}
              </span>
              <span className="shine-stamp-en" aria-hidden>
                {CURTAIN_STAMP.en}
              </span>
            </div>
            <h1 className="shine-after-name">{dateName}</h1>
          </div>
          {verseLines.map((v, i) => (
            <p key={i} className={`shine-curtain-verse ${i === 0 ? "is-call" : i === 1 ? "is-caption" : "is-verse"}`} style={{ ["--i" as string]: i }}>
              {v}
            </p>
          ))}
        </section>
        <GoDock>
          {canSkipCurtain ? (
            <GoButton
              onClick={() => {
                // "Back to the complex" takes this spot; re-arm the guard so a double tap can't skip the read.
                bumpView();
                setCurtain(false);
              }}
            >
              Walk off
            </GoButton>
          ) : (
            <p className="shine-dock-wait">The first Lantern Classic Call is hers.</p>
          )}
        </GoDock>
      </main>
    );
  }

  return (
    <main className="shine-after" data-after-pa={last?.type ?? "date"} data-met={met ? "true" : "false"}>
      <div className="shine-backdrop" aria-hidden>
        {bust ? (
          <>
            <img src={plate} alt="" className="shine-scene-plate" />
            <img src={bust} alt="" className="shine-after-bust" data-postgame-bust={bustMood} onError={(e) => fallBackTo(e.currentTarget, film)} />
          </>
        ) : (
          <img src={film} alt="" className="shine-after-film" data-scene-film={run.characterId} />
        )}
        <div className="shine-after-shade" />
        {bust ? <div className="shine-keylight" /> : null}
      </div>
      <header className="shine-after-top">
        <p className="episode-chip w-fit">{last ? `Day ${last.turn}` : "The game"}</p>
        <TopButtons />
      </header>
      <div className="flex-1" />
      <section className="shine-after-body">
        {/* The done panel's stamp and the date's name: what happened, at a glance, in no one's jargon. */}
        <div className="shine-after-head">
          <div className={`shine-stamp shine-stamp-${stamp.tone} shine-stamp-still shine-after-stamp`} role="img" aria-label={stamp.en}>
            <span className="shine-stamp-jp" aria-hidden>
              {stamp.jp}
            </span>
            <span className="shine-stamp-en" aria-hidden>
              {stamp.en}
            </span>
          </div>
          <h1 className="shine-after-name">{dateName}</h1>
        </div>
        <div className="max-w-md">
          {lastLine ? <p className="shine-after-line">{dateSpeech(lastLine)}</p> : null}
          {run.fanBeat ? <p className="mt-3 font-ui text-sm text-gold">{run.fanBeat}</p> : null}
          {last?.type === "gate" ? <SceneBlock scene={relationshipScene(run, "post-gate")} /> : null}
          {/* The keepsake line speaks only for today: a pitcher who kept the Gate's ball didn't keep another. */}
          {last?.type === "first-light" && keptToday && run.keepsake === "dirt" ? (
            <p className="mt-3 font-ui text-sm text-gold">She kept a pinch of dirt from the baseline and wrapped it in a sock. &ldquo;Don&apos;t tell anyone. It&apos;s dirt.&rdquo;</p>
          ) : last?.type === "first-light" && keptToday && run.keepsake === "ball" && isPitcherStyle(who.style) ? (
            <p className="mt-3 font-ui text-sm text-cream/70">She kept the last-out ball.</p>
          ) : last?.type === "first-light" && !run.keepsake ? (
            <p className="mt-3 font-ui text-sm text-cream/70">
              {isPitcherStyle(who.style) ? "No ball in her pocket this time." : "The baseline stayed. No keepsake this time."}
            </p>
          ) : null}
          {/* The Finale says her own line; every other big date steps through the park's booth, never twice running. */}
          <p className="shine-after-recap mt-2 font-ui text-sm text-cream/70">
            {postgameFiller({ id: run.characterId, kind: last?.type ?? "", parkId, turn: run.turn, met, teamWon: run.finaleTeamWon })}
          </p>
          {seriesFinale ? <p className="mt-3 font-ui text-sm text-gold">{seriesFinale}</p> : null}
          {run.coachWarning && last?.type !== "finale" ? (
            <p className={`mt-4 font-ui text-sm ${coachWarningTone(run.coachWarning) === "relief" ? "text-gold" : "text-coral"}`}>{run.coachWarning}</p>
          ) : null}
          <p className="mt-4 font-ui text-sm text-cream/80">
            {yearFoldLine(run, dateLabel(turnMeta(run.turn), who.style), nextDateLine(run.turn, last?.type))}
          </p>
        </div>
      </section>
      <GoDock>
        <GoButton onClick={dismissPostgame}>{last?.type === "finale" ? FINALE_POSTGAME.leave : postgameLeaveLabel(run, false)}</GoButton>
      </GoDock>
    </main>
  );
}

function YearEnd() {
  const run = useShine((s) => s.run)!;
  const who = sheet(run.characterId);
  const finishCareer = useShine((s) => s.finishCareer);
  const bumpView = useShine((s) => s.bumpView);
  const dismissYearEnd = useShine((s) => s.dismissYearEnd);
  const reduced = useShine((s) => s.settings.reducedMotion);
  const card = run.clubhouseCard;
  const [pages, setPages] = useState(false);
  const still = card ? careerStill(run) : null;
  const finalePlayed = run.pgResults[6] !== "pending";
  // The Live follows the scoreboard, not her ask (check-in 27, N1).
  const stage = card ? runEndingStage(run) : "bow";
  const book = card ? (run.highlights.length ? run.highlights : (card.highlights ?? [])) : [];
  // The picture budget (check-in 27, N4): the Winning Live stands her bust on the stage-lit Finale
  // plate until §9.2's stage art lands; the Last Bow keeps her composed bust on her home park, or
  // the quiet still of a career that closed early. Never the ending scene's last bust, never the
  // scrapbook's first polaroid.
  const firstPage = card ? firstPolaroidSrc(scrapbookBook(run.characterId, book, run.pgResults)) : null;
  const stagePic = card
    ? endingStagePicture({
        id: run.characterId,
        rank: card.ending,
        stage,
        before: [endingSceneSrc(run.characterId, card.ending)],
        after: firstPage ? [firstPage] : [],
      })
    : null;
  const film = stagePic ? stagePic.src : careerFilmSrc(run.characterId);
  const [revealed, setRevealed] = useState(false);

  // The rank slams in once the stage has had a moment. Her song is ShineApp's screen music.
  useEffect(() => {
    if (!card) return;
    if (card.ending === "never-quit") sfxCowbell();
    const t = window.setTimeout(
      () => {
        setRevealed(true);
        sfxStamp(stage === "live" ? "gold" : card.ending === "C" || card.ending === "D" ? "coral" : "teal");
      },
      reduced ? 250 : stage === "live" ? 1800 : 1100,
    );
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id]);

  if (card && still) {
    const label = endingStageLabel(stage);
    const reveal = rankReveal(card.ending);
    const tone = rankTone(card.ending);
    // The Winning Live / Last Bow: the stage, the rank, her quote and one frame line. The numbers wait in the scrapbook.
    return (
      <main
        className={`shine-after shine-live is-${stage} ${pages ? "is-pages" : ""} ${reduced ? "is-reduced" : ""}`}
        data-winning-live={card.ending}
        data-stage={stage}
      >
        <div className="shine-backdrop" aria-hidden>
          {/* The scrapbook's pages sit over the bare plate: her polaroids are the pictures there. */}
          {stagePic?.kind === "bust" ? (
            <>
              <img src={stagePic.plate} alt="" className={`shine-scene-plate shine-live-plate ${stagePic.lit ? "is-lit" : ""}`} />
              {!pages ? (
                <img
                  src={stagePic.src}
                  alt=""
                  className="shine-after-bust shine-live-bust"
                  data-live-still={run.characterId}
                  data-live-bust={stagePic.mood}
                  onError={(e) => fallBackTo(e.currentTarget, sceneFilmSrc(run.characterId, "elated"))}
                />
              ) : null}
            </>
          ) : pages ? (
            <img src={parkSrc(who.parkId)} alt="" className="shine-scene-plate shine-live-plate" />
          ) : (
            <img src={film} alt="" className="shine-after-film shine-live-film" data-live-still={run.characterId} />
          )}
          {stage === "live" ? (
            <>
              <div className="shine-live-lights" />
              <div className="shine-live-confetti">
                {Array.from({ length: 14 }, (_, i) => (
                  <span key={i} style={{ ["--i" as string]: i }} />
                ))}
              </div>
            </>
          ) : null}
          <div className="shine-after-shade" />
        </div>
        <header className="shine-after-top">
          <div className="flex min-w-0 flex-col items-start gap-1.5">
            <p className="episode-chip w-fit">{label.jp}</p>
            <p className="font-display text-[10px] uppercase tracking-widest text-gold">
              {label.en}
              {pages ? ` · ${endingRankLabel(card.ending)}` : ""}
            </p>
          </div>
          <TopButtons />
        </header>
        <div className="flex-1" />
        <section className="shine-after-body">
          {!pages ? (
            <>
              <div
                className={`shine-rank shine-rank-${tone} ${revealed ? "is-in" : ""}`}
                role="img"
                aria-label={revealed ? `Rank ${reveal.letter}, ${reveal.name}` : undefined}
                aria-hidden={revealed ? undefined : true}
                data-rank={card.ending}
              >
                <span className="shine-rank-letter" aria-hidden>
                  {reveal.letter}
                </span>
                <span className="shine-rank-name" aria-hidden>
                  {reveal.name}
                </span>
              </div>
              <div className={`shine-live-words ${revealed ? "is-in" : ""}`}>
                <p className="shine-after-line max-w-md">{still.quote}</p>
                <p className={`mt-3 font-display text-lg font-bold text-gold ${still.rank === "never-quit" ? "shine-cowbell-line" : ""}`}>{still.frame}</p>
              </div>
            </>
          ) : (
            <>
              <p className="max-w-md font-ui text-sm text-gold">{still.trained}</p>
              <p className="mt-2 max-w-md font-ui text-sm text-gold">{still.mentor}</p>
              <p className="mt-3 max-w-md font-ui text-sm text-gold">{sparkGapLine([card]) ?? `Next: Coach ${nextGirlName(run.characterId)}.`}</p>
              <Scrapbook
                highlights={book}
                pgResults={run.pgResults}
                pa={card.definingPa ?? run.definingPa}
                who={run.characterId}
                finalePlayed={finalePlayed}
                finaleClip={stage === "live" && !reduced && card.ending !== "B" ? endingClipSrc(run.characterId, card.ending) : null}
              />
              {/* The fans and the rank's numbers wait at the very bottom, folded (check-in 27, N5). */}
              <details className="shine-ending-why mt-4 max-w-md">
                <summary className="flex min-h-11 cursor-pointer items-center font-display text-[11px] uppercase tracking-widest text-gold">
                  How she earned her rank
                </summary>
                <p className="pb-2 font-ui text-xs text-cream/70" data-ending-why>
                  {still.why}
                </p>
              </details>
            </>
          )}
        </section>
        <GoDock>
          {pages ? (
            <GoButton onClick={finishCareer}>Clubhouse</GoButton>
          ) : (
            <GoButton
              onClick={() => {
                if (card.ending === "never-quit") sfxCowbell();
                // "Clubhouse" (which ends the career) lands exactly here; a double tap must not skip the scrapbook.
                bumpView();
                setPages(true);
              }}
            >
              The scrapbook
            </GoButton>
          )}
        </GoDock>
      </main>
    );
  }
  const nextYear = run.turn <= 20 ? "Classic year" : "Senior year";
  return (
    <main className="shine-after" data-year-end={run.year}>
      <div className="shine-backdrop" aria-hidden>
        <img src={film} alt="" className="shine-after-film" />
        <div className="shine-after-shade" />
      </div>
      <header className="shine-after-top">
        <p className="episode-chip w-fit">
          Day {run.turn} · {dateLabel(turnMeta(run.turn), who.style)}
        </p>
        <TopButtons />
      </header>
      <div className="flex-1" />
      <section className="shine-after-body">
        <div className="max-w-md">
          <p className="shine-after-line">{yearStillLine(run.characterId, run.turn, run.pgResults, run.definingPa, run.lightCard, run.finaleTeamWon)}</p>
          <p className="mt-3 font-ui text-sm text-cream/80">
            {run.turn <= 20
              ? "Next spring: the Classic year. The Lantern Classic is always at Lantern Field."
              : "Next spring: her senior year. The Stretch is coming."}
          </p>
          <SceneBlock scene={relationshipScene(run, "year-end")} />
        </div>
      </section>
      <GoDock>
        <GoButton onClick={dismissYearEnd}>{nextYear}</GoButton>
      </GoDock>
    </main>
  );
}

function isSpoken(line: string) {
  return /^["“「]/.test(line.trim());
}

/** Her beat's lines as the scene box sets them: her words and the Coach's memory under them. */
function SceneLines({ scene }: { scene: RelationshipScene }) {
  return (
    <>
      {scene.lines.map((l, i) => (
        // Her words open on a quote mark; anything else is the narrator, set as a caption, not in her mouth.
        <p key={i} className={`shine-vn-line ${isSpoken(l) ? "" : "is-narration"}`}>
          {l}
        </p>
      ))}
      {scene.quoted ? <p className="shine-vn-note">{memoryLine(scene.quoted)}</p> : null}
    </>
  );
}

/**
 * Her beat on a screen that already shows her picture: the scenes' box, full width,
 * with her name on its pill (the picture is the screen's own, never a second copy).
 */
function SceneBlock({ scene }: { scene: RelationshipScene }) {
  const who = sheet(scene.speaker);
  return (
    <div
      className="shine-vn-box"
      data-testid="relationship-scene"
      data-scene-mood={scene.mood}
      style={{ ["--shine-accent" as string]: kitAccent(scene.speaker) }}
    >
      {/* Her name only when she says something. */}
      {scene.lines.some(isSpoken) ? (
        <span className="shine-vn-name">
          <span className="shine-kana">{who.jp}</span>
          {who.name}
        </span>
      ) : null}
      <SceneLines scene={scene} />
    </div>
  );
}

/**
 * The scrapbook as a book: a polaroid for each big game (her picture from how it went, the
 * game's name, 達成 or 未達成, a caption of what happened), and after the Finale, her letter.
 */
function Scrapbook({
  highlights,
  pgResults,
  pa,
  who,
  finalePlayed,
  finaleClip,
}: {
  highlights: Highlight[];
  pgResults?: readonly string[];
  pa: DefiningPa | null | undefined;
  who: CharacterId;
  finalePlayed: boolean;
  finaleClip?: string | null;
}) {
  const [replay, setReplay] = useState(false);
  const entries = scrapbookBook(who, highlights, pgResults);
  const letter = letterPage(who, finalePlayed);
  const style = sheet(who).style;
  if (!entries.length && !pa && !letter) return null;
  return (
    <div className="shine-book" data-testid="scrapbook">
      <p className="font-display text-[10px] uppercase tracking-widest text-gold">Scrapbook</p>
      <ol className="shine-book-pages">
        {entries.map((e, i) => {
          if (e.kind === "note") {
            return (
              <li key={`n-${e.turn}-${i}`} className="shine-book-note">
                {e.line}
              </li>
            );
          }
          const p = e.page;
          const stamp = doneStamp(p.met);
          const clip = p.game === "finale" && p.met ? finaleClip : null;
          return (
            <li key={`p-${p.turn}`} className={`shine-polaroid ${p.met ? "is-met" : "is-missed"}`} style={{ ["--tilt" as string]: `${i % 2 ? 1.4 : -1.2}deg` }} data-book-page={p.game}>
              <div className="shine-polaroid-photo">
                {p.picture.plate ? (
                  <img src={p.picture.plate} alt="" className="shine-polaroid-plate" loading="lazy" onError={(ev) => fallBackTo(ev.currentTarget, parkSrc(sheet(who).parkId))} />
                ) : null}
                <img
                  src={p.picture.src}
                  alt=""
                  className={p.picture.plate ? "shine-polaroid-bust" : "shine-polaroid-film"}
                  loading="lazy"
                  onError={(ev) => fallBackTo(ev.currentTarget, careerFilmSrc(who))}
                />
                {clip ? <video src={clip} poster={p.picture.src} autoPlay loop muted playsInline className="shine-polaroid-film" /> : null}
                <span className={`shine-polaroid-sticker is-${stamp.tone}`} aria-label={stamp.en}>
                  {stamp.jp}
                </span>
              </div>
              <p className="shine-polaroid-title">{dateLabel(turnMeta(p.turn), style)}</p>
              <p className="shine-polaroid-caption">{p.caption}</p>
              {p.meeting ? <p className="shine-polaroid-aside">{p.meeting}</p> : null}
              {p.notes.map((n) => (
                <p key={n} className="shine-polaroid-aside is-note">
                  {n}
                </p>
              ))}
            </li>
          );
        })}
        {letter ? (
          <li className="shine-letter" data-fan-letter={who}>
            <p className="shine-letter-kicker">{letter.kicker}</p>
            <p className="shine-letter-text">{letter.text}</p>
          </li>
        ) : null}
      </ol>
      {pa ? (
        <div className="mt-3">
          <button
            type="button"
            aria-expanded={replay}
            onClick={() => setReplay((v) => !v)}
            className="font-display text-[10px] uppercase tracking-widest text-grass-2 underline-offset-2 hover:underline"
          >
            {replay ? "Close the replay" : isPitcherStyle(sheet(who).style) ? "Replay the inning" : "Replay the at-bat"}
          </button>
          {replay ? (
            <ol className="mt-2 space-y-1 font-ui text-xs text-cream/80">
              {replayLines(pa, who).map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Sound, Settings and the way back to the title: the same three rounds on every screen's top right. */
function TopButtons() {
  const openTitle = useShine((s) => s.openTitle);
  const openSettings = useShine((s) => s.openSettings);
  return (
    <div className="flex shrink-0 items-center gap-2">
      <ShineMute />
      <ShineRoundBtn icon="settings" label="Settings" onClick={openSettings} />
      <ShineBack onClick={openTitle} />
    </div>
  );
}

/** The one way on: gold, full width, held at the foot of the screen, like the date's Leave. */
function GoDock({ children }: { children: ReactNode }) {
  return <div className="shine-dock">{children}</div>;
}

function GoButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <PixelBtn className="shine-go h-12 w-full text-sm" onClick={onClick}>
      {children}
    </PixelBtn>
  );
}

/** A scene's way on once it's heard: the same gold button, set under the box at the foot of the screen. */
function SceneGo({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <div className="shine-scene-go">
      <GoButton onClick={onClick}>{children}</GoButton>
    </div>
  );
}

type ShellPill ={ kana: string; name: string; tone: "gold" | "accent" };

/**
 * A day that isn't work, set like a scene: the park blurred to light, her bust in
 * front of it, the words in the box at the foot with a pill naming who (or what)
 * it is, and the way on at the bottom of the box. The chip keeps the day; it names
 * the moment too unless the pill already does.
 */
function Shell({
  runTurn,
  label,
  chipLabel = false,
  mood = "neutral",
  pill = null,
  card = null,
  action,
  children,
}: {
  runTurn: number;
  label: string;
  chipLabel?: boolean;
  mood?: PortraitMood;
  pill?: ShellPill | null;
  card?: ReactNode;
  action: { label: string; onClick: () => void };
  children: ReactNode;
}) {
  const run = useShine((s) => s.run);
  const id: CharacterId = run?.characterId ?? "aoi";
  const park = parkSrc(sheet(id).parkId);
  const next = nextNamedBeat(runTurn);
  const turnsAway = Math.max(0, next.turn - runTurn);
  const style = sheet(id).style;
  return (
    <main className="shine-shell" data-shell={label} style={{ ["--shine-accent" as string]: kitAccent(id) }}>
      <div className="shine-backdrop" aria-hidden>
        {/* The park blurred to light, as the scenes show a place: the pixel ballpark never shows sharp. */}
        <img src={park} alt="" className="shine-scene-plate" />
        <img
          key={`${id}-${mood}`}
          src={sceneBustSrc(id, mood)}
          alt=""
          className="shine-shell-bust"
          data-shell-mood={mood}
          onError={(e) => fallBackTo(e.currentTarget, careerFilmSrc(id))}
        />
        <div className="shine-shell-shade" />
        {/* Last, as in the scenes: the light falls on her too. */}
        <div className="shine-keylight" />
      </div>
      <header className="shine-shell-top">
        <div className="shine-shell-heading">
          <p className="episode-chip w-fit">{chipLabel ? `Day ${runTurn} · ${label}` : `Day ${runTurn}`}</p>
          <p className="shine-shell-next">
            <span className="shine-shell-next-name">{dateLabel(next, style)}</span>
            <span className="shine-shell-next-when">{daysAwayLabel(turnsAway)}</span>
          </p>
        </div>
        <TopButtons />
      </header>
      <div className="flex-1" />
      {card}
      <section className={`shine-shell-box ${pill ? "" : "is-narration"}`}>
        {pill ? (
          <span className={`shine-vn-name ${pill.tone === "gold" ? "is-gold" : ""}`}>
            <span className="shine-kana">{pill.kana}</span>
            {pill.name}
          </span>
        ) : null}
        <div className="shine-shell-text">{children}</div>
        <div className="shine-shell-go">
          <GoButton onClick={action.onClick}>{action.label}</GoButton>
        </div>
      </section>
    </main>
  );
}

function Establishing() {
  const run = useShine((s) => s.run)!;
  const dismissEstablishing = useShine((s) => s.dismissEstablishing);
  const reduced = useShine((s) => s.settings.reducedMotion);
  const [heard, setHeard] = useState(false);

  useEffect(() => {
    unlockAudio();
    // Coming from the title the bed is already playing under the same cue, so this never restarts it.
    playScreenMusic(TITLE_MUSIC);
    return () => stopMusic();
  }, []);

  // Her promise, one line at a time. The year starts when she's said it.
  return (
    <main className="min-h-dvh bg-ink text-cream" style={{ ["--shine-accent" as string]: kitAccent(run.characterId) }}>
      <ScenePlayer
        scene={promiseScene(run.characterId)}
        reduced={reduced}
        onDone={() => setHeard(true)}
        chip="First Day"
        actions={
          heard ? (
            <SceneGo
              onClick={() => {
                stopMusic();
                dismissEstablishing();
              }}
            >
              Morning
            </SceneGo>
          ) : null
        }
      />
    </main>
  );
}

/**
 * A story beat between the calendar and the plate: the promise's payoff on
 * Finale eve, a rival meeting before a big game, the low point after her
 * first missed goal. The scene plays one line at a time; the button appears
 * when she's said it.
 */
function StoryScreen({ scene, chip, cta, onDone }: { scene: SceneLike; chip: string; cta: string; onDone: () => void }) {
  const run = useShine((s) => s.run)!;
  const reduced = useShine((s) => s.settings.reducedMotion);
  const [heard, setHeard] = useState(false);
  return (
    <main className="min-h-dvh bg-ink text-cream" style={{ ["--shine-accent" as string]: kitAccent(run.characterId) }}>
      <ScenePlayer
        key={`${scene.id}-${scene.girl}-${scene.place}`}
        scene={scene}
        reduced={reduced}
        onDone={() => setHeard(true)}
        chip={chip}
        actions={
          heard ? <SceneGo onClick={onDone}>{cta}</SceneGo> : null
        }
      />
    </main>
  );
}

/**
 * A training event: an ordinary day before work, a short scene, and a choice
 * that's the Coach's to make. Her reply plays, the chips say what it did,
 * and then it's off to work.
 */
function EventScreen({ event }: { event: TrainingEvent }) {
  const run = useShine((s) => s.run)!;
  const reduced = useShine((s) => s.settings.reducedMotion);
  const resolveEvent = useShine((s) => s.resolveEvent);
  const pickEvent = useShine((s) => s.pickEvent);
  // A pick survives a reload: the scene resumes on her reply, not on the choice.
  const saved = run.eventPick?.key === eventKey(event) ? event.choices[run.eventPick.index] : null;
  const [heard, setHeard] = useState(Boolean(saved));
  const [choice, setChoice] = useState<EventChoice | null>(saved ?? null);
  const [replied, setReplied] = useState(false);
  // Choices appear where the thumb was tapping through the scene: hold them a beat so a tap meant for the last line can't pick one.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!heard) return;
    const t = window.setTimeout(() => setArmed(true), 600);
    return () => window.clearTimeout(t);
  }, [heard]);
  // Keyboard focus follows the scene when the choice buttons go away, but only for a pick made
  // just now: after a reload the box would get a focus ring nobody asked for.
  const pickedHere = useRef(false);
  useEffect(() => {
    if (choice && pickedHere.current) document.querySelector<HTMLButtonElement>(".shine-scene-box")?.focus();
  }, [choice]);
  const key = eventKey(event);
  // What landed, split: gains float up in gold with a chime; costs are shown plainly.
  const landed = choice ? cappedEffect(run, choice.effect) : {};
  const ups = effectChips({ mood: (landed.mood ?? 0) > 0 ? landed.mood : undefined, energy: (landed.energy ?? 0) > 0 ? landed.energy : undefined, stat: landed.stat });
  const costs = effectChips({ mood: (landed.mood ?? 0) < 0 ? landed.mood : undefined, energy: (landed.energy ?? 0) < 0 ? landed.energy : undefined });
  useEffect(() => {
    if (replied && ups.length > 0) sfxGain();
  }, [replied]);
  const scene = choice
    ? { id: `${key}-reply-${event.choices.indexOf(choice)}`, girl: event.girl, place: event.place, beats: choice.reply }
    : { id: key, girl: event.girl, place: event.place, beats: event.beats };
  const actions =
    heard && !choice ? (
      event.choices.map((c, i) => (
        <button
          key={c.label}
          type="button"
          className="shine-choice"
          style={{ ["--i" as string]: i }}
          disabled={!armed}
          onClick={() => {
            pickedHere.current = true;
            pickEvent(eventKey(event), i as 0 | 1);
            setChoice(c);
          }}
        >
          {c.label}
        </button>
      ))
    ) : choice && replied ? (
      <>
        {reduced || ups.length === 0 ? null : (
          <div className="shine-gain-floats" aria-hidden>
            {ups.map((g, i) => (
              <span key={g} className="shine-gain-float" style={{ ["--i" as string]: i }}>
                {g}
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {ups.map((g, i) => (
            <span key={g} className="shine-gain-chip" style={{ ["--i" as string]: i }}>
              {g}
            </span>
          ))}
          {costs.map((g, i) => (
            <span key={g} className="shine-gain-chip is-cost" style={{ ["--i" as string]: ups.length + i }}>
              {g}
            </span>
          ))}
        </div>
        <SceneGo onClick={() => resolveEvent(key, choice.effect)}>To work</SceneGo>
      </>
    ) : null;
  return (
    <main className="min-h-dvh bg-ink text-cream" style={{ ["--shine-accent" as string]: kitAccent(run.characterId) }}>
      <ScenePlayer
        key={scene.id}
        scene={scene}
        reduced={reduced}
        onDone={() => (choice ? setReplied(true) : setHeard(true))}
        chip={eventChip(event.place)}
        actions={actions}
        establish={!choice}
      />
    </main>
  );
}

const RIVAL_CHIP: Record<RivalKind, string> = {
  "lantern-classic": "Lantern Classic · before the game",
  "night-classic": "Night Classic · before the game",
  stretch: "The Stretch · before the game",
  series: "Skyline Series · before the game",
};

const FOCUSABLE = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

/**
 * Settings and How it works as real dialogs: focus moves in when they open and back
 * where it was when they close, Tab stays inside, and Escape closes them (unless
 * Settings is waiting for a key to rebind, which wants that Escape).
 */
function OverlayDialog({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    // On the window, not the dialog: a click on empty dialog space drops focus to the body,
    // and Escape and Tab still have to work from there.
    const onKey = (e: KeyboardEvent) => {
      const root = ref.current;
      if (!root) return;
      if (e.key === "Escape") {
        if (root.querySelector("[data-listening]")) return;
        // Capture phase + stop: this Escape closes the dialog and nothing else. Without it the
        // race or mound underneath (listening on the window too) would also read it and resume.
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      // Only what can actually take focus: the Keys section is hidden on touch phones.
      const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items.at(-1)!;
      const inside = document.activeElement instanceof Node && root.contains(document.activeElement);
      if (!inside) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      // A backup restore can swap the screen underneath; don't hand focus to a button that's gone.
      if (before?.isConnected) before.focus();
    };
  }, []);
  return (
    <div ref={ref} className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={label}>
      {children}
    </div>
  );
}

export function ShineApp() {
  const screen = useShine((s) => s.screen);
  const overlay = useShine((s) => s.overlay);
  const closeOverlay = useShine((s) => s.closeOverlay);
  const hydrated = useShine((s) => s.hydrated);
  const setHydrated = useShine((s) => s.setHydrated);
  const openExhibition = useShine((s) => s.openExhibition);
  const run = useShine((s) => s.run);
  const weeklyGuest = useShine((s) => s.weeklyGuest);
  const liveGame = useShine((s) => s.liveGame);
  const hearFinaleEve = useShine((s) => s.hearFinaleEve);
  const hearArc = useShine((s) => s.hearArc);
  const establishing = useShine((s) => s.establishing);
  const owned = useShine((s) => s.ownedCosmetics);
  const skin = cosmeticClasses(owned);
  const accent = run ? kitAccent(run.characterId) : undefined;

  const muted = useShine((s) => s.muted);
  const settings = useShine((s) => s.settings);

  useEffect(() => {
    warmActionExhibition();
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setHydrated(), 0);
    return () => window.clearTimeout(t);
  }, [setHydrated]);

  // Deep-link for stills / first-pitch timing. Exhibition stays in-memory;
  // persist still refuses to write this screen. A reload with the flag
  // mounts a fresh session.
  useEffect(() => {
    if (!hydrated) return;
    if (new URLSearchParams(window.location.search).get("exhibit") === "1") {
      openExhibition();
    }
  }, [hydrated, openExhibition]);

  useEffect(() => {
    if (typeof window === "undefined" || new URLSearchParams(window.location.search).get("debug") !== "1") return;
    const api = {
      get: () => useShine.getState(),
      train: (station: "cage" | "off-day" | "poles" | "looks" | "bp" | "situational" | "charting" | "treatment" | "hitch" | "side") =>
        useShine.getState().train(station),
      finishForcedCage: () => useShine.getState().finishForcedCage(),
      finishMentor: () => useShine.getState().finishMentor(),
      finishYearStart: () => useShine.getState().finishYearStart(),
      startRun: (id: "aoi" | "reina" | "miki" | "sol" | "kira" | "yuki", parentId?: string | null) =>
        useShine.getState().startRun(id, parentId),
      jump: (turn: number) => {
        const { run } = useShine.getState();
        if (!run) return;
        const next = structuredClone(run);
        next.turn = turn;
        next.year = yearOf(turn);
        const type = turnMeta(turn).type;
        next.phase = type === "forced-scene" ? "year-end" : PLATE_TURNS.includes(type) ? "plate" : "complex";
        useShine.setState({
          run: next,
          screen: type === "forced-scene" ? "year-end" : PLATE_TURNS.includes(type) ? "plate" : "complex",
          liveGame: null,
          establishing: false,
          calendarPeek: false,
        });
      },
      dismissPostgame: () => useShine.getState().dismissPostgame(),
      dismissYearEnd: () => useShine.getState().dismissYearEnd(),
      dismissCalendarPeek: () => useShine.getState().dismissCalendarPeek(),
      continueRun: () => useShine.getState().continueRun(),
    };
    (window as unknown as { __dsShine?: typeof api }).__dsShine = api;
    return () => {
      delete (window as unknown as { __dsShine?: typeof api }).__dsShine;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!careerMuteAppliesToScreen(screen)) return;
    setMasterMuted(muted);
  }, [hydrated, muted, screen]);

  useEffect(() => {
    if (!hydrated) return;
    setMix({ music: settings.music, sfx: settings.sfx, crowd: settings.crowd });
  }, [hydrated, settings.music, settings.sfx, settings.crowd]);

  // When the view changes under a thumb (a scene's "To the park" becoming the plate's sit
  // grid, a choice becoming the work screen), the second tap of a double-tap must not land
  // on the new screen. Swallow input for a beat after every change of view: a new screen, a
  // turn, a story beat heard, an overlay closing, or a screen swapping its own buttons (viewNonce).
  const viewNonce = useShine((s) => s.viewNonce);
  const viewKey = [screen, run?.turn ?? 0, run?.arcsHeard?.length ?? 0, run?.finaleEveHeard ? 1 : 0, establishing ? 1 : 0, overlay ?? "", viewNonce].join("|");
  const [inputGuard, setInputGuard] = useState(false);
  useEffect(() => {
    setInputGuard(true);
    const t = window.setTimeout(() => setInputGuard(false), 350);
    return () => window.clearTimeout(t);
  }, [viewKey]);
  // The guard's overlay only stops pointers; Enter/Space would still press Go or a focused button.
  useEffect(() => {
    if (!inputGuard) return;
    const swallow = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", swallow, true);
    return () => window.removeEventListener("keydown", swallow, true);
  }, [inputGuard]);

  let view: ReactNode;
  // The screen's music (F9). Null leaves the bus to whoever owns it (the title, a game, a postgame).
  let musicCue: ScreenMusic | null = null;
  const turnType = run ? turnMeta(run.turn).type : null;
  const resuming = Boolean(run && liveGame && liveGame.runId === run.id && liveGame.turn === run.turn);
  const dueEvent = run ? eventDue(run, EVENT_LIBRARY) : null;
  if (!hydrated) {
    view = (
      <main className="relative flex min-h-dvh flex-col overflow-hidden bg-ink text-cream">
        <div className="title-wash absolute inset-0" />
        <div className="relative z-10 px-8 py-16">
          <p className="episode-chip w-fit">ダイヤシャイン</p>
          <h1 className="anime-logo mt-6">
            <span>Diamond</span>
            <strong>Shine</strong>
          </h1>
        </div>
      </main>
    );
  } else if (screen === "settings" && !overlay) view = <ShineSettings />;
  else if (screen === "help" && !overlay) view = <ShineHelp />;
  else if (screen === "title") view = <Title />;
  else if (screen === "shop") view = <Shop />;
  else if (screen === "wall") view = <Wall />;
  else if (screen === "select") view = <Select />;
  else if (screen === "exhibition") view = <ShineExhibition />;
  else if (screen === "weekly" && (weeklyGuest || run)) view = <ShinePlate />;
  else if (screen === "weekly") view = <Title />;
  else if (!run) view = <Title />;
  else if (establishing && run.turn === 1 && run.calendar.length === 0) view = <Establishing />;
  // Story beats never interrupt a saved game being resumed.
  else if (screen === "plate" && !resuming && turnType === "finale" && !run.finaleEveHeard) {
    view = <StoryScreen scene={finaleEveScene(run.characterId)} chip="Diamond Finale · the night before" cta="To the park" onDone={hearFinaleEve} />;
    musicCue = { kind: "theme", id: run.characterId };
  } else if (screen === "plate" && !resuming && isRivalKind(turnType) && !run.arcsHeard?.includes(`rival:${turnType}`)) {
    view = <StoryScreen scene={rivalIntro(run.characterId, turnType)} chip={RIVAL_CHIP[turnType]} cta="To the park" onDone={() => hearArc(`rival:${turnType}`)} />;
    musicCue = { kind: "theme", id: run.characterId };
  } else if (screen === "complex" && run.phase === "complex" && run.pgMisses >= 1 && !run.arcsHeard?.includes("low-point"))
    // The low point plays in silence.
    view = <StoryScreen scene={lowPointScene(run.characterId)} chip="That night" cta="Tomorrow" onDone={() => hearArc("low-point")} />;
  else if (screen === "complex" && run.phase === "complex" && dueEvent) {
    view = <EventScreen key={eventKey(dueEvent)} event={dueEvent} />;
    musicCue = { kind: "complex" };
  } else if (screen === "plate") view = <ShinePlate />;
  else if (screen === "postgame") view = <Postgame />;
  else if (screen === "year-end" && run.clubhouseCard && !run.arcsHeard?.includes("ending")) {
    const stage = runEndingStage(run);
    view = (
      <StoryScreen
        scene={endingScene(run.characterId, run.clubhouseCard.ending)}
        chip={endingChip(endingTier(run.characterId, run.clubhouseCard.ending))}
        cta={endingStageCta(stage)}
        onDone={() => hearArc("ending")}
      />
    );
    musicCue = { kind: "theme", id: run.characterId };
  } else if (screen === "year-end") {
    view = <YearEnd />;
    const card = run.clubhouseCard;
    // A won Finale's Live sings her song at full voice; the Last Bow keeps the piano.
    musicCue = !card
      ? { kind: "theme", id: run.characterId }
      : runEndingStage(run) === "live"
        ? { kind: "live", id: run.characterId }
        : { kind: "bow", rank: card.ending };
  } else {
    view = <Complex />;
    musicCue = { kind: "complex" };
  }

  // One cue per screen: the same cue across a swap keeps playing (never a double start); a
  // screen with no cue stops only the music this effect started, before the next screen's own
  // effects run (a layout effect), so a game's walk-up is never cut by it.
  const musicKey = hydrated ? screenMusicKey(musicCue) : "";
  const musicCueRef = useRef(musicCue);
  musicCueRef.current = musicCue;
  const ownsMusic = useRef(false);
  useScreenLayoutEffect(() => {
    if (musicKey || !ownsMusic.current) return;
    ownsMusic.current = false;
    stopMusic();
  }, [musicKey]);
  useEffect(() => {
    const cue = musicCueRef.current;
    if (!musicKey || !cue) return;
    ownsMusic.current = true;
    playScreenMusic(cue);
  }, [musicKey]);
  useEffect(
    () => () => {
      if (ownsMusic.current) stopMusic();
    },
    [],
  );

  const style: CSSProperties = { ["--text-scale" as string]: String(settings.textScale) };
  if (accent) (style as Record<string, string>)["--shine-accent"] = accent;
  return (
    <div
      className={`shine-root ${skin}`.trim()}
      style={style}
      data-reduced-motion={settings.reducedMotion ? "true" : undefined}
    >
      {view}
      {inputGuard ? <div className="fixed inset-0 z-[90]" data-input-guard aria-hidden /> : null}
      {overlay === "settings" ? (
        <OverlayDialog label="Settings" onClose={closeOverlay}>
          <ShineSettings />
        </OverlayDialog>
      ) : null}
      {overlay === "help" ? (
        <OverlayDialog label="How it works" onClose={closeOverlay}>
          <ShineHelp />
        </OverlayDialog>
      ) : null}
    </div>
  );
}
