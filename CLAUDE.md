# Diamond Shine: notes for agents

**Continuing the build? Read `design/handoff/README.md` first.** It covers:
- the user's goal, verbatim
- where the build stands
- the review-and-build loop
- how to run the dev server, the year smoke, the career sim and a preview deploy
- the traps
- what to do next

**Every builder gets `design/handoff/builder-brief.md`.** The full history is the progress log at the bottom of `design/diamond-shine-build-plan-2026-09-22.md`.

**Quick rules:**
- `npx tsc --noEmit` and `npm test` stay green.
- Node tests use relative `.ts` imports; the `@/` alias doesn't resolve under `node --test`.
- The dev server is on port 8091; port 8080 is a different app.
- Never save a file while `scripts/year-smoke.mjs` is running.
- Balance changes go through `scripts/sims/career.sim.mts` first.
- A production deploy, payments, art and music are the user's calls.
