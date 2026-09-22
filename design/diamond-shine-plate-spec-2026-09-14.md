# Diamond Shine — The Plate Appearance (binding)

**Product:** Diamond Shine (ダイヤシャイン) — *the Pretty Derby of baseball.*
**Authored:** 2026-09-14 · **Owner:** product (Coach) · **Status:** BINDING for every editor touching `src/shine/plate-controller.ts`, `src/components/exhibition/**`, `scripts/blender/pipeline/**`.
**Supersedes** any camera / stance / pace / hold rule in `diamond-shine-exhibition-p0-runtime.md` §0 and `diamond-shine-exhibition-aaa-next.md` that contradicts this page. Career locks in `diamond-shine-gd-circleup-4-2026-09-09.md` §2 stand.

---

## §0 — What we are, in one breath

A single-player career where you **Coach** one girl through three Academy years, and the games she plays are **watched, not piloted**. Uma Musume: you train, you set the plan, you press Go, then you watch her run and the stats and skills decide. Our race is the plate appearance. Our race view is the **Hybrid E PA film** (cue → stills / clips) — see [`diamond-shine-pa-film-2026-09-17.md`](diamond-shine-pa-film-2026-09-17.md). Live 3D is a render farm only.

We are **not** a batting sim. Nobody reads the ball by eye, nobody aims a swing mid-flight, nothing is decided by physics. That is EA's lane.

## §1 — The loop of one plate appearance

| Beat | Who acts | Input | Fiction |
|---|---|---|---|
| **Sit** | Coach | tap a cell on the 3×3 | "Sit on this pitch." Wit reveals a hot cell. |
| **Go** | Coach | one press, **before** the pitch | The green light. The PA auto-plays from here; nothing is tapped in flight. |
| **She swings** | Athlete (auto) | none | `race.ts` decides swing / take and her timing from Contact, Eye, Guts, the count and how far the pitch landed from the sit. Load, cut, contact / follow play from the stills. |
| **Result** | Sim | none | Timing error × location error × stats → beat. Sportswriter line. Money clip on HR / K / walk. PA card. |

One coaching pick per plate appearance, then watching (2026-09-19 lock, §8). There is no timing tap and no approach picker; the tapped plate (`tap` / `tapAtProgress`) survives only as headless controller API for the harness and tests. A miss is a story beat, not a punishment.

## §2 — SUPERSEDED (2026-09-20)

The tapped window, timing bar, and live 3D pace fork are **dead**. Watch-only race: `race.ts` decides swing and timing from her sheet and the sit; `PlateController.swingAt` resolves it. Pictures never decide outcomes. `tap` / `tapAtProgress` survive only as headless harness API.

**Stats decide.** Barrel, power, HR odds, leverage and Last Spurt come from her sheet. No purchase and no presentation layer adds skill inputs (economy lock).

## §3 — The race view (Hybrid E PA film; 3D = farm only)

**Shipped presentation** obeys [`diamond-shine-pa-film-2026-09-17.md`](diamond-shine-pa-film-2026-09-17.md) and `src/shine/action-art.ts` / `ActionStage`. Cue → stills and money clips. Night park is a background behind the 3:4 card.

| Element | Rule |
|---|---|
| Film | Hybrid E: **mound_close** sit (pitcher looking in, close on her) + action stills on Go. Side-scroll is mini-games only. |
| Batter / pitcher art | Authored stills and clips from the action farm; poses keyed by `pictureFor`. LOOK is a still test. |
| Ball | 2D growing dot on the controller clock (`plate2dFlight`); pitch type at `recognized`. |
| Cast | No catcher / umpire / fielders as playable actors on the featured plate. |
| Park | Lantern Field night as card backdrop. |
| Faces | Readable on 3/4 hero cards (LOOK). Not an EA batting-eye read. |
| Fidelity bar | Uma race view: readable, on-beat, stylized. Not motion-captured. Not physically causal. |

### §3.1 — HUD lock (beta, 2026-09-20)

The plate is a film, not an instrument panel. Shipped in `ShineRace` / `race-ui.ts`:

| Element | Rule |
|---|---|
| Hero | Sit / take / idle use the **stance or take still**, never the character-select bust. Portrait is fallback only when a girl has no still. |
| Sit | 3×3 **under** the hero (`shine-sit-plate`). Never on her face. Dies the instant Go is pressed. Heat is +/× marks. Last pitch ghosts the crossed cell on the next pick. |
| Go | One gold button before the PA. Nothing is tapped in flight. |
| Hold | After a swing, the follow / contact / settled still stays until the next wind-up. Idle does not snap to a bust. |
| Header | One chip, one situation line, count bulbs, Mute/Pause. Scout is opt-in. |
| Onboarding | One ghost line (`RACE_COPY.firstPick`). No card, no Skip. |
| Outcome | Stage pill during field/reaction; one caption under the frame; PA card after. `cardVerdict` drops a sentence the line already said. |
| Approach | **None.** No Contact/Power/Bunt picker. |
| Duel | **Off for 1.0** (2026-09-22). One pick per at-bat: sit, then Go. `RaceController` defaults `duel: false`; `DuelPanel`, calls and cards are parked code, not shipped. Reopening it is a design call, not a bug fix. |
| Leave | Pause has Title. |

