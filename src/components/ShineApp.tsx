"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { PixelBtn } from "@/components/pixel-btn";
import { ShineMute } from "@/components/ShineMute";
import { careerMuteAppliesToScreen, setMasterMuted, setMix, sfxCowbell, sfxSelect, startEnding, startMusic, stopMusic, unlockAudio } from "@/game/audio";
import { ShineHelp, ShineSettings } from "@/components/ShineSettings";
import { nextOfficial, turnMeta, ROOKIE_CALENDAR, calendarPeekLine } from "@/shine/calendar.ts";
import { BIBLE, endingMood, isPitcherStyle, parkSrc, portraitSrc, practiceSrc, sheet, workMood } from "@/shine/bible.ts";
import { coachBrief, workComparison } from "@/shine/coach.ts";
import { NEVER_SOLD, SKUS, cosmeticClasses, previewClaimable } from "@/shine/commerce.ts";
import { kitAccent } from "@/shine/stage.ts";
import { cheerLines, curtainSkin, curtainStillSrc, datePark, endingRankLabel, recapLine, shouldCurtainCall, yearVoice } from "@/shine/culture.ts";
import { ShineComplexWork } from "./ShineComplexWork";
import { encodeCard } from "@/shine/carry.ts";
import { careerStill, cardAltLook, cardBanner, cardGold, finaleGap, nextGirlName, parentEligible, pickInheritSparks, sparkEffectLine, sparkGapLine } from "@/shine/ending.ts";
import { PILGRIMAGE_LINE, shineIsoWeek, weatherLine, weeklySit } from "@/shine/pilgrimage.ts";
import { PG_INDEX } from "@/shine/run.ts";
import { ShinePlate } from "./ShinePlate";
import { ShineExhibition } from "./exhibition/ShineExhibition";
import { warmExhibitionAssets } from "./exhibition/scene/manifest";
import { MOOD_LABELS, moodLevel } from "@/shine/training.ts";
import { useShine } from "@/shine/store.ts";
import { catchWithCoachScene, relationshipScene, type RelationshipScene } from "@/shine/relationship.ts";
import { replayLines } from "@/shine/scrapbook.ts";
import type { CharacterId, DefiningPa, Highlight, Spark, StationId } from "@/shine/types.ts";

function Title() {
  const run = useShine((s) => s.run);
  const clubhouse = useShine((s) => s.clubhouse);
  const openSelect = useShine((s) => s.openSelect);
  const openShop = useShine((s) => s.openShop);
  const openWall = useShine((s) => s.openWall);
  const openWeekly = useShine((s) => s.openWeekly);
  const openExhibition = useShine((s) => s.openExhibition);
  const continueRun = useShine((s) => s.continueRun);
  const openSettings = useShine((s) => s.openSettings);
  const openHelp = useShine((s) => s.openHelp);
  const skipOnboarding = useShine((s) => s.skipOnboarding);
  const setSkipOnboarding = useShine((s) => s.setSkipOnboarding);
  const sit = weeklySit();
  const nextHook = sparkGapLine(clubhouse);

  useEffect(() => {
    unlockAudio();
    startMusic("title");
    warmExhibitionAssets();
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
          You are her Coach. The complex is home. The dates are on the plate.
        </p>
        {nextHook ? <p className="mt-3 max-w-md font-ui text-sm text-gold">{nextHook}</p> : null}
        <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
          <PixelBtn
            className="h-14 justify-between px-5 text-sm"
            onClick={() => {
              unlockAudio();
              sfxSelect();
              stopMusic();
              openSelect();
            }}
          >
            New Rookie year
            <span aria-hidden>→</span>
          </PixelBtn>
          {run ? (
            <PixelBtn
              variant="ghost"
              className="h-14"
              onClick={() => {
                stopMusic();
                continueRun();
              }}
            >
              Continue {sheet(run.characterId).jp} · Turn {run.turn}
            </PixelBtn>
          ) : null}
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
                stopMusic();
                openWeekly();
              }}
            >
              This week
            </PixelBtn>
            <PixelBtn
              variant="ghost"
              className="h-11"
              onClick={() => {
                sfxSelect();
                stopMusic();
                openExhibition();
              }}
            >
              Exhibition
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
          </div>
        </div>
        <label className="mt-4 flex items-center gap-2 font-ui text-xs text-muted">
          <input type="checkbox" checked={skipOnboarding} onChange={(e) => setSkipOnboarding(e.target.checked)} />
          Skip teach cards
        </label>
        <div className="mt-4 max-w-md rounded-xl border border-gold/30 bg-ink/55 px-4 py-3">
          <p className="font-display text-[10px] uppercase tracking-widest text-gold">Weekly pilgrimage</p>
          <p className="mt-1 font-ui text-xs text-cream/80">{PILGRIMAGE_LINE}</p>
          <p className="mt-2 font-ui text-xs text-muted">
            {shineIsoWeek()} · {sit.label} · vs {sit.arm === "academy" ? "Academy" : sheet(sit.arm).name} · {weatherLine(sit.weather)}
          </p>
          <p className="mt-1 font-ui text-xs text-cream/70">{sit.context}</p>
        </div>
      </div>
    </div>
  );
}

