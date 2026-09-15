# Diamond Shine — Live Ops and the Roster

**Product:** Diamond Shine (ダイヤシャイン) — the Pretty Derby of baseball.
**Authored:** 2026-09-14 · **Owner:** product (Coach) · **Status:** PLAN. Continues `diamond-shine-hook-plan-2026-09-14.md` (Phases 0–4). Commerce rules from `diamond-rise-liveops-aaa` and `diamond-rise-economy-aaa` stand: premium base, girls as direct-purchase SKUs, everything else earned, nothing sunsets, no gacha, no stamina.

---

## 0. North star, translated

Uma Musume keeps people for years with five things: new girls, new training scenarios, story events, a competitive calendar (Champions Meeting), and a club to belong to. Four of those are content and structure. Only one is gacha. We take the four.

| Uma does | We do | Why it still works without gacha |
|---|---|---|
| Banner girls, rate-ups | **A new girl every 6–8 weeks**, one SKU, playable in the Weekly Duel by everyone | The want is "play her story", not "pull her" |
| New training scenarios (routes) | **Academy scenarios**: a new Year with different stations, calendar and rival | Replayability without new girls |
| Time-limited story events | **Sacred-date stories** on the real calendar, permanent once unlocked | Appointment without FOMO |
| Champions Meeting | **The Circuit**: an 8-week seeded ladder against ghosts, by style | Competitive surface with ownership parity |
| Clubs | **Clubhouse**: friends as a club with a shared weekly board and ghost rivals | Belonging is the strongest retention lever we can afford |
| Support cards | **Mentors and parents**, earned in the Clubhouse (locked) | The inheritance spine stays free |

---

## 1. The roster

### 1.1 What a girl is (the kit)

A girl ships complete or not at all. The kit, all of which exists for Aoi today:

| Layer | Deliverable | Source of truth |
|---|---|---|
| Bible | id, name, jp, number, park, style, aptitude, PG verb, rival, three-year stills, unique, walk-up, curtain call, four endings, stats, potential, seven official goals with SG verbs | `src/shine/bible.ts` |
| Duel variant | how the hand of four bends for her (see §1.3) | plate spec + Duel spec |
| Rival profile | if she pitches: zone/edge/secondary/speed/up biases, two tells, reads line | `src/shine/rivals.ts` |
| Art | key visual + 3 moods, HY3D mesh, ~8 action stills, 2 money-beat clips (MVP) | `public/characters`, Blender render farm |
| Audio | walk-up, 応援歌 stem, unique sting | `public/audio` |
| Park | her home park if new (16 exist; only 5 are home to a girl) | `public/bg/park-*.jpg`, `culture.ts` |
| Tests | bible invariants, identity, Duel harness distributions, pilgrimage | `src/shine/*.test.ts`, `test:duel` |

### 1.2 Roadmap: 6 at launch, 12 in year one

Launch six: Aoi (Lead/REACH), Reina (Ace/COMMAND), Miki (Trick/FIGHT), Sol (Ace/COMMAND), Kira (Closer/HOLD), Yuki (Move/RUN). Eleven parks have no girl. Fill them one at a time, each drop pairing a new girl with an existing rival so every release is also a new story arc for someone the player already owns.

| Drop | Girl (working) | Style / verb | Home park | Story pairing | New system |
|---|---|---|---|---|---|
| +6 wk | **Hana** | Slugger / DRIVE | `kings` | Rival: Sol. The night game at Kings is her stage. | Power approach reworked around DRIVE |
| +12 wk | **Rin** | Wall / CATCH | `harbor` | Rival: Kira. The catcher who frames the ninth. | Mound Duel gets a battery partner |
| +18 wk | **Tsumugi** | Spark / SET | `forges` | Rival: Miki. The utility girl who plays anywhere. | Positional flexibility in calendars |
| +24 wk | **Nao** | Ace / COMMAND (lefty) | `irons` | Rival: Reina. Left-handed mirror of Reina's book. | Left-handed Duel (sit family flips) |
| +30 wk | **Mei** | Move / RUN | `rain` | Rival: Yuki. The wet-park steal artist. | Weather modifier on the Duel |
| +36 wk | **Kaede** | Closer / HOLD | `peaks` | Rival: Kira. Altitude, thin air, home runs fly. | Park physics as a story variable |

Names and parks are placeholders for the bible author. What is not a placeholder: each drop adds exactly one style twist and one story pairing, never two systems at once.

### 1.3 Styles and the Duel

Five styles exist and each already bends the plate. The Duel makes the bend legible:

