# Handoff — Diamond Shine action art (2026-09-18)

For the next agent picking up the plate art. Read this, then `design/diamond-shine-action-art-build-spec-2026-09-16.md` (the phase 2 spec) and `design/diamond-shine-action-art-prompts-2026-09-17.md` (the prompt pack). Memory files under `~/.claude/projects/C--users-curti-projects-retro-diamond/memory/` carry the traps; `action-art-farm.md` is the one that matters most.

## 1. Where things stand

**Shipped and deployed.** Production (https://retro-diamond.vercel.app) is at commit `f083995` on `main`. Three commits landed this week, in order:

| Commit | What |
|---|---|
| `a57c95e` | Phase 2 of the action-art spec: the plate draws 2D stills and money-beat clips from `public/art/action/`; the three.js scene is only the render farm behind `?scene=3d&farm=1`; all six girls farmed; title warms stills instead of GLBs; telemetry on the 2D path; probes. |
| `618dadf` | Farm "close look": Reina's far-view lamps (curtain sheets, hy146 locks, emissive glow, skip-ACES) are dropped under `?farm=1` because they bleached her at 3 m; mound camera re-aimed; all three pitchers re-rendered; `scripts/first-pitch-probe.mjs`. |
| `f083995` | One still per beat after the contact hold: `settledBatterPose` maps hr → `celebrate`, k → `crushed`, walk → `trot` (new pose). Importer for generated art. Prompt pack. |

**Gates as of `f083995`:** 608 tests pass, typecheck clean, lint 0 errors (30 pre-existing warnings). Cold-cache Moto G emulation against production: in-app `first_pitch_interactive_ms` 68 ms; wall time URL-open → Step in 4.3 s (JS boot, not art; compressed JS on the 2D path is ~235 KB with no three.js).

**The product line:** nothing 3D ships. The 3D scene exists to render placeholder stills. The user considers the models crappy and wants the stills generated in the style of the portraits in `public/characters/` (864×1152 anime JPEGs, made outside this repo).

## 2. The blocker, and the one thing to do next

**Stranger test, 2026-09-17.** Five testers, page at https://claude.ai/artifact/EmyqGSwSEdGJAWXzW1FqQP, every code `DS-HKKH`:

| Beat | Named right | What they said |
|---|---|---|
| Hit | 5 / 5 | Hit |
| Strikeout | 5 / 5 | Strikeout |
| Walk | 0 / 5 | Strikeout |
| Home run | 0 / 5 | Hit |

Cause: the walk marker frame was the same pitcher release as K, and the HR marker frame was the same batter contact as a hit. Fixed structurally in `f083995`, but the three settled stills (`celebrate`, `crushed`, `trot`) are still farm placeholders that all render as a standing pose, because the 3D reaction clips (`react_success`, `react_disappoint`, `run`) do not pose in the farm. Do not spend time on that; the placeholders are meant to be replaced.

**Next step is art generation, which needs the user.** No image-model API key exists in the repo and the tool that made the portraits is not recorded anywhere. Options, in order of preference:

1. The user generates the four Aoi stills themselves with the prompt pack and hands you a folder.
2. If the Claude in Chrome extension is connected (it was not on 2026-09-17), ask which site made the portraits and drive it with the prompt pack, uploading the reference portrait. Do not enter credentials; do not accept terms on their behalf.
3. If the user supplies an image-model key, wire a small generator script in `scripts/art/` (the README there already sketches the pipeline) and run the prompt pack through it.

Files needed, minimum: `aoi-contact.png`, `aoi-celebrate.png`, `aoi-crushed.png`, `aoi-trot.png`, 3:4 portrait, any size ≥ 720×960.

## 3. Once the art exists, in order

```
# 1. Import (crops to 720×960, WebP q82, manifest update, marks source.imported so the farm keeps it)
node --experimental-strip-types scripts/art/import-action-stills.mjs <folder>

# 2. Gate
npm test && npm run typecheck && npm run lint

# 3. Rebuild the read-test page from the settled stills
node scripts/art/build-read-test.mjs            # writes .stage-probe/lantern-field-read-test.html
```

4. Publish that file with the Artifact tool, passing `url: https://claude.ai/artifact/EmyqGSwSEdGJAWXzW1FqQP` so the existing link updates (read it first with `action: "read"`, as the tool requires). The page gives each tester a `DS-<hit><k><walk><hr>` code; the Tally block at the bottom parses pasted codes against the 4-of-5 gate.
5. User sends the link to five new people. Record the codes in memory (`stranger-read-test-artifact.md`).
6. Commit the imported stills and manifest, then deploy: `vercel --prod --yes`, then confirm `/art/action/manifest.json` on production shows the imported entries. Memory `deploy-vercel-retro-diamond.md` has the post-deploy checks.

If a beat still fails 4-of-5, the fix is the picture, not the code: regenerate that one still with a clearer composition (the prompt pack says what each picture must say without words) and re-test.

## 4. Uncommitted work in the tree that is not yours

A second editor works this tree (memory `concurrent-editor-in-worktree.md`). As of this handoff these are modified but uncommitted and were not written by the session that wrote this document:

- `src/components/action/ActionStage.tsx`, `src/components/ShinePlate.tsx`, `src/components/exhibition/ShineExhibition.tsx` (mtime 2026-09-17 07:28–07:30): a "PA film bible / Hybrid E" layer, a night-park gradient backdrop behind the card, `data-pa-*` attributes.
- `src/shine/action-manifest.test.ts`: asserts `manifest.film === "hybrid-e"`. The farm already writes that field, so the suite passes; keep it if you touch the farm's manifest writer.
- `design/diamond-shine-hook-plan-2026-09-14.md`, `design/diamond-shine-plate-spec-2026-09-14.md` (edited), plus untracked `design/diamond-shine-pa-film-2026-09-17.md`, `design/diamond-shine-action-farm-angles-2026-09-17.md`, `scripts/aoi-family-reel.mjs`. The two new docs call themselves BINDING and define a five-family stranger gate (hit / foul / tip / whiff / take) that differs from the four-beat test the user actually ran.
- `scripts/blender/pipeline/__pycache__/*.pyc`: Blender bytecode churn. Never stage it.

Rules: run `find src scripts -mmin -3 -type f` before editing shared files; re-read anchors; commit only your own hunks (memory `commit-around-other-editor-wip.md` has the HEAD-blob procedure); do not fold the other editor's WIP into your commits; ask the user whether the five-family gate replaces the four-beat one before designing to it.

## 5. Commands and their traps

| Task | Command | Trap |
|---|---|---|
| Dev server | `npm run dev` (http://127.0.0.1:8080) | Every probe and the farm need it up first. |
| Farm | `npm run art:action -- --girls aoi,reina [--stills] [--clips] [--only pose,…]` | Always the GPU flags (SwiftShader freezes clips). Merges into the existing manifest. Skips stills marked `source.imported`. Refuses a manifest over budget. |
| Exhibition probe | `node scripts/action-stage-probe.mjs .stage-probe/x [--mobile]` | Expects the 2D path; prints data-action-* per cue. |
| Career plate probe | `node scripts/career-stage-probe.mjs .stage-probe/c` | The weekly pitch button is labelled "Here comes the look". |
| Phone timing | `node scripts/first-pitch-probe.mjs https://retro-diamond.vercel.app --runs 3` | Meaningless against the dev server (unbundled Vite). |
| Tests | `npm test` | Node's strip-types runner does not resolve `@/`; test files and what they import use relative paths. |
| Deploy | `vercel --prod --yes` from the repo root | CLI only, no git integration. The CLI prints a `"when": "retry deploy"` hint even on success; check `readyState: READY`. |
| Scratch files | Use the Write tool | The shell guard blocks `>` redirects into paths under the home directory. |
| `.stage-probe/` | gitignored | Probe screenshots and scratch scripts live there. |

## 5a. Game Designer lock (2026-09-18)

Binding for this round. Confirm with the user before treating five-family as the art gate.

| Lock | Value |
|---|---|
| Stranger test | Four-beat: Hit / Strikeout / Walk / Home run. Pass = 4 of 5 per beat. |
| Five-family | Runtime only (`outcomeFamily`, `AOI_FAMILY_REEL`). Not this test. No foul/tip stills this folder. |
| Stills this week | Aoi `contact` / `celebrate` / `crushed` / `trot` only. Pitcher stills after the batter set passes. |
| Clips on import | Drop Aoi's `hr` and `k` webms so the 3D overlay does not cover the anime still. Walk clip is Reina's (`clipOwner`: take → pitcher); leave it. |
| Farm | Do not pose celebrate/crushed/trot in 3D. Prompt pack is the source. |

Prompt pack updated the same day: celebrate ball-speck is mandatory; reject-if-missing on contact (no barrel ball), celebrate (no sky speck), trot (bat still in hand).

## 6. Open decisions for the user

1. Which generator made the portraits, and can it be reached (Chrome extension, API key, or manual)?
2. Once hand art exists for a girl, do the 3D money-beat clips (`hr.webm`, `k.webm`, `walk.webm`) still play over it? They are renders of the same models. The cheap answer is to delete a girl's `clips` entries from the manifest when her stills are imported; the stage then shows the still only. Nothing in code assumes a clip exists.
3. Pitcher-side stills (Reina set / release / follow) in the same style, or keep the farm placeholders until the batter set passes?
4. Four-beat gate (what was tested) versus the five-family gate in the uncommitted PA film bible.
5. Wall time under 3 s on a mid phone would need bundle work on the app shell, not art. Worth it before more testers?

## 7. File map

- `src/shine/action-art.ts` — pose vocabulary, `pictureFor`, `settledBatterPose`, budgets, URL helpers. Tests beside it.
- `src/components/action/ActionStage.tsx` — the 3:4 stage; `action-manifest.ts` loads and warms art.
- `src/components/ShinePlate.tsx`, `src/components/exhibition/ShineExhibition.tsx` — mount the stage (career plate, exhibition).
- `src/components/exhibition/Exhibition3D.tsx`, `scene/presentation.ts` (`FARM_CAMERAS`), `scene/kit-look.ts` (`heroCloseHidesMat` and friends) — the farm's scene and close look.
- `scripts/action-farm.mjs` — the farm. `POSES` and `CLIPS` are the pose table.
- `scripts/art/import-action-stills.mjs`, `scripts/art/build-read-test.mjs`, `scripts/art/read-test.template.html` — hand art in, read-test page out.
- `public/art/action/<girl>/*.webp|webm` + `manifest.json` — what ships. Budgets in `action-art.ts`.
- `public/characters/*.png` — the portraits to use as generation references.
