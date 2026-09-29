# Diamond Shine: handoff for the next agent (2026-09-29)

Start here. This is enough to continue the goal without the previous session's context.

## 1. The goal (the user's words, verbatim)

> Build the entire Diamond Shine game to AAA+ Pretty Derby baseball: one watch-only sit→Go→film race for all six girls (hitters and pitchers), a playable Uma career (Rookie through Finale) that is dates not a GM board, authored film not farm/portrait, title that is the game, locked cosmetics-only economy. A stranger can sit, Go, name the beat from pictures, then play a year. Not complete until it feels like Uma race-view baseball you can launch — the whole product, not a hidden slice. i want you to review every 25 minutes with /gameplay-programmer /game-designer and /creative-director also bring in /narrative-director and /team-narrative so we can craft the story, dialogue and narrative direction. let's also clean up any AI slop speak, system speak and really capture a story and dialogue that is true to JRPGs with heart and soul and humanity

**How the user wants you to work:**
- **Don't ask whether to proceed.** Build to the finish and stop only for the user's own steps: art, music, payments, a production deploy, or anything outward-facing.
- **Keep permission prompts rare.** Use simple single Bash commands, no `cd` prefixes, no long compound commands, and the file tools for reading and editing.
- **Canon:** the league is all girls (she/her). The product is "Uma Musume Pretty Derby, but baseball": dates and a watched race, not a batting sim or a GM board.

## 2. Where it stands

**Build**
- **HEAD:** `d5d4b47` on `main`. It isn't pushed; the repo has no Vercel git integration.
- **Tests:** 838 pass (`npm test`), and `npx tsc --noEmit` is clean.
- **Score:** the creative director (check-in 30) puts it at about 55% of the way to Uma. Code alone can add maybe 3 more points; the rest is the user's art and music.

**Playtest**
- **Stranger playtest:** READY with placeholder art (creative director, check-in 30). The user is running it now.
- **Preview deploy (protected):** https://retro-diamond-70rwhc3tm-cep80s-projects.vercel.app (`d5d4b47`). The user shares it through the Vercel dashboard's Share link.
- **Production:** `retro-diamond.vercel.app` is OLD and has not been redeployed; that needs the user's go-ahead.
- **Checkout:** stubbed out ("Checkout is not in this preview.").

**The user's playtest report so far**
- **Fixed in `d5d4b47`:**
  - "music overlap": the walk-up looped under the whole date and now plays once. A song slot now always stops its old source first.
  - a React `removeChild` crash: the clip preloader appended videos to the React-owned `<body>`, and page translation was allowed. It's now detached, with notranslate.
  - manifest CORS errors on the protected preview: the link now sends credentials.
- **Not yet verified on `d5d4b47`:** a full-career smoke run. Run one for a hitter and a pitcher (see §4) before anything else.

**Balance, from the career sim (Coach policy)**
- B-or-A: 78–94%
- S: 3–13%
- early close: 0–12%
- every stat letter trainable across five facilities per role

**The full history** is the progress log at the bottom of `design/diamond-shine-build-plan-2026-09-22.md`: every check-in from 1 to 31, with what was found, the numbers, and the commits.

## 3. The loop that has been working

Each **check-in** follows the same five steps:

1. **Review.** The next reviewer in the rotation reviews the build.
2. **Build.** Builders implement the confirmed findings.
3. **Verify.** The coordinator runs `npx tsc --noEmit`, `npm test`, and a full-career smoke for one hitter and one pitcher. Look at the screenshots too.
4. **Commit.** The message says what changed and why, with the numbers, and ends with the attribution line.
5. **Log** the check-in in the build plan's progress log.

**The rotation:**

| Role | What they do |
|---|---|
| Gameplay programmer | Finds and fixes code defects: smoke runs, flow, state, honesty of what's shown. |
| Game designer | Tunes balance by simulation. Nothing changes without a sim. |
| Creative director | Scores against Uma (per area, overall %) and ranks findings as CODE / ART / COPY. Adds art needs to the art brief. |
| Narrative director (with /team-narrative for writing passes) | Voice, story, dialogue: no slop, no system speak, true to each girl. |

The creative director has re-scored about every 3–4 check-ins.

**How the roles are run (in Claude Code):**
- **General-purpose agents with a role brief.** The `game-designer` agent type has no Bash, so it can't run sims. Use a general-purpose agent with a designer brief instead.
- **Builders:** give each builder `design/handoff/builder-brief.md` plus a ROLE saying which findings it builds and which files or sections it owns.
  - Up to three builders can work in parallel in the main checkout on disjoint files. Worktree isolation fails on this machine because of path case.
  - Builders don't commit; the coordinator does.
- **Reviewers:** they write their findings to a markdown file and don't edit `src/`. The latest creative director review is `design/handoff/creative-director-ci30-findings.md`.

## 4. How to run things

- **Dev server:** `npx vite --port 8091 --strictPort`.
  - Port 8080 is a different app. Always check that the page title is "Diamond Shine".
  - `?debug=1` exposes `window.__dsShine` (`startRun(id)`, `jump(turn)`, `get()`, dismiss helpers).
- **Year smoke** (real taps, screenshots, defect and copy checks):
  - One Rookie year: `node scripts/year-smoke.mjs --girl <aoi|reina|miki|sol|kira|yuki> --fast --out <dir>`
  - A whole career to the Clubhouse: add `--career --keep-going`.
  - Other flags: `--size 360x640`, `--reduced`, `--seed <s>` to replay.
  - Output: `report.json` (outcome, endingRank, defects, copyFlags, per-date postgame text and timings) plus screenshots.
  - A career takes about 8–16 minutes. Run at most 2 at a time.
  - **Never save any file while a smoke run is going.** Vite reloads, and you get false `go-again` / `title-mid-year` defects.