| Style | Verb | Duel twist |
|---|---|---|
| Lead | REACH | Take reveals two book lines instead of one; walks count as reach. |
| Trick | FIGHT | Protect is free; fouls build a fight meter that widens the window. |
| Move | RUN | Take arms the steal; first-to-third on singles; the read is worth a base. |
| Ace | COMMAND | Mound Duel: the pitcher's book is on the hitter; Control widens the delivery window. |
| Closer | HOLD | Mound Duel in leverage only; the save window ×1.12 is hers. |
| **Slugger** (new) | DRIVE | Sit-hard is default; a right sit on Power doubles HR odds; whiffs cost two strikes' worth of window. |
| **Wall** (new) | CATCH | The battery partner: on the mound side she reveals the hitter's sit before the pitch. |

Two new styles across year one, no more. Seven is the ceiling for a roster a player can read at a glance.

### 1.4 Production per girl

About four weeks of pipeline per girl once the render farm exists: one week bible and Duel variant, one week key visual and mesh (HY3D → swap → clean), one week stills and two clips, one week audio, tests, and the story pairing dialogue. Two girls can overlap. The gate for a drop is the same five-person playtest: testers name her style from one PA.

---

## 2. Academy scenarios (the second axis)

A scenario is a different three-year route with the same girl: new stations, a different calendar, a different rival arm on the sacred dates, and a different ending set. Uma's scenarios are the reason a player runs the same girl five times.

| Scenario | Premise | What changes | When |
|---|---|---|---|
| **The Complex** (ship) | The locked calendar | — | 1.0 |
| **Night School** | She trains after dark; energy bands shift, night parks only | Stations: Cage → Lights; Lantern and Night Classic swap dates; Kira closes every game | month 3 |
| **Transfer Year** | Year 2 at a rival's park | Home park is the rival's; her fans start at zero; the rival's book is open | month 6 |
| **The Long Season** | A 9-inning featured game every sacred date | 3–5 PAs become full games; stamina matters for hitters | month 9 |

Scenarios are earned by finishing a career (Night School after any Finale, Transfer Year after two), never sold. Each one is a data file over the existing calendar engine plus one new station and one dialogue set; no new formulas.

---

## 3. The calendar

Everything on it is permanent once unlocked. The reminder fires once, on opt-in.

| Cadence | What | Surface |
|---|---|---|
| **Weekly** | The Weekly Duel: one seeded PA sequence against one arm, every girl allowed, server-verified | Title headline, friend board |
| **8 weeks** | The Circuit: a seeded ladder by style against ghosts; foils for top tiers; a new Circuit every 8 weeks, the old ones stay replayable | Circuit page, Yearbook foil |
| **6–8 weeks** | A girl drop, with her story pairing | Store, title tease |
| **Quarterly** | An Academy scenario | Unlock card at Finale |
| **Annual, real dates** | Lantern Classic (late Jan), Spring Gate (early Apr), Midsummer Nine (early Jul), Series Week (mid Sep), First Frost (late Oct) | Pilgrimage scenarios in the challenge library |
| **Anniversary** | A free alt look for every owned girl; the Yearbook gets a year page | Yearbook |

Sacred-date stories are the emotional live-ops: a short Character Story chapter per girl, unlocked by playing that week's scenario, kept forever.

---

## 4. The Clubhouse as a club

Friends already exist in the schema. Make them a club:

- **Shared weekly board** for the Weekly Duel and the Circuit; the title headline names the top club result.
- **Ghost rivals**: any finished career in the club becomes an arm or a bat anyone in the club can face, her name on the mound.
- **Club season**: the sum of the club's Circuit tiers earns a club patch. No bonuses to gameplay, ever; patches and Yearbook pages only.
- **Replay share** (schema exists): a PA replay is a link that opens the Duel at that count.

---

## 5. What has to exist for any of this

| System | Status | Needed for |
|---|---|---|
| Deterministic core, seeded PA streams, input logs | exists (`src/game/core`) | Weekly Duel, Circuit, replays |
| Server replay + leaderboards (Redis) | schema exists, handlers partial | Weekly Duel, Circuit |
| Content manifest with versions | partial (3D manifest only) | Girl drops, scenarios without app updates |
| Scenario data format over the calendar engine | none | Academy scenarios |
| Girl SKU + ownership (Stripe, binary owned) | designed, not built | Girl drops |
| Notification opt-in, one reminder | none | Sacred dates |
| Telemetry events from the hook plan | partial | All gates |

Build order: content manifest → scenario format → server replay → Circuit → notifications. Girls can ship on the manifest alone.

---

## 6. Anti-goals, restated

No banners, no pity, no stamina, no rotating store, no limited girls, no gameplay bonuses for clubs or supporters, no content that sunsets, no reminder that fires without opt-in. If a mechanic needs FOMO to work, it does not ship.

---

## 7. Open decisions for the owner

1. First new girl: a Slugger (new style, new Power loop) or a lefty Ace (new Duel twist, no new style)? Plan assumes the Slugger.
2. Scenario cadence: quarterly is a lot of dialogue. Two in year one is the floor.
3. The Circuit's ranking: by style (fair, small pools) or open (bigger pools, style meta)? Plan assumes by style.
