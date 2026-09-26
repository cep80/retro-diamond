"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { PixelBtn } from "@/components/pixel-btn";
import { ShineMute } from "@/components/ShineMute";
import { ROUND_ICON_PATHS, ShineBack, ShineRoundBtn } from "@/components/ShineRoundBtn";
import { careerMuteAppliesToScreen, setMasterMuted, setMix, sfxCowbell, sfxGain, sfxSelect, sfxTitleSting, startEnding, startMusic, stopMusic, unlockAudio } from "@/shine/audio.ts";
import { ShineHelp, ShineSettings } from "@/components/ShineSettings";
import { nextNamedBeat, nextDateLine, turnMeta, dateLabel, daysAwayLabel, yearOf, PLATE_TURNS } from "@/shine/calendar.ts";
import { BIBLE, careerFilmSrc, endingClipSrc, endingFilmSrc, isPitcherStyle, parkSrc, sceneBustSrc, sceneFilmSrc, sheet, yearStillLine } from "@/shine/bible.ts";
import { NEVER_SOLD, SKUS, cosmeticClasses, previewClaimable } from "@/shine/commerce.ts";
import { kitAccent } from "@/shine/stage.ts";
import { cheerLines, curtainCallLine, curtainCaption, curtainFilmSrc, curtainSkin, datePark, dateSpeech, endingRankLabel, fanLetter, recapLine, shouldCurtainCall, yearVoice } from "@/shine/culture.ts";
import { ShineComplexWork } from "./ShineComplexWork";
import { careerStill, cardAltLook, cardBanner, cardGold, nextGirlId, nextGirlName, parentEligible, pickInheritSparks, postgameLeaveLabel, seriesFinaleLine, sparkEffectLine, sparkGapLine, yearFoldLine } from "@/shine/ending.ts";
import { PG_INDEX } from "@/shine/run.ts";
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