- **Career balance sim:** `node --experimental-strip-types scripts/sims/career.sim.mts <N> <girls> <policies>`.
  - Policies: `even`, `coach`, `strong`.
  - Example: `... 400 aoi,yuki coach`.
  - `MUT=` tests ask swaps in memory without editing `src` (see MUTS in the file).
  - Use N ≥ 400 before trusting a difference smaller than 5 points.
- **Preview deploy:**
  1. `npm run build`
  2. `npx --no-install vercel deploy --yes --scope cep80s-projects`. Without `--scope` it fails with "Not authorized".
  3. Verify with `npx --no-install vercel curl <url> --scope cep80s-projects`. Previews are behind Deployment Protection; never disable it.
- **Production deploy:** only with the user's explicit go-ahead: `vercel deploy --prod --scope cep80s-projects`. Watch the lockfile traps in the repo's CI notes.

## 5. Traps (each one has cost a check-in)

- **Saving any project file during a smoke run** (even `design/*.md`) reloads the dev server and breaks the run.
- **Node tests** can't resolve the `@/` alias, so use relative imports.
- **A `Write` of a file you haven't read fails.** Line endings are CRLF on some files, so script edits should normalize `\r\n`.
- **Nothing may touch `document.body` or other React-owned DOM directly.** TanStack Start renders `<html>` and `<body>` through React.
- **Only `src/shine/audio.ts` owns music.** A screen gets one cue (`playScreenMusic`); a date's walk-up is one-shot; the crowd is a separate bus. Probe loops with a Playwright script that wraps `AudioBufferSourceNode.prototype.start`.
- **Balance numbers come from the sim, never from one smoke run.** A single career is one sample.
- **Old saves:** retired copy stays word for word so saved lines still match (the RETIRED_* maps), and new run fields are optional.

## 6. What to do next, in order

1. **Verify `d5d4b47`:** a full-career smoke for one hitter and one pitcher, and the audio probe. Then wait for the user's playtest notes and fix what they report first.
2. **Playtest watch-list** (the creative director's):
   - do they hesitate on the first sit?
   - do they read 失敗?
   - can they say who won the Finale?
   - which beat do they name from each picture?

   The walk and HR stills are expected to fail the last one until the art lands.
3. **Balance above band** (simulate, then apply):
   - the pitchers' Lantern and Series at 91–94% met
   - hitters' Stretch and Series at 87–94%
   - Aoi's Lantern at 46%, which is below band
4. **Creative director check-in 30 leftover** (finding 10): Yuki can reach A with four 未達成 polaroids. Consider a "small win" chip on scrapbook pages her smaller ask saved.
5. **After the art lands:**
   - flip the swap flags and re-run the stranger read test
   - have the creative director re-score
   - the flags: `FINALE_PLATE_ART_READY` in `src/components/race-ui.ts`; `LIVE_STAGE_ART_READY` in `src/shine/ending.ts`; `LIVE_SONG_FILE` and `COMPLEX_THEME_FILE` in `src/shine/audio.ts`; `OFF_MODEL_ART` in `src/shine/bible.ts` (entries come out as clean art replaces them)
6. **The user's steps. Don't do these without them:**
   - **Art, in the §11 order** of `design/diamond-shine-art-brief-2026-09-24.md`:
     1. Finale stadium and Finale at-bat stills
     2. Walk and HR stills
     3. Winning Live stages
     4. Pitcher kit and logo pass (Sol has no clean painted still)
     5. Curtain bows
     6. Place plates
     7. Stills for the five facilities
   - **Music:** a complex theme, a Finale anthem and sting, a Winning Live song.
   - **Production deploy:** go-ahead.
   - **Payments:** server-side receipt verification before any real purchase.
   - **Stranger playtest:** running it.

## 7. Where things live

**Engine (`src/shine/`)**
- `bible.ts`: the six girls, their dates and asks (`official[]`), stills, the off-model list.
- `run.ts` / `store.ts`: career state and actions.
- `training.ts`, `coach.ts`, `calendar.ts`: the work loop.
- `featured-game.ts` (hitter dates), `pitching.ts` + `mound-controller.ts` + `mound-summary.ts` (pitcher dates).
- `goals.ts`: asks and how they're evaluated.
- `ending.ts` + `ending-pictures.ts`: ranks, the Live / Last Bow and the picture budget.
- `scrapbook.ts`: the scrapbook pages and captions.
- `story*.ts`, `relationship.ts`: scenes.
- `audio.ts`: sound and music.

**Screens (`src/components/`)**
- `ShineApp.tsx`: routing, the complex shells, the postgame, the year end, the wall.
- `ShineComplexWork.tsx` + `work-day.ts`: the work screen.
- `ShineRace.tsx`: the hitter's watched race.
- `ShineMound.tsx`: the pitcher's.
- `DateChrome.tsx`: title cards, the VS splash, the Finale entrance and win.
- `race-ui.ts`: the read lines and chrome timings.

**Design (`design/`)**
- the build plan and its progress log
- the plate spec (`diamond-shine-plate-spec-2026-09-14.md`, binding)
- the voice sheets
- the art brief
- this handoff folder
