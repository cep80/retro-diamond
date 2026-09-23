"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { PixelBtn } from "@/components/pixel-btn";
import { ShineMute } from "@/components/ShineMute";
import { careerMuteAppliesToScreen, setMasterMuted, setMix, sfxCowbell, sfxSelect, startEnding, startMusic, stopMusic, unlockAudio } from "@/shine/audio.ts";
import { ShineHelp, ShineSettings } from "@/components/ShineSettings";
import { nextNamedBeat, nextDateLine, turnMeta, dateLabel, daysAwayLabel, yearOf, PLATE_TURNS } from "@/shine/calendar.ts";
import { BIBLE, careerFilmSrc, endingClipSrc, endingFilmSrc, isPitcherStyle, parkSrc, sceneFilmSrc, sheet, yearStillLine } from "@/shine/bible.ts";
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
import { finaleEveScene, promiseScene } from "@/shine/story.ts";
import { ScenePlayer } from "./ScenePlayer";
import { catchWithCoachScene, memoryLine, relationshipScene, type RelationshipScene } from "@/shine/relationship.ts";
import { keepsakeWallLine, replayLines, scrapbookLine } from "@/shine/scrapbook.ts";
import type { CharacterId, DefiningPa, Highlight, Spark } from "@/shine/types.ts";