function Wall() {
  const clubhouse = useShine((s) => s.clubhouse);
  const openTitle = useShine((s) => s.openTitle);
  const openSelect = useShine((s) => s.openSelect);
  const nextHook = sparkGapLine(clubhouse);
  return (
    <main className="shine-stage text-cream">
      <img src="/bg/park-koi.jpg" alt="" className="absolute inset-0 size-full object-cover" />
      <div className="shine-stage-wash absolute inset-0" />
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <p className="episode-chip w-fit">ダイヤシャイン</p>
        <h1 className="mt-4 font-display text-2xl font-bold">Clubhouse</h1>
        <p className="mt-2 max-w-lg font-ui text-sm text-cream/80">
          Every finished run is a card on the wall. Sparks carry. Stats start fresh. Never sold.
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
              const art = portraitSrc(c.characterId, endingMood(c.ending));
              const rank = endingRankLabel(c.ending);
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
                        className={`character-cutout mx-auto mt-2 h-44 w-auto object-contain ${cardAltLook(c) ? "shine-alt-look" : ""}`}
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
                      <p className="mt-1 font-ui text-xs text-gold">Alt look. The next career that inherits her wears it.</p>
                    ) : null}
                    {c.keepsake === "dirt" ? (
                      <p className="mt-1 font-ui text-xs text-cream/70">A pinch of dirt from the baseline.</p>
                    ) : c.keepsake === "ball" ? (
                      <p className="mt-1 font-ui text-xs text-cream/70">The first-hit ball.</p>
                    ) : null}
                    <p className="mt-2 font-ui text-sm leading-relaxed text-cream/85">{c.quote}</p>
                  </div>
                  <div className="border-t border-white/10 bg-panel/80 px-4 py-3">
                    <p className="font-display text-[10px] uppercase tracking-widest text-muted">Sparks · back of the card</p>
                    <p className="mt-1 font-ui text-xs text-gold">
                      {c.sparks.slice(0, 3).map((s) => s.kind).join(" · ") || "no sparks"}
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
  const lastLine = useShine((s) => s.lastLine);
  return (
    <main className="relative min-h-dvh overflow-hidden bg-ink text-cream">
      <div className="title-wash absolute inset-0" />
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <p className="episode-chip w-fit">ダイヤシャイン</p>
        <h1 className="mt-4 font-display text-2xl font-bold">Shop · USD</h1>
        <p className="mt-2 max-w-lg font-ui text-sm text-cream/80">
          One-time prices. No banners. No pull rates. Cosmetics claim in this preview. Base and expansions wait on checkout.
        </p>
        <ul className="mt-6 space-y-3">
          {SKUS.map((s) => (
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
                }}
              >
                {previewClaimable(s) ? (owned.includes(s.id) ? "On" : "Claim preview") : "Checkout not in this preview"}
              </PixelBtn>
            </li>
          ))}
        </ul>
        {lastLine ? <p className="mt-4 font-ui text-sm text-grass-2">{lastLine}</p> : null}
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
  const lastLine = useShine((s) => s.lastLine);
  const [pick, setPick] = useState<CharacterId>("aoi");
  const [parentId, setParentId] = useState<string | null>(null);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [carry, setCarry] = useState("");
  const who = sheet(pick);
  const art = portraitSrc(pick, "focused");
  const eligible = clubhouse.filter((c) => parentEligible(c, pick, clubhouse.length));
  const parent = eligible.find((c) => c.id === parentId);
  const accent = kitAccent(pick);

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
        <p className="mt-2 max-w-lg font-ui text-sm text-cream/80">Past first. The board comes later.</p>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {BIBLE.map((c) => {
            const face = portraitSrc(c.id, "neutral");
            const on = pick === c.id;
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
                    {c.pgVerb}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {eligible.length ? (
          <div className="mt-6">
            <p className="font-display text-[10px] uppercase tracking-widest text-gold">Parent card</p>
            <p className="mt-1 font-ui text-xs text-muted">Sparks tilt the plate. Stats start fresh. Never sold.</p>
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
                <p className="mt-1 font-ui text-sm text-muted">Run 1 window. Fresh.</p>
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
                    {c.sparks.slice(0, 3).map((s) => s.kind).join(" · ") || "no sparks"}
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
              <p className="mt-2 font-ui text-xs text-gold">Alt look inherited. Fan Favorite from the last career.</p>
            ) : null}
            {parent && parent.sparks.length ? (
              <div className="mt-3">
                <p className="font-display text-[10px] uppercase tracking-widest text-gold">Pick up to 3 sparks</p>
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
        <div className="mt-6">
          <p className="font-display text-[10px] uppercase tracking-widest text-gold">Carry a card</p>
          <p className="mt-1 font-ui text-xs text-muted">Pull, never push. A Coach can carry sparks across complexes.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              value={carry}
              onChange={(e) => setCarry(e.target.value)}
              placeholder="SHINE-…"
              className="min-h-11 min-w-[12rem] flex-1 rounded-xl border border-white/20 bg-ink/70 px-3 font-ui text-sm text-cream"
              aria-label="Friend carry code"
            />
            <PixelBtn
              variant="ghost"
              className="h-11"
              onClick={() => {
                if (importCarry(carry)) setCarry("");
              }}
            >
              Carry
            </PixelBtn>
          </div>
          {lastLine ? <p className="mt-2 font-ui text-xs text-grass-2">{lastLine}</p> : null}
        </div>
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
              onClick={() => startRun(pick, parentId, pickInheritSparks(parent?.sparks ?? [], sparks))}
            >
              Coach {who.name}
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
  const eyeCard = useShine((s) => s.eyeCard);
  const looksLock = useShine((s) => s.looksLock);
  const calendarPeek = useShine((s) => s.calendarPeek);
  const storyCard = useShine((s) => s.storyCard);
  const dismissEyeCard = useShine((s) => s.dismissEyeCard);
  const dismissLooksLock = useShine((s) => s.dismissLooksLock);
  const dismissCalendarPeek = useShine((s) => s.dismissCalendarPeek);
  const dismissStoryCard = useShine((s) => s.dismissStoryCard);
  const openTitle = useShine((s) => s.openTitle);
  const openSettings = useShine((s) => s.openSettings);
  const [preview, setPreview] = useState<StationId | null>(null);
  const [intensive, setIntensive] = useState(false);
  const [sideFocus, setSideFocus] = useState<"stuff" | "control">("stuff");
  const [catchBeat, setCatchBeat] = useState(false);
  const meta = turnMeta(run.turn);
  const mood = MOOD_LABELS[moodLevel(run.mood)];
  const who = sheet(run.characterId);
  const pitcher = isPitcherStyle(who.style);
  const art = practiceSrc(run.characterId, workMood(run.mood));
  const brief = coachBrief(run);
  const comparison = run.lastWork && run.lastWork.turn === run.turn - 1 ? workComparison(run) : null;
  const next = nextOfficial(run.turn);
  const turnsAway = Math.max(0, next.turn - run.turn);
  const moodIdx = moodLevel(run.mood);

  useEffect(() => {
    if (!preview) return;
    const t = window.setTimeout(() => setPreview(null), 1000);
    return () => window.clearTimeout(t);
  }, [preview]);

  if (storyCard) {
    return (
      <Shell runTurn={run.turn} label="Letters · Fan 30">
        <p className="font-display text-[10px] uppercase tracking-widest text-gold">Character Story</p>
        <p className="mt-3 font-ui text-base leading-relaxed text-cream/90">{who.letters}</p>
        <p className="mt-3 font-ui text-sm text-gold">Letters at the complex. She&apos;s a draw. Presentation — not a plate buff.</p>
        <PixelBtn className="mt-6 h-12" onClick={dismissStoryCard}>
          Work
        </PixelBtn>
      </Shell>
    );
  }

  if (calendarPeek) {
    return (
      <Shell runTurn={run.turn} label="Calendar Preview">
        <p className="font-ui text-base leading-relaxed text-cream/90">{calendarPeekLine(run.turn)}</p>
        <p className="mt-3 font-ui text-sm text-cream/80">Your first real game. What's the last thing to sharpen?</p>
        <ol className="mt-5 flex flex-wrap gap-1">
          {ROOKIE_CALENDAR.map((b) => {
            const gate = b.type === "gate";
            const here = b.turn === run.turn;
            return (
              <li
                key={b.turn}
                className={`rounded-md border px-2 py-1 font-display text-[10px] uppercase tracking-wide ${
                  gate ? "border-gold text-gold" : here ? "border-grass-2 text-grass-2" : "border-white/15 text-muted"
                }`}
              >
                {gate ? "Academy Gate" : b.turn}
              </li>
            );
          })}
        </ol>
        <PixelBtn className="mt-6 h-12" onClick={dismissCalendarPeek}>
          Work
        </PixelBtn>
      </Shell>
    );
  }

  if (looksLock) {
    return (
      <Shell runTurn={run.turn} label="Live looks">
        <p className="shine-q-lock mx-auto w-fit font-display text-7xl font-bold text-gold" aria-hidden>
          ?
        </p>
        <p className="mt-6 font-ui text-base leading-relaxed text-cream/90">{lastLine ?? "The ? locked. She never read it out of the hand."}</p>
        <PixelBtn className="mt-6 h-12" onClick={dismissLooksLock}>
          Back to the board
        </PixelBtn>
      </Shell>
    );
  }

  if (eyeCard) {
    return (
      <Shell runTurn={run.turn} label="The ?">
        <p className="font-ui text-base leading-relaxed text-cream/90">
          Live looks are open. The pitch starts as a ?.
        </p>
        <PixelBtn className="mt-6 h-12" onClick={dismissEyeCard}>
          Work
        </PixelBtn>
      </Shell>
    );
  }

  if (catchBeat) {
    const catchScene = catchWithCoachScene(run);
    return (
      <Shell runTurn={run.turn} label="Catch with Coach">
        <SceneBlock scene={catchScene} />
        <p className="mt-3 font-ui text-xs text-muted">Once a year. Mood +1. Presentation — not a relationship resource.</p>
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
          {run.year === 2 ? "Classic year. Lantern Classic is the Derby — always at Lantern Field." : "Senior year. The Stretch is coming."}
        </p>
        <p className="mt-3 font-ui text-sm text-gold">{yearVoice(run.year)}</p>
        <PixelBtn className="mt-6 h-12" onClick={finishYearStart}>
          Work
        </PixelBtn>
      </Shell>
    );
  }

  if (meta.type === "mentor-event") {
    return (
      <Shell runTurn={run.turn} label={meta.label}>
        <p className="font-ui text-base leading-relaxed text-cream/90">
          Cage Coach stays after the last bucket. No work choice tonight — just the two of you in the tunnel.
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
      pitcher={pitcher}
      brief={brief}
      comparison={comparison}
      lastLine={lastLine}
      preview={preview}
      setPreview={setPreview}
      intensive={intensive}
      setIntensive={setIntensive}
      sideFocus={sideFocus}
      setSideFocus={setSideFocus}
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

  if (curtain) {
    const still = curtainStillSrc(skin);
    const face = portraitSrc(run.characterId, "elated");
    return (
      <Shell runTurn={run.turn} label="Curtain Call">
        <div className="relative overflow-hidden rounded-2xl border border-gold/40">
          <img src={still} alt="" className="absolute inset-0 size-full object-cover opacity-55" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-ink/20" />
          <div className="relative flex flex-col items-center px-4 py-8 text-center">
            <p className="episode-chip w-fit">{skin === "otachidai" ? "お立ち台" : "Dugout"}</p>
            {face ? (
              <img
                src={face}
                alt=""
                className={`character-cutout mt-4 h-40 w-auto object-contain sm:h-48 ${skin === "otachidai" ? "" : ""}`}
              />
            ) : null}
            <p className="mt-4 font-display text-lg font-bold">{who.walkUp}</p>
            <p className="mt-2 max-w-md font-ui text-base leading-relaxed text-cream/90">{who.curtainCall}</p>
            <p className="mt-3 font-ui text-xs text-muted">
              Cap in hand. No bat.{" "}
              {skin === "otachidai" ? "応援歌. Presentation — not a Guts buff." : "Walk-up. Presentation — not a Guts buff."}
            </p>
            {verses.map((v, i) => (
              <p key={i} className="mt-2 font-ui text-xs text-gold/85">
                {v}
              </p>
            ))}
          </div>
        </div>
        {canSkipCurtain ? (
          <PixelBtn className="mt-6 h-12" onClick={() => setCurtain(false)}>
            Hold the still
          </PixelBtn>
        ) : (
          <p className="mt-6 font-ui text-sm text-cream/70">The first Lantern Classic Call is hers.</p>
        )}
      </Shell>
    );
  }

  return (
    <Shell runTurn={run.turn} label="After the PA">
      <p className="font-display text-lg font-bold">
        {run.pgResults[idx] === "met" ? who.pgVerb : `No ${who.pgVerb}`}
      </p>
      {lastLine ? <p className="mt-2 font-ui text-base leading-relaxed text-cream/90">{lastLine}</p> : null}
      <p className="mt-2 font-ui text-sm text-cream/80">
        Support {run.sgResults[idx] === "met" ? "met" : "missed"}. Fans {run.fans}. Mood {MOOD_LABELS[moodLevel(run.mood)]}.
      </p>
      {run.fanBeat ? <p className="mt-3 font-ui text-sm text-gold">{run.fanBeat}</p> : null}
      {last?.type === "gate" ? <SceneBlock scene={relationshipScene(run, "post-gate")} /> : null}
      {last?.type === "first-light" && run.keepsake === "dirt" ? (
        <p className="mt-3 font-ui text-sm text-gold">She kept a pinch of dirt from the baseline. It means nothing. It means everything.</p>
      ) : last?.type === "first-light" ? (
        <p className="mt-3 font-ui text-sm text-cream/70">The baseline stayed. No keepsake this time.</p>
      ) : null}
      <p className="mt-2 font-ui text-sm text-cream/70">{recapLine(parkId, run.turn)}</p>
      {verses.length ? (
        <ul className="mt-3 space-y-1 rounded-xl border border-gold/30 bg-ink/60 px-4 py-3">
          <li className="font-display text-[10px] uppercase tracking-widest text-gold">応援歌 · fan tiers</li>
          {verses.map((v, i) => (
            <li key={i} className="font-ui text-xs text-gold/85">
              {v}
            </li>
          ))}
        </ul>
      ) : null}
      {last?.type === "series" ? (
        <p className="mt-3 font-ui text-sm text-gold">{finaleGap(run)}</p>
      ) : null}
      {run.coachWarning ? <p className="mt-4 font-ui text-sm text-coral">{run.coachWarning}</p> : null}
      <p className="mt-4 font-ui text-sm text-cream/80">
        Next game in {Math.max(1, nextOfficial(run.turn).turn - run.turn)} turns. Natural break.
      </p>
      <PixelBtn className="mt-6 h-12" onClick={dismissPostgame}>
        Back to the complex
      </PixelBtn>
    </Shell>
  );
}

function YearEnd() {
  const run = useShine((s) => s.run)!;
  const who = sheet(run.characterId);
  const finishCareer = useShine((s) => s.finishCareer);
  const dismissYearEnd = useShine((s) => s.dismissYearEnd);
  const card = run.clubhouseCard;
  const [frame, setFrame] = useState(true);
  const still = card ? careerStill(run) : null;
  const art = portraitSrc(run.characterId, card ? endingMood(card.ending) : "neutral");

  useEffect(() => {
    if (!card) return;
    startEnding(card.ending);
    if (card.ending === "never-quit") sfxCowbell();
    return () => stopMusic();
  }, [card?.id, card?.ending]);

  useEffect(() => {
    if (!card || !still || !frame) return;
    const t = window.setTimeout(() => setFrame(false), 12000);
    return () => window.clearTimeout(t);
  }, [card?.id, Boolean(still), frame]);

  if (card && still) {
    const rankLabel = endingRankLabel(card.ending);
    if (frame) {
      return (
        <Shell runTurn={run.turn} label={rankLabel}>
          {art ? (
            <img
              src={art}
              alt=""
              className={`character-cutout mb-4 h-52 w-auto object-contain sm:h-64 ${
                still.rank === "S" || still.rank === "A" ? "shine-dohage" : still.rank === "never-quit" ? "shine-never-quit" : ""
              }`}
            />
          ) : null}
          <p className="font-display text-[10px] uppercase tracking-widest text-gold">Frame first. Box score second.</p>
          <p className="mt-3 font-ui text-base leading-relaxed text-cream/90">{still.quote}</p>
          <p className="mt-3 font-ui text-sm text-gold">{still.trained}</p>
          <p className="mt-2 font-ui text-sm text-gold">{still.mentor}</p>
          <p
            className={`mt-4 font-display text-lg font-bold text-gold ${still.rank === "never-quit" ? "shine-cowbell-line" : ""}`}
          >
            {still.frame}
          </p>
          <PixelBtn
            className="mt-6 h-12"
            onClick={() => {
              if (card.ending === "never-quit") sfxCowbell();
              setFrame(false);
            }}
          >
            Skip
          </PixelBtn>
        </Shell>
      );
    }
    return (
      <Shell runTurn={run.turn} label={rankLabel}>
        <p className="font-ui text-xs text-muted">A pinch of dirt on the card. Flavor. She keeps it.</p>
        <p className="mt-3 font-ui text-sm text-muted">
          Sparks {card.sparks.map((s) => s.kind).join(" · ") || "none"} · fans {card.fans}
        </p>
        <p className="mt-3 rounded-xl border border-gold/40 bg-ink/70 px-4 py-3 font-ui text-sm text-gold">
          {sparkGapLine([card]) ?? `Next: Coach ${nextGirlName(run.characterId)}.`}
        </p>
        <Scrapbook highlights={card.highlights ?? run.highlights} pa={card.definingPa ?? run.definingPa} who={run.characterId} />
        <p className="mt-4 break-all font-ui text-xs text-cream/70">{encodeCard(card)}</p>
        <p className="mt-1 font-ui text-xs text-muted">A Coach can carry this. The game never asks you to share.</p>
        <PixelBtn className="mt-6 h-12" onClick={finishCareer}>
          Clubhouse
        </PixelBtn>
      </Shell>
    );
  }
  return (
    <Shell runTurn={run.turn} label="Year-End">
      <p className="font-ui text-base leading-relaxed text-cream/90">
        {run.turn <= 20 ? who.yearStills.rookie : run.turn <= 40 ? who.yearStills.classic : who.yearStills.senior}
      </p>
      <p className="mt-3 font-ui text-sm text-muted">
        {run.turn <= 20
          ? "Classic is open. Lantern Classic is always at Lantern Field."
          : "Senior is open. The Stretch is coming."}
      </p>
      <p className="mt-3 font-ui text-sm text-muted">
        PG {run.pgResults.filter((m) => m !== "pending").join(" / ") || "—"} · misses {run.pgMisses}
      </p>
      <SceneBlock scene={relationshipScene(run, "year-end")} />
      <Scrapbook highlights={run.highlights} pa={run.definingPa} who={run.characterId} />
      <PixelBtn className="mt-6 h-12" onClick={dismissYearEnd}>
        {run.turn <= 20 ? "Classic year" : "Senior year"}
      </PixelBtn>
    </Shell>
  );
}

function SceneBlock({ scene }: { scene: RelationshipScene }) {
  const art = portraitSrc(scene.speaker, scene.mood);
  const who = sheet(scene.speaker);
  return (
    <div className="shine-dialogue mt-4" data-testid="relationship-scene">
      {art ? <img src={art} alt="" className="character-cutout h-28 w-auto shrink-0 object-contain" /> : null}
      <div className="shine-speech">
        <p className="shine-kana text-[11px] text-ink/50">
          #{who.number} {who.jp}
        </p>
        {scene.lines.map((l, i) => (
          <p key={i} className="mt-1 font-ui text-sm leading-relaxed">
            {l}
          </p>
        ))}
        {scene.quoted ? <p className="mt-2 font-ui text-[11px] text-ink/55">She remembers: {scene.quoted.note}</p> : null}
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
            <span className="text-cream/90">{h.line}</span>
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
            {replay ? "Close the replay" : "Replay the at-bat"}
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
  return (
    <main className="relative min-h-dvh overflow-hidden bg-ink text-cream">
      <img src={park} alt="" className="absolute inset-0 size-full object-cover" />
      <div className="shine-stage-wash absolute inset-0" />
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <p className="episode-chip w-fit">
            Turn {runTurn} · {label}
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
  const who = sheet(run.characterId);
  const [cageLit, setCageLit] = useState(false);

  useEffect(() => {
    unlockAudio();
    startMusic("title");
    const light = window.setTimeout(() => setCageLit(true), 1400);
    const t = window.setTimeout(() => {
      stopMusic();
      dismissEstablishing();
    }, 8000);
    return () => {
      window.clearTimeout(light);
      window.clearTimeout(t);
    };
  }, [dismissEstablishing]);

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-ink text-cream">
      <img
        src="/bg/skyline-complex.png"
        alt=""
        className={`absolute inset-0 size-full object-cover ${cageLit ? "shine-cage-lit" : "opacity-80"}`}
      />
      <div className="title-wash absolute inset-0" />
      <div className="pointer-events-none absolute inset-x-0 top-8 z-10 grid grid-cols-3 px-4 text-center font-display text-[10px] uppercase tracking-[0.28em] text-gold/80 sm:px-8">
        <p className={cageLit ? "text-gold" : "text-cream/50"}>Cage</p>
        <p>Diamond</p>
        <p>Bullpen</p>
      </div>
      <p className="pointer-events-none absolute bottom-36 left-1/2 z-10 -translate-x-1/2 font-display text-[10px] uppercase tracking-[0.28em] text-cream/60">
        Clubhouse
      </p>
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-end px-6 pb-12 pt-16 sm:px-10">
        <p className="episode-chip w-fit">Skyline complex</p>
        <p className="mt-6 max-w-lg font-ui text-lg font-medium leading-relaxed text-cream/95">
          First morning at the Cage station on the complex.
        </p>
        <div className="max-w-2xl">
          <SceneBlock scene={relationshipScene(run, "opening")} />
        </div>
        <PixelBtn
          className="mt-8 h-12 max-w-sm"
          onClick={() => {
            stopMusic();
            dismissEstablishing();
          }}
        >
          Work
        </PixelBtn>
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
    warmExhibitionAssets();
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