function isRivalKind(t: string | null): t is RivalKind {
  return t !== null && (RIVAL_KINDS as readonly string[]).includes(t);
}
import { ScenePlayer } from "./ScenePlayer";
import { catchWithCoachScene, memoryLine, relationshipScene, type RelationshipScene } from "@/shine/relationship.ts";
import { keepsakeWallLine, replayLines, scrapbookLine } from "@/shine/scrapbook.ts";
import type { CharacterId, DefiningPa, Highlight, Spark } from "@/shine/types.ts";

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

  useEffect(() => {
    warmActionExhibition();
    if (titleStarted) startMusic("title");
    return () => stopMusic();
  }, []);

  const start = () => {
    if (started) return;
    unlockAudio();
    sfxTitleSting();
    startMusic("title");
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

  const go = (fn: () => void) => () => {
    sfxSelect();
    stopMusic();
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
              <PixelBtn className="min-h-14 justify-between px-5 py-2.5 text-sm" onClick={go(openSelect)}>
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
                <button type="button" className="shine-title-end is-armed" onClick={go(openSelect)}>
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
              <button type="button" className="shine-title-end" onClick={go(openSelect)}>
                New Rookie year
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function Wall() {
  const clubhouse = useShine((s) => s.clubhouse);
  const run = useShine((s) => s.run);
  const openTitle = useShine((s) => s.openTitle);
  const openSelect = useShine((s) => s.openSelect);
  const nextHook = sparkGapLine(clubhouse);
  const liveQuote = run?.clubhouseCard ? careerStill(run).quote : null;
  return (
    <main className="shine-stage text-cream">
      <img src="/bg/park-koi.jpg" alt="" className="absolute inset-0 size-full object-cover" />
      <div className="shine-stage-wash absolute inset-0" />
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:px-8">
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
          <p className="mt-6 font-ui text-sm text-muted">No cards yet. Finish a Rookie year.</p>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {clubhouse.map((c) => {
              const who = sheet(c.characterId);
              const art = endingFilmSrc(c.characterId, c.ending);
              const rank = endingRankLabel(c.ending);
              const keepsake = keepsakeWallLine(c.characterId, c.keepsake);
              return (
                <article
                  key={c.id}
                  className={`shine-clubhouse-card club-nav-tile overflow-hidden px-0 py-0 ${cardGold(c) ? "border-gold shadow-[0_0_0_1px_rgb(255_209_102/0.8)]" : ""} ${
                    c.ending === "S" || c.ending === "A" ? "shine-dohage-card" : c.ending === "never-quit" ? "shine-never-quit" : ""
                  }`}
                >
                  <div className="relative bg-ink/90 px-4 pb-3 pt-4">
                    <p className="font-display text-[10px] uppercase tracking-widest text-gold">{rank}</p>
                    <p className="shine-kana text-sm text-gold">{who.jp}</p>
                    {art ? (
                      <img
                        src={art}
                        alt=""
                        className={`mx-auto mt-2 aspect-[3/4] h-44 w-auto object-cover ${cardAltLook(c) ? "shine-alt-look" : ""}`}
                        data-clubhouse-film={c.characterId}
                      />
                    ) : null}
                    <p className="mt-3 font-display text-sm font-bold uppercase tracking-wide">
                      #{who.number} {who.name}
                    </p>
                    <p className="mt-1 font-ui text-xs text-muted">
                      {who.pgVerb} · vs {sheet(who.rival).name}
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
                    <p className="mt-1 font-ui text-xs text-gold">
                      {c.sparks.slice(0, 3).map((s) => s.kind).join(" · ") || "Nothing yet"}
                    </p>
                    <p className="mt-2 font-ui text-xs text-cream/70">Next: Coach {nextGirlName(c.characterId)}.</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {clubhouse.length > 0 ? (
          <div className="mt-8 flex flex-wrap gap-3">
            <PixelBtn
              className="h-12"
              onClick={() => {
                sfxSelect();
                openSelect();
              }}
            >
              Coach the next her
            </PixelBtn>
          </div>
        ) : null}
      </div>
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
    line: "Ha! Sorry. I laugh first, it saves time. I'm the last inning. Three outs and I'm out the door.",
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
    const last = clubhouse.at(-1)?.characterId;
    return last ? nextGirlId(last) : "aoi";
  });
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
      <Shell runTurn={run.turn} label="Letters · Fan 30">
        <p className="font-display text-[10px] uppercase tracking-widest text-gold">Character Story</p>
        <p className="mt-3 font-ui text-base leading-relaxed text-cream/90">{fanLetter(run)}</p>
        <p className="mt-3 font-ui text-sm text-gold">Letters at the complex. She&apos;s a draw.</p>
        <PixelBtn className="mt-6 h-12" onClick={dismissStoryCard}>
          Morning
        </PixelBtn>
      </Shell>
    );
  }

  if (catchBeat) {
    const catchScene = catchWithCoachScene(run);
    return (
      <Shell runTurn={run.turn} label="Catch with Coach">
        <SceneBlock scene={catchScene} />
        <p className="mt-3 font-ui text-xs text-muted">Once a year. She looks lighter.</p>
        <PixelBtn
          className="mt-6 h-12"
          onClick={() => {
            train("clubhouse");
            setCatchBeat(false);
          }}
        >
          Toss it back
        </PixelBtn>
      </Shell>
    );
  }

  if (meta.type === "year-start") {
    return (
      <Shell runTurn={run.turn} label={meta.label}>
        <p className="font-ui text-base leading-relaxed text-cream/90">
          {run.year === 2
            ? "Classic year. The Lantern Classic is always at Lantern Field."
            : run.year === 3
              ? "Senior year. The Stretch is coming."
              : "The year is open."}
        </p>
        <p className="mt-3 font-ui text-sm text-gold">{yearVoice(run.year)}</p>
        <PixelBtn className="mt-6 h-12" onClick={finishYearStart}>
          Morning
        </PixelBtn>
      </Shell>
    );
  }

  if (meta.type === "mentor-event") {
    const pitcher = isPitcherStyle(who.style);
    return (
      <Shell runTurn={run.turn} label={dateLabel(meta, who.style)}>
        <p className="font-ui text-base leading-relaxed text-cream/90">
          {pitcher
            ? "Bullpen Coach stays after the last pitch. Just the two of you and the rubber."
            : "Cage Coach stays after the last bucket. Just the two of you in the tunnel."}
        </p>
        <PixelBtn className="mt-6 h-12" onClick={finishMentor}>
          Listen
        </PixelBtn>
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
      setCatchBeat={setCatchBeat}
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
  const openTitle = useShine((s) => s.openTitle);
  const openSettings = useShine((s) => s.openSettings);
  const last = run.calendar.at(-1);
  const who = sheet(run.characterId);
  const idx = last?.type && last.type in PG_INDEX ? PG_INDEX[last.type as keyof typeof PG_INDEX] : 0;
  const parkId = datePark(last?.type ?? "", who.parkId);
  const skin = curtainSkin(parkId);
  const [curtain, setCurtain] = useState(() => shouldCurtainCall(last?.type ?? "", run.pgResults[idx] === "met"));
  const verses = cheerLines(run.characterId, run.fans);
  const [canSkipCurtain, setCanSkipCurtain] = useState(() => last?.type !== "lantern-classic");

  useEffect(() => {
    if (last?.type !== "lantern-classic") return;
    const t = window.setTimeout(() => setCanSkipCurtain(true), 18000);
    return () => window.clearTimeout(t);
  }, [last?.type]);

  const met = run.pgResults[idx] === "met";
  const seriesFinale = last?.type === "series" ? seriesFinaleLine(run) : null;
  const film = endingFilmSrc(run.characterId, met ? "A" : "C");
  const clip = endingClipSrc(run.characterId, met ? "A" : "C");

  if (curtain) {
    const call = curtainFilmSrc(run.characterId);
    return (
      <main className="relative min-h-dvh overflow-hidden bg-ink text-cream" data-curtain={last?.type ?? "date"}>
        <img src={call} alt="" className="absolute inset-0 size-full object-cover object-[center_18%]" data-curtain-film={run.characterId} />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/15" />
        <div className="relative z-10 flex min-h-dvh flex-col">
          <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-8">
            <p className="episode-chip w-fit">{skin === "otachidai" ? "お立ち台" : "Dugout"}</p>
            <p className="font-display text-[10px] uppercase tracking-widest text-gold">Curtain Call</p>
            <div className="flex items-center gap-2">
              <ShineMute />
              <ShineRoundBtn icon="settings" label="Settings" onClick={openSettings} />
              <ShineBack onClick={openTitle} />
            </div>
          </div>
          <div className="mt-auto px-4 pb-8 sm:px-8">
            <p className="font-display text-lg font-bold">{last ? dateLabel(turnMeta(last.turn), who.style) : "The game"}</p>
            <p className="mt-2 max-w-md font-ui text-base leading-relaxed text-cream/90 sm:text-lg">{curtainCallLine(who.curtainCall, skin)}</p>
            <p className="mt-3 font-ui text-xs text-cream/70">
              {curtainCaption(run.characterId)} {skin === "otachidai" ? "応援歌." : "Walk-up."}
            </p>
            {verses.map((v, i) => (
              <p key={i} className="mt-2 font-ui text-xs text-gold/85">
                {v}
              </p>
            ))}
            {canSkipCurtain ? (
              <PixelBtn
                className="mt-6 h-12"
                onClick={() => {
                  // "Back to the complex" takes this spot; re-arm the guard so a double tap can't skip the read.
                  bumpView();
                  setCurtain(false);
                }}
              >
                Hold the still
              </PixelBtn>
            ) : (
              <p className="mt-6 font-ui text-sm text-cream/70">The first Lantern Classic Call is hers.</p>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-ink text-cream" data-after-pa={last?.type ?? "date"}>
      <img src={film} alt="" className="absolute inset-0 size-full object-cover object-[center_18%] opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/30" />
      <div className="relative z-10 mx-auto flex min-h-dvh max-w-5xl flex-col px-4 py-8 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <p className="episode-chip w-fit">{last ? dateLabel(turnMeta(last.turn), who.style) : "The game"}</p>
          <div className="flex items-center gap-2">
            <ShineMute />
            <ShineRoundBtn icon="settings" label="Settings" onClick={openSettings} />
            <ShineBack onClick={openTitle} />
          </div>
        </div>
        <div className="mt-auto max-w-md pb-2">
          <p className="font-display text-lg font-bold">
            {last?.type === "finale" ? "Diamond Finale." : met ? who.pgVerb : "The goal slipped."}
          </p>
          {lastLine ? (
            <p className="mt-2 font-ui text-base leading-relaxed text-cream/90">
              {dateSpeech(lastLine)}
            </p>
          ) : null}
          {run.fanBeat ? <p className="mt-3 font-ui text-sm text-gold">{run.fanBeat}</p> : null}
          {last?.type === "gate" ? <SceneBlock scene={relationshipScene(run, "post-gate")} /> : null}
          {last?.type === "first-light" && run.keepsake === "dirt" ? (
            <p className="mt-3 font-ui text-sm text-gold">She kept a pinch of dirt from the baseline and wrapped it in a sock. &ldquo;Don&apos;t tell anyone. It&apos;s dirt.&rdquo;</p>
          ) : last?.type === "first-light" && run.keepsake === "ball" && isPitcherStyle(who.style) ? (
            <p className="mt-3 font-ui text-sm text-cream/70">She kept the last-out ball.</p>
          ) : last?.type === "first-light" && run.keepsake !== "dirt" ? (
            <p className="mt-3 font-ui text-sm text-cream/70">
              {isPitcherStyle(who.style) ? "No ball in her pocket this time." : "The baseline stayed. No keepsake this time."}
            </p>
          ) : null}
          <p className="mt-2 font-ui text-sm text-cream/70">{recapLine(parkId, run.turn)}</p>
          {seriesFinale ? <p className="mt-3 font-ui text-sm text-gold">{seriesFinale}</p> : null}
          {last?.type === "finale" && !met ? (
            <p className="mt-3 font-ui text-sm text-cream/70">Losing the Finale doesn&apos;t take anything away from her.</p>
          ) : null}
          {run.coachWarning && last?.type !== "finale" ? <p className="mt-4 font-ui text-sm text-coral">{run.coachWarning}</p> : null}
          <p className="mt-4 font-ui text-sm text-cream/80">
            {yearFoldLine(run, dateLabel(turnMeta(run.turn), who.style), nextDateLine(run.turn, last?.type))}
          </p>
          <PixelBtn className="mt-6 h-12" onClick={dismissPostgame}>
            {postgameLeaveLabel(run, last?.type === "finale")}
          </PixelBtn>
        </div>
      </div>
    </main>
  );
}

function YearEnd() {
  const run = useShine((s) => s.run)!;
  const who = sheet(run.characterId);
  const finishCareer = useShine((s) => s.finishCareer);
  const bumpView = useShine((s) => s.bumpView);
  const dismissYearEnd = useShine((s) => s.dismissYearEnd);
  const openTitle = useShine((s) => s.openTitle);
  const openSettings = useShine((s) => s.openSettings);
  const card = run.clubhouseCard;
  const [pages, setPages] = useState(false);
  const still = card ? careerStill(run) : null;
  const film = card ? endingFilmSrc(run.characterId, card.ending) : careerFilmSrc(run.characterId);
  const clip = card ? endingClipSrc(run.characterId, card.ending) : null;

  useEffect(() => {
    if (!card) return;
    startEnding(card.ending);
    if (card.ending === "never-quit") sfxCowbell();
    return () => stopMusic();
  }, [card?.id, card?.ending]);

  if (card && still) {
    const rankLabel = endingRankLabel(card.ending);
    return (
      <main className="relative min-h-dvh overflow-hidden bg-ink text-cream" data-winning-live={card.ending}>
        <img src={film} alt="" className="absolute inset-0 size-full object-cover object-[center_18%]" />
        {clip ? (
          <video
            key={clip}
            src={clip}
            poster={film}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 size-full object-cover"
            data-winning-clip={clip}
            aria-hidden
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/15" />
        <div className="relative z-10 flex min-h-dvh flex-col">
          <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-8">
            <p className="episode-chip w-fit">{rankLabel}</p>
            <p className="font-display text-[10px] uppercase tracking-widest text-gold">Winning Live</p>
            <div className="flex items-center gap-2">
              <ShineMute />
              <ShineRoundBtn icon="settings" label="Settings" onClick={openSettings} />
              <ShineBack onClick={openTitle} />
            </div>
          </div>
          <div className="mt-auto px-4 pb-8 sm:px-8">
            <p className="max-w-md font-ui text-base leading-relaxed text-cream/90 sm:text-lg">{still.quote}</p>
            <p className="mt-3 font-ui text-sm text-gold">{still.trained}</p>
            <p className="mt-2 font-ui text-sm text-gold">{still.mentor}</p>
            <p
              className={`mt-4 font-display text-lg font-bold text-gold ${still.rank === "never-quit" ? "shine-cowbell-line" : ""}`}
            >
              {still.frame}
            </p>
            <p className="mt-1 max-w-md font-ui text-xs text-cream/70" data-ending-why>
              {still.why}
            </p>
            {pages ? (
              <>
                <p className="mt-4 max-w-md font-ui text-sm text-gold">
                  {sparkGapLine([card]) ?? `Next: Coach ${nextGirlName(run.characterId)}.`}
                </p>
                <Scrapbook highlights={card.highlights ?? run.highlights} pa={card.definingPa ?? run.definingPa} who={run.characterId} />
                <PixelBtn className="mt-6 h-12" onClick={finishCareer}>
                  Clubhouse
                </PixelBtn>
              </>
            ) : (
              <PixelBtn
                className="mt-6 h-12"
                onClick={() => {
                  if (card.ending === "never-quit") sfxCowbell();
                  // "Clubhouse" (which ends the career) lands exactly here; a double tap must not skip the scrapbook.
                  bumpView();
                  setPages(true);
                }}
              >
                The scrapbook
              </PixelBtn>
            )}
          </div>
        </div>
      </main>
    );
  }
  const nextYear = run.turn <= 20 ? "Classic year" : "Senior year";
  return (
    <main className="relative min-h-dvh overflow-hidden bg-ink text-cream" data-year-end={run.year}>
      <img src={film} alt="" className="absolute inset-0 size-full object-cover object-[center_18%]" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/15" />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-8">
          <p className="episode-chip w-fit">Year-End</p>
          <div className="flex items-center gap-2">
            <ShineMute />
            <ShineRoundBtn icon="settings" label="Settings" onClick={openSettings} />
            <ShineBack onClick={openTitle} />
          </div>
        </div>
        <div className="mt-auto px-4 pb-8 sm:px-8">
          <p className="max-w-md font-ui text-base leading-relaxed text-cream/90 sm:text-lg">
            {yearStillLine(run.characterId, run.turn, run.pgResults, run.definingPa, run.lightCard)}
          </p>
          <p className="mt-3 font-ui text-sm text-cream/80">
            {run.turn <= 20
              ? "Next spring: the Classic year. The Lantern Classic is always at Lantern Field."
              : "Next spring: her senior year. The Stretch is coming."}
          </p>
          <SceneBlock scene={relationshipScene(run, "year-end")} />
          <PixelBtn className="mt-6 h-12" onClick={dismissYearEnd}>
            {nextYear}
          </PixelBtn>
        </div>
      </div>
    </main>
  );
}

function SceneBlock({ scene }: { scene: RelationshipScene }) {
  const art = sceneFilmSrc(scene.speaker, scene.mood);
  const who = sheet(scene.speaker);
  return (
    <div className="shine-dialogue mt-4" data-testid="relationship-scene">
      {art ? <img src={art} alt="" className="h-28 w-auto shrink-0 object-cover" data-scene-film={scene.speaker} /> : null}
      <div className="shine-speech">
        <p className="shine-kana text-[11px] text-ink/50">
          #{who.number} {who.jp}
        </p>
        {scene.lines.map((l, i) => (
          <p key={i} className="mt-1 font-ui text-sm leading-relaxed">
            {l}
          </p>
        ))}
        {scene.quoted ? <p className="mt-2 font-ui text-[11px] text-ink/55">{memoryLine(scene.quoted)}</p> : null}
      </div>
    </div>
  );
}

function Scrapbook({ highlights, pa, who }: { highlights: Highlight[]; pa: DefiningPa | null | undefined; who: CharacterId }) {
  const [replay, setReplay] = useState(false);
  if (!highlights.length && !pa) return null;
  return (
    <div className="mt-4 rounded-2xl border border-line bg-panel/80 p-4" data-testid="scrapbook">
      <p className="font-display text-[10px] uppercase tracking-widest text-gold">Scrapbook</p>
      <ul className="mt-2 space-y-1 font-ui text-sm">
        {highlights.slice(-8).map((h, i) => (
          <li key={`${h.turn}-${i}`} className="flex gap-2">
            <span className="shrink-0 font-display text-[10px] uppercase text-muted">{h.label}</span>
            <span className="text-cream/90">{scrapbookLine(who, h.line)}</span>
          </li>
        ))}
      </ul>
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

function Shell({ runTurn, label, children }: { runTurn: number; label: string; children: ReactNode }) {
  const run = useShine((s) => s.run);
  const openTitle = useShine((s) => s.openTitle);
  const openSettings = useShine((s) => s.openSettings);
  const park = run ? parkSrc(sheet(run.characterId).parkId) : "/bg/park-koi.jpg";
  const next = nextNamedBeat(runTurn);
  const turnsAway = Math.max(0, next.turn - runTurn);
  const style = run ? sheet(run.characterId).style : "lead";
  return (
    <main className="relative min-h-dvh overflow-hidden bg-ink text-cream">
      <img src={park} alt="" className="absolute inset-0 size-full object-cover" />
      <div className="shine-stage-wash absolute inset-0" />
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <p className="episode-chip w-fit">
            Day {runTurn} · {label}
          </p>
          <p className="font-display text-[10px] uppercase tracking-widest text-gold">
            {dateLabel(next, style)} · {daysAwayLabel(turnsAway)}
          </p>
          <div className="flex items-center gap-2">
            <ShineMute />
            <ShineRoundBtn icon="settings" label="Settings" onClick={openSettings} />
            <ShineBack onClick={openTitle} />
          </div>
        </div>
        <div className="mt-6">{children}</div>
      </div>
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
    startMusic("title");
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
            <PixelBtn
              className="h-12"
              onClick={() => {
                stopMusic();
                dismissEstablishing();
              }}
            >
              Morning
            </PixelBtn>
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
          heard ? (
            <PixelBtn className="h-12" onClick={onDone}>
              {cta}
            </PixelBtn>
          ) : null
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
        <PixelBtn className="h-12" onClick={() => resolveEvent(key, choice.effect)}>
          To work
        </PixelBtn>
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
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
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
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      before?.focus();
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
  else if (screen === "plate" && !resuming && turnType === "finale" && !run.finaleEveHeard)
    view = <StoryScreen scene={finaleEveScene(run.characterId)} chip="Diamond Finale · the night before" cta="To the park" onDone={hearFinaleEve} />;
  else if (screen === "plate" && !resuming && isRivalKind(turnType) && !run.arcsHeard?.includes(`rival:${turnType}`))
    view = <StoryScreen scene={rivalIntro(run.characterId, turnType)} chip={RIVAL_CHIP[turnType]} cta="To the park" onDone={() => hearArc(`rival:${turnType}`)} />;
  else if (screen === "complex" && run.phase === "complex" && run.pgMisses >= 1 && !run.arcsHeard?.includes("low-point"))
    view = <StoryScreen scene={lowPointScene(run.characterId)} chip="That night" cta="Tomorrow" onDone={() => hearArc("low-point")} />;
  else if (screen === "complex" && run.phase === "complex" && dueEvent) view = <EventScreen key={eventKey(dueEvent)} event={dueEvent} />;
  else if (screen === "plate") view = <ShinePlate />;
  else if (screen === "postgame") view = <Postgame />;
  else if (screen === "year-end" && run.clubhouseCard && !run.arcsHeard?.includes("ending"))
    view = (
      <StoryScreen
        scene={endingScene(run.characterId, run.clubhouseCard.ending)}
        chip={endingChip(endingTier(run.characterId, run.clubhouseCard.ending))}
        cta="To the stage"
        onDone={() => hearArc("ending")}
      />
    );
  else if (screen === "year-end") view = <YearEnd />;
  else view = <Complex />;

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