function Title() {
  const run = useShine((s) => s.run);
  const clubhouse = useShine((s) => s.clubhouse);
  const openSelect = useShine((s) => s.openSelect);
  const openShop = useShine((s) => s.openShop);
  const openWall = useShine((s) => s.openWall);
  const openExhibition = useShine((s) => s.openExhibition);
  const continueRun = useShine((s) => s.continueRun);
  const openSettings = useShine((s) => s.openSettings);
  const openHelp = useShine((s) => s.openHelp);
  const nextHook = sparkGapLine(clubhouse);
  const [endYear, setEndYear] = useState(false);

  useEffect(() => {
    unlockAudio();
    startMusic("title");
    warmActionExhibition();
    return () => stopMusic();
  }, []);

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-ink text-cream">
      <img
        src="/bg/diamond-shine-hero.png"
        alt=""
        className="absolute inset-0 size-full object-cover object-[78%_28%]"
      />
      <div className="shine-title-wash absolute inset-0" />
      <div className="absolute right-6 top-8 z-20 sm:right-10">
        <ShineMute />
      </div>
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-end px-6 pb-10 pt-14 sm:px-10 lg:justify-center">
        <p className="episode-chip w-fit">ダイヤシャイン</p>
        <h1 className="anime-logo mt-6 max-w-2xl">
          <span>Diamond</span>
          <strong>Shine</strong>
        </h1>
        <p className="mt-6 max-w-md font-ui text-base font-medium leading-relaxed text-cream/90 sm:text-lg">
          Show her where to look. Press Go. Watch her.
        </p>
        {nextHook ? <p className="mt-3 max-w-md font-ui text-sm text-gold">{nextHook}</p> : null}
        <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
          {run ? (
            <PixelBtn
              className="h-14 justify-between px-5 text-sm"
              onClick={() => {
                unlockAudio();
                sfxSelect();
                stopMusic();
                continueRun();
              }}
            >
              {run.clubhouseCard
                ? `${sheet(run.characterId).jp} · The year is over`
                : `Continue ${sheet(run.characterId).jp} · Day ${run.turn}`}
              <span aria-hidden>→</span>
            </PixelBtn>
          ) : (
            <PixelBtn
              className="h-14 justify-between px-5 text-sm"
              onClick={() => {
                unlockAudio();
                sfxSelect();
                stopMusic();
                openSelect();
              }}
            >
              <span className="flex flex-col items-start gap-1 text-left">
                New Rookie year
                <span className="font-ui text-[11px] font-medium normal-case tracking-normal text-ink/70">Three years. One girl. Believe in her.</span>
              </span>
              <span aria-hidden>→</span>
            </PixelBtn>
          )}
          <PixelBtn
            variant="ghost"
            className="h-14"
            onClick={() => {
              unlockAudio();
              sfxSelect();
              stopMusic();
              openExhibition();
            }}
          >
            Exhibition · Pick a pair
          </PixelBtn>
          <div className="shine-title-menu">
            <PixelBtn
              variant="ghost"
              className={`h-11 ${clubhouse.length > 0 ? "border-gold/40" : ""}`}
              onClick={() => {
                sfxSelect();
                openWall();
              }}
            >
              Clubhouse{clubhouse.length > 0 ? ` · ${clubhouse.length}` : ""}
            </PixelBtn>
            <PixelBtn
              variant="ghost"
              className="h-11"
              onClick={() => {
                sfxSelect();
                openShop();
              }}
            >
              Shop
            </PixelBtn>
            <PixelBtn
              variant="ghost"
              className="h-11"
              onClick={() => {
                sfxSelect();
                openSettings();
              }}
            >
              Settings
            </PixelBtn>
            <PixelBtn
              variant="ghost"
              className="h-11"
              onClick={() => {
                sfxSelect();
                openHelp();
              }}
            >
              How it works
            </PixelBtn>
            {run && !run.clubhouseCard ? (
              endYear ? (
                <PixelBtn
                  variant="ghost"
                  className="h-11 border-coral/50"
                  onClick={() => {
                    unlockAudio();
                    sfxSelect();
                    stopMusic();
                    openSelect();
                  }}
                >
                  This year ends here
                </PixelBtn>
              ) : (
                <PixelBtn variant="ghost" className="h-11" onClick={() => setEndYear(true)}>
                  New Rookie year
                </PixelBtn>
              )
            ) : run?.clubhouseCard ? (
              <PixelBtn
                variant="ghost"
                className="h-11"
                onClick={() => {
                  unlockAudio();
                  sfxSelect();
                  stopMusic();
                  openSelect();
                }}
              >
                New Rookie year
              </PixelBtn>
            ) : null}
          </div>
        </div>
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
        <p className="episode-chip w-fit">ダイヤシャイン</p>
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
        <div className="mt-8 flex flex-wrap gap-3">
          {clubhouse.length > 0 ? (
            <PixelBtn
              className="h-12"
              onClick={() => {
                sfxSelect();
                openSelect();
              }}
            >
              Coach the next her
            </PixelBtn>
          ) : null}
          <PixelBtn variant="ghost" className="h-12" onClick={openTitle}>
            Title
          </PixelBtn>
        </div>
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
        <p className="episode-chip w-fit">ダイヤシャイン</p>
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
        <PixelBtn className="mt-6 h-12" onClick={openTitle}>
          Title
        </PixelBtn>
      </div>
    </main>
  );
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
  const who = sheet(pick);
  const art = careerFilmSrc(pick);
  const eligible = clubhouse.filter((c) => parentEligible(c, pick, clubhouse.length));
  const parent = eligible.find((c) => c.id === parentId);
  const accent = kitAccent(pick);
  const pending = manifest === null;
  const ready = filmReady(pick, manifest);

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
    <main className="shine-stage text-cream" style={{ ["--shine-accent" as string]: accent }}>
      <img src={parkSrc(who.parkId)} alt="" className="absolute inset-0 size-full object-cover" />
      <div className="shine-stage-wash absolute inset-0" />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <p className="episode-chip w-fit">ダイヤシャイン</p>
          <PixelBtn variant="ghost" className="h-9 px-3 text-[10px]" onClick={openTitle}>
            Title
          </PixelBtn>
        </div>
        <p className="shine-kana mt-4 text-sm text-gold">{who.jp}</p>
        <h1 className="mt-1 font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl">
          #{who.number} {who.name}
        </h1>
        <p className="mt-2 max-w-lg font-ui text-sm text-cream/80">Meet her first. Then three years, and you watch every one.</p>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {BIBLE.map((c) => {
            const face = careerFilmSrc(c.id);
            const on = pick === c.id;
            const inFilm = pending || filmReady(c.id, manifest);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setPick(c.id);
                  setParentId(null);
                  setSparks([]);
                }}
                className="shine-cast-card"
                style={on ? { ["--shine-accent" as string]: kitAccent(c.id) } : undefined}
              >
                {face ? <img src={face} alt="" /> : null}
                <span className="shine-cast-meta">
                  <span className="shine-kana block text-[11px] text-gold">{c.jp}</span>
                  <span className="mt-0.5 block font-display text-xs font-bold uppercase tracking-wide">
                    #{c.number} {c.name}
                  </span>
                  <span className="mt-0.5 block font-display text-[10px] uppercase tracking-widest text-cream/70">
                    {inFilm ? c.pgVerb : "Her film is not in."}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {eligible.length ? (
          <div className="mt-6">
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
        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end">
          {art ? (
            <img
              src={art}
              alt={who.name}
              className="shine-hero-stand mx-auto h-56 w-auto object-contain sm:h-72 lg:mx-0 lg:h-[22rem]"
            />
          ) : null}
          <div className="max-w-md flex-1">
            <div className="shine-speech">
              <p className="font-ui text-xs uppercase tracking-widest text-ink/55">
                vs {sheet(who.rival).jp} · {who.pgVerb}
              </p>
              <p className="mt-2 font-ui text-sm leading-relaxed">{who.past}</p>
              <p className="mt-2 font-ui text-xs text-ink/60">{who.sg}</p>
            </div>
            <PixelBtn
              className="mt-4 h-12 w-full"
              disabled={pending || !ready}
              onClick={() => {
                if (pending || !ready) return;
                startRun(pick, parentId, pickInheritSparks(parent?.sparks ?? [], sparks));
              }}
            >
              {pending || ready ? `Coach ${who.name}` : "Her film is not in."}
            </PixelBtn>
          </div>
        </div>
      </div>
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
              <PixelBtn variant="ghost" className="h-9 px-3 text-[10px]" onClick={openSettings} ariaLabel="Settings">
                Settings
              </PixelBtn>
              <PixelBtn variant="ghost" className="h-9 px-3 text-[10px]" onClick={openTitle}>
                Title
              </PixelBtn>
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
              <PixelBtn className="mt-6 h-12" onClick={() => setCurtain(false)}>
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
            <PixelBtn variant="ghost" className="h-9 px-3 text-[10px]" onClick={openSettings} ariaLabel="Settings">
              Settings
            </PixelBtn>
            <PixelBtn variant="ghost" className="h-9 px-3 text-[10px]" onClick={openTitle}>
              Title
            </PixelBtn>
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
              <PixelBtn variant="ghost" className="h-9 px-3 text-[10px]" onClick={openSettings} ariaLabel="Settings">
                Settings
              </PixelBtn>
              <PixelBtn variant="ghost" className="h-9 px-3 text-[10px]" onClick={openTitle}>
                Title
              </PixelBtn>
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
            <PixelBtn variant="ghost" className="h-9 px-3 text-[10px]" onClick={openSettings} ariaLabel="Settings">
              Settings
            </PixelBtn>
            <PixelBtn variant="ghost" className="h-9 px-3 text-[10px]" onClick={openTitle}>
              Title
            </PixelBtn>
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
            <PixelBtn variant="ghost" className="h-9 px-3 text-[10px]" onClick={openSettings} ariaLabel="Settings">
              Settings
            </PixelBtn>
            <PixelBtn variant="ghost" className="h-9 px-3 text-[10px]" onClick={openTitle}>
              Title
            </PixelBtn>
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
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-ink text-cream" style={{ ["--shine-accent" as string]: kitAccent(run.characterId) }}>
      <img src="/bg/skyline-complex.png" alt="" className="absolute inset-0 size-full object-cover opacity-40" />
      <div className="title-wash absolute inset-0" />
      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-3 py-6 sm:px-6">
        <p className="episode-chip w-fit">First Day</p>
        <ScenePlayer scene={promiseScene(run.characterId)} reduced={reduced} onDone={() => setHeard(true)} />
        {heard ? (
          <PixelBtn
            className="h-12"
            onClick={() => {
              stopMusic();
              dismissEstablishing();
            }}
          >
            Morning
          </PixelBtn>
        ) : null}
      </div>
    </main>
  );
}

/** The night before the Diamond Finale: the promise comes back, then the park. */
function FinaleEve() {
  const run = useShine((s) => s.run)!;
  const hearFinaleEve = useShine((s) => s.hearFinaleEve);
  const reduced = useShine((s) => s.settings.reducedMotion);
  const [heard, setHeard] = useState(false);
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-ink text-cream" style={{ ["--shine-accent" as string]: kitAccent(run.characterId) }}>
      <div className="title-wash absolute inset-0" />
      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-3 py-6 sm:px-6">
        <p className="episode-chip w-fit">Diamond Finale · the night before</p>
        <ScenePlayer scene={finaleEveScene(run.characterId)} reduced={reduced} onDone={() => setHeard(true)} />
        {heard ? (
          <PixelBtn className="h-12" onClick={hearFinaleEve}>
            To the park
          </PixelBtn>
        ) : null}
      </div>
    </main>
  );
}

export function ShineApp() {
  const screen = useShine((s) => s.screen);
  const overlay = useShine((s) => s.overlay);
  const hydrated = useShine((s) => s.hydrated);
  const setHydrated = useShine((s) => s.setHydrated);
  const openExhibition = useShine((s) => s.openExhibition);
  const run = useShine((s) => s.run);
  const weeklyGuest = useShine((s) => s.weeklyGuest);
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

  let view: ReactNode;
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
  else if (screen === "plate" && run && turnMeta(run.turn).type === "finale" && !run.finaleEveHeard) view = <FinaleEve />;
  else if (screen === "plate") view = <ShinePlate />;
  else if (screen === "postgame") view = <Postgame />;
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
      {overlay === "settings" ? (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Settings">
          <ShineSettings />
        </div>
      ) : null}
      {overlay === "help" ? (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="How it works">
          <ShineHelp />
        </div>
      ) : null}
    </div>
  );
}
