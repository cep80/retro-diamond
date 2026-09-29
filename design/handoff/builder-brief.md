# Builder brief: the shared rules every builder agent gets

Paste this, or point at this file, at the top of every builder's prompt. Then add the builder's ROLE: which findings to build and which files or sections it owns. It has been used for every build since check-in 22.

Project: Diamond Shine ("Uma Musume Pretty Derby, but baseball"), a mobile-first web game.
- Repo: `C:\users\curti\projects\retro-diamond` (React/TypeScript, TanStack Start, zustand, Tailwind v4 + `src/styles.css`).
- The bar is Uma Musume on a phone: warm, painted, one house style, and a stranger reads what happened from pictures.

Read these first:
- The findings your role implements. The latest creative director review is `design/handoff/creative-director-ci30-findings.md`.
- The progress log at the bottom of `design/diamond-shine-build-plan-2026-09-22.md`.

Rules:
- **Words:** everything the player sees is in the game's voice.
  - No system speak. `src/shine/story.ts` FORBIDDEN_IN_STORY must not match any story text.
  - `src/shine/identity.test.ts` bans some literal strings in source; keep it green.
  - The league is all girls (she/her). Gary, North's cage heater, is the only "he".
  - No AI tells: tricolons, "not X, it's Y", em-dash stacks.
  - Voice canon: `design/diamond-shine-voice-sheets-2026-09-22.md`, `src/shine/bible.ts`, `story-arcs.ts`, `story-endings.ts`.
- **Motion:** every animation needs a reduced-motion path, both the app's reducedMotion setting and `@media (prefers-reduced-motion)`.
- **Input:** keep the 350 ms input guard (`bumpView` when a button swaps into the same spot) and tap targets of 44 px or more.
- **Tests:** add node tests for new pure helpers. Node's `--experimental-strip-types --test` does not resolve the `@/` alias, so tests, and every module they import, use relative `.ts` imports.
- **Old saves** must keep working. Any new run field is optional, with a default. Retired copy that old saves hold stays word for word (the RETIRED_* maps).
- **Balance:** any change to asks, gains, fans or ranks is simulated first with `scripts/sims/career.sim.mts`. Targets, Coach policy:
  - big dates met 50–70% (the Gate and First Light may be higher)
  - B-or-A 75–92%
  - S 3–14%
  - early close 8–16%
- **Parallel builders:** other builders may work at the same time in this checkout. Edit only the files and sections you own.
  - `styles.css` is shared. Put new rules at the END under a header comment naming your role, and change existing rules only in your own area.
  - If an Edit fails because the file changed, re-read it and retry.
  - If tsc or npm test fails in a file you don't own, another builder is mid-edit. Wait, re-run, and leave their file alone.
- **Screenshot checks:** use a Playwright .mjs in your scratch dir.
  - Import `file:///C:/users/curti/projects/retro-diamond/node_modules/playwright/index.mjs` and launch with args `["--use-angle=gl"]`.
  - The dev server is http://localhost:8091. Check that the title is "Diamond Shine": port 8080 serves a different app.
  - With `?debug=1` you get `window.__dsShine` (get, startRun, jump, dismiss…). You can set state through `__dsShine.get()` and `jump(turn)`.
  - Check 390x844 and 360x640 (and 375x667 for the work screen), and read every screenshot you rely on.
- **Smoke runs:** don't run the full-career smoke (`scripts/year-smoke.mjs --career`) while anyone is editing. ANY file save during a run reloads the dev server and produces false `go-again` / `title-mid-year` defects. The coordinator runs it after all builders finish.
- Keep scratch files in your OS temp dir, not in the repo.
- Finish with `npx tsc --noEmit` and `npm test` green.

Report:
- files changed
- each finding and what you did
- screenshot paths
- any limits

TOOL RULES (the user must never see a permission prompt):
- Use Read, Grep, Glob, Write and Edit for files.
- Bash is allowed only for single simple commands:
  - node <absolute .mjs path> [args]
  - node --experimental-strip-types --test <one test file>
  - npx tsc --noEmit
  - npm test
  - git diff <path>
- No cd, &&, ;, pipes, loops, node -e, rm or git writes. Do not commit; the coordinator commits.