**Render farm only:** Blender cameras may produce stills. They are not the shipped plate.

## §4 — Forbidden (the EA list)

Swing aim or bat control during flight · pitch reading by eye · hit physics or contact points · catcher / umpire / fielders as required actors · player pitching in the featured plate · any presentation-only pace or window scaling · a second timing input · side-scroll as the career PA camera · live 3D as the default featured mode.

## §5 — What "Pretty Derby of baseball" means outside the plate

Already built and locked: training turns with energy and mood, the seven sacred games as the race calendar, the two-miss fail clock, fans and Character Story, uniques as stings, sparks and inheritance, the Finale rank card, curtain calls. The plate spec above exists to make those stakes land in thirty seconds of watching her. Anything that makes the thirty seconds *harder* rather than *clearer* is out of lane.

## §6 — Decisions closed

1. Featured film is Hybrid E (PA film bible). 2. Side-scroll reserved for mini-games. 3. Live 3D exhibition is farm-only. 4. Controller cues + one pace remain truth. 5. Action stills/clips are 24 fps farm contract. 6. `EXHIBITION_PACE` is the plate pace. 7. Catcher-cam rules apply only inside the farm, not the shipped plate.

## §7 — Acceptance (must stay green)

- `npm test` — controller and action-art suites (cue → picture, five-family grammar, budgets).
- Action manifest loads; first pitch interactive &lt; 3 s with warm stills.
- Stranger gate (PA film bible §2–§3): name beat family from one still; name Aoi / Reina from hero cards.
- A naive player: understands sit + Go before pitch 1 and never needs a second input. (Copy in `race-ui.ts`.)

## §8 — 2026-09-19 lock: the watch-only race, and what left the repo

**Shipped:** `src/components/ShineRace.tsx` is the one plate for exhibition, the weekly pilgrimage and the career (`ShineExhibition` / `ShinePlate` are its entry points). `src/shine/race.ts` (pure, seeded swing decision + timing; `RACE_SIGMA_MULT`, `SIT_SIGMA`, `RACE_FOUL_BAND`) and `src/shine/race-controller.ts` (pick → racing → pa-card → done, `moneyHoldMs` so a clip finishes before the card) drive `PlateController.swingAt`. Title's primary door for a fresh player is the exhibition race.

**Removed:** the Retro Diamond GM game (`src/game/*`, `App` / `Play` / `screens` / `extra-screens` / `chrome` / `PlayerAvatar`, the stub routes `r`, `f`, `profile`, `leaderboard`, `challenge`, `help`, `admin`, `api/og`, `api/cron`, `lib/server`, `lib/multiplayer`, the retro harness scripts), the timing bar and approach kinds, the live 3D exhibition and its farm (`exhibition/scene/*`, `Exhibition3D`, `scripts/blender`, `scripts/action-farm.mjs`, `public/models`, `public/sprites`, `three` / `@react-three/fiber`), and the farm-rendered stills and clips for Miki, Kira, Yuki and Sol (they wear the anime portrait hero until anime stills are imported).

**Race beat pace (same day, after the first live pass):** the tapped plate hurried whiffs and fouls back to the button in 320 ms, which on the watch-only race made the swing family a flicker a stranger could not name. `beatSpec(beat, reduced, "race")` (`BeatPace` in `beats.ts`, `PlateController.beatPace`, set by `RaceController`) holds miss / foul / foul-tip for 1000 ms (load → cut → contact → follow-through, then the count line), takes for 620 / 560 ms. Big beats are untouched. Verified live at 35 ms sampling: every in-count swing shows load → cut → (contact) → follow within ~350 ms and holds the follow-through to ~1.0 s. The PA card drops any verdict sentence the card line already said (`cardVerdict`).

**Beta film lock (2026-09-20):** sit / take / idle draw the stance or take **still**, not the character bust (`ActionStage` uses `Plate`; portrait is missing-art fallback only). The 3×3 sits **under** the hero (`shine-sit-plate`) and is gone on Go. After a swing or take, `pictureFor` keeps the last beat on idle so the still holds until the next wind-up (career practice live: load → cut → contact → follow held through the PA card). Cut-in steps are 120 ms. Money clips are authored cuts (`money-clips.mjs`): HR load → contact → celebrate, K load → cut → crushed, walk take → trot / release → follow, with a flash on the settle. Title copy sells the watch fantasy. Economy for beta is **KEEP** (`commerce.ts`, `training.ts`): USD cosmetics only, never sell sparks / plate / Clubhouse / Finale / Never Quit; shop preview claims cosmetics and refuses power SKUs. A Rookie year walks turn 1–20 in `run.test.ts` without a dead station.

**Kept, relocated:** the plate math and seeded RNG the Shine sim reads live in `src/shine/core/` (`zone.ts`, `rng.ts`, `parks.ts`; `Ballplayer` replaces the GM `Player`), audio in `src/shine/audio.ts`, telemetry in `src/lib/telemetry.ts`. `PixelBtn` (`components/pixel-btn.tsx`) is the Shine button, not Retro chrome, and stays.
