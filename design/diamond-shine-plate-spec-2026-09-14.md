# Diamond Shine — The Plate Appearance (binding)

**Product:** Diamond Shine (ダイヤシャイン) — *the Pretty Derby of baseball.*
**Authored:** 2026-09-14 · **Owner:** product (Coach) · **Status:** BINDING for every editor touching `src/shine/plate-controller.ts`, `src/components/exhibition/**`, `scripts/blender/pipeline/**`.
**Supersedes** any camera / stance / pace / hold rule in `diamond-shine-exhibition-p0-runtime.md` §0 and `diamond-shine-exhibition-aaa-next.md` that contradicts this page. Career locks in `diamond-shine-gd-circleup-4-2026-09-09.md` §2 stand.

---

## §0 — What we are, in one breath

A single-player career where you **Coach** one girl through three Academy years, and the games she plays are **watched, not piloted**. Uma Musume: you train, you set the plan, you press Go, then you watch her run and the stats and skills decide. Our race is the plate appearance. Our race view is the 3D exhibition.

We are **not** a batting sim. Nobody reads the ball by eye, nobody aims a swing mid-flight, nothing is decided by physics. That is EA's lane.

## §1 — The loop of one plate appearance

| Beat | Who acts | Input | Fiction |
|---|---|---|---|
| **Sit** | Coach | tap a cell on the 3×3 | "Sit on this pitch." Wit reveals a hot cell. |
| **Approach** | Coach | Contact / Power / Bunt | "Take your hack" / "Drive it" / "Get it down." |
| **Go** | Coach | one tap in the timing window while the ball is in flight | The green light. Her Contact / Guts widen the window; Eye tells you when the pitch is recognized. |
| **She swings** | Athlete (auto) | none | Load, stride, cut, follow-through play from the clips. Her uniques fire as stings. |
| **Result** | Sim | none | Timing error × location error × stats → beat. Sportswriter line. Reaction clip. |

Three inputs, all coaching calls. The tap is the only moment of skill and it is generous by design: an average player lands the window by PA 2 of their first session. A miss is a story beat, not a punishment.

## §2 — Rules of the window (2D and 3D share one number set)

- **One pace.** Flight time and window width are the same in the 2D plate and the 3D exhibition. The controller owns them; the presentations never scale them privately. Today's `EXHIBITION_PACE` values (flight ×2.0 of the old meter, window ×1.3, 1250 ms wind-up) become the plate's numbers everywhere. If 2D needs a shorter beat, that is a controller option, not a fork.
- **The bar is the truth.** Timing is judged on the controller clock (`tap` / `tapAtProgress`), never on where the ball or the bat happens to be drawn. The 3D ball is drawn *to* the clock: it must cross the plate exactly as the marker hits gold.
- **Recognition** (`recognizeAt`) is when the pitch type resolves on the HUD. Eye moves it earlier. It never gates the tap.
- **Stats decide.** Window half-width, barrel size, power, HR odds, leverage and Last Spurt come from her sheet and the game state. No presentation layer adds skill inputs.

## §3 — The race view (3D exhibition and, later, featured games)

The 3D scene is a **camera on the story**, not a sim. It obeys the controller's cues and nothing else.

| Element | Rule |
|---|---|
| Camera | Locked catcher cam, mask height behind the plate, looking out at the mound (`CAMERA_LOCK`). Punch on barreled contact only. No cuts, no free camera. |
| Batter | **Side-on in her box, facing the plate**, pitcher on her left (`BATTER_ROTATION_Y = π/2`, RH box x = −0.95). This is the product owner's call (2026-09-14). Do not flip her square to the mound again. |
| Batter motion | Authored clips, on-beat: stance until the flight cue; load → stride → hip turn during the flight, slowed so the frame before `contact` lands as the marker reaches gold; a tap runs the cut through; a take holds her up (check swing). Reaction clips after the result. The bat follows the line through both hands while a swing clip plays. |
| Pitcher | Plays the full `pitch_delivery` through the wind-up, timed so `release` lands on the flight cue, then the follow-through. Nothing freezes on a held pose. |
| Ball | Spawns from her live throwing hand at release, flies on the controller clock, crosses at the sit cell. Off-bat flights are canned arcs per beat. |
| Cast | No catcher, no umpire, no fielders, no mitt props. The camera is the catcher. |
| Park | Lantern Field at night. No fixtures on the playing surface. |
| Faces | Not designed for. The camera does not read faces. Character reads come from silhouette, hair, number, walk-up. |
| Fidelity bar | Uma race view: readable, on-beat, stylized. Not motion-captured. Not physically causal. |

## §4 — Forbidden (the EA list)

Swing aim or bat control during flight · pitch reading by eye · hit physics or contact points · catcher / umpire / fielders in frame · broadcast cameras · player pitching in the exhibition · any presentation-only pace or window scaling · designing acting for faces · a second timing input.

## §5 — What "Pretty Derby of baseball" means outside the plate

Already built and locked: training turns with energy and mood, the seven sacred games as the race calendar, the two-miss fail clock, fans and Character Story, uniques as stings, sparks and inheritance, the Finale rank card, curtain calls. The plate spec above exists to make those stakes land in thirty seconds of watching her. Anything that makes the thirty seconds *harder* rather than *clearer* is out of lane.

## §6 — Decisions closed today

1. Batter is side-on, facing the plate. 2. The delivery plays through; the scanned throw-pose freeze is deleted. 3. The catcher and both mitt props are gone. 4. Camera is the catcher cam; pull-back and fov are presentation tuning (current: z 4.4, fov 33) and stay within "catcher cam". 5. Hero clips are 24 fps (`validate` enforces length). 6. The swing is the authored seven-key clip driven by the flight cue. 7. `EXHIBITION_PACE` is the plate pace and is to be promoted to the controller default for the 2D plate in the next slice.

## §7 — Acceptance (must stay green)

- `npm test` — controller and presentation suites, including `first-pitch * at exhibition pace`.
- `node scripts/blender/run.mjs validate` — clip lengths on the 24 fps contract.
- GPU captures via `scripts/exhibition-capture.mjs` for a take (load / stride / hold-up) and a swing (contact / follow-through) from the locked cam, checked against §3.
- A naive player: understands sit + Go before pitch 1, lands the window by PA 2. (Onboarding copy in `onboarding.ts`.)
