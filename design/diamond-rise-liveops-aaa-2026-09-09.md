# Diamond Rise — Live-Ops: AAA Retention + Revenue
**Date:** 2026-09-09  
**Author:** Live-Ops Design  
**Binding prior art:** Studio circle-ups #1–#4. All locks carry forward except as explicitly reopened here.  
**Charge:** Reopen monetization only as far as reviews will forgive. Recommend one stack. Do not split the difference into "a little gacha."

---

## 1. The Honest Fork

### Path A — Uma Scale (gacha)

Uma Musume (CY 2023) generated ≈¥80B from training-support gacha. The mechanics that produced that revenue are: (1) rate-up banners with 3 % SSR pulls, (2) training-support cards that directly amplify career outcomes, (3) limited seasonal characters locked behind spending, (4) a stamina gate that keeps the daily session short and the purchase nudge frequent.

**What it would cost Diamond Rise to go there:**  
Lock Reina, Miki, and future girls behind banner pools. Make Clubhouse parents (the game's inheritance spine) into gacha training-support cards with stat modifiers. Add stamina. This produces the Uma model.

**What it would cost in reviews:**  
Mobile review aggregates for the last eighteen months of gacha sports titles are averaging 3.1–3.4 stars. Games in this category are not nominated for Game of the Year. They are not written about the way the owner's ambition describes. Uma itself is not eligible for English-language GOTY circuits because the model is understood. You do not have Uma's IP, Uma's install base, or ten years of Japanese franchise trust. You would accept all the ceiling-lowering and receive a fraction of the revenue.

**Verdict:** The gacha path does not produce Uma money without Uma IP. It produces mid-revenue and bad reviews. Kill it.

### Path B — Premium + Story DLC (recommended)

A paid base game — complete, fair, no content held back — plus paid girl expansion arcs that add narrative depth, new park culture, and new training scenarios. Cosmetics earned entirely by play. No gameplay stat sold.

**The comps that matter:**  
Balatro launched at $6.99 mobile, no IAP, won GOTY at TGA, and earned eight figures. Vampire Survivors was £3.29 with £4.49 legacy DLC, sold 6M+ units. Loop Hero: same template. The premium mobile niche is underserved precisely because everyone else went gacha. The reviewer who writes "Diamond Rise is the anti-Uma" is the one who generates the word of mouth.

**The money:**  
$7.99 base × aggressive launch volume > gacha ARPU on a 50k DAU product. Each $3.99 girl DLC purchased by 35% of the base = meaningful recurring revenue per drop. No servers running gacha logic, no live economy team, no ban-wave management. Margin is structural.

**Recommendation: Path B.** Permanent. Do not revisit.

---

## 2. 1.0 Commerce

### Sold

| Item | Price | Rule |
|------|-------|------|
| Base game | $7.99 mobile / $9.99 PC | Includes 6 girls, 16 parks, full career, weekly challenge, cloud save, friends |
| Girl expansion arcs | $3.99 each | New Year 4+ narrative arc, new rival character, 2 new training scenarios, new park cultural content. **Base kit stats unchanged. No plate modifiers.** |
| Cultural park packs | $2.99 each | JP park expansions beyond `koi`: new 応援団 stems, お立ち台 variants, copy pool expansions. Playable on base game; expanded presentation for owners |
| Supporter tier (one-time) | $9.99 | "Diamond Circuit" badge in challenge, name in credits, early access to scenario previews. No gameplay benefit |

**30-day permanent-pool rule:** Every item sold is available forever from day of release. No seasonal store rotations. No limited-time bundles. If it was ever sold, it is still available.

### Earned by Play (Never Sold)

- All kit skins, park badges, curtain-call animations, challenge foils
- Girl companion dialogue variations (unlocked by career milestones)
- Yearbook portraits and season epitaphs
- "Diamond Circuit" patch (4 weekly challenges completed)
- Hall of Fame plaques, dynasty banners, rival heat badges
- All Legacy tier cosmetics

### Never Sold, Never Earned Behind a Wall

| Item | Reason |
|------|--------|
| Sparks (in-career progression currency) | Sparks are the game. Selling them is P2W |
| Girls' base kits | Every girl's full stat range, training arc, and plate presentation is in the base game |
| Plate power | No timing window modifier, barrel radius buff, or contact ceiling is purchasable. Ever |
| Weekly challenge attempts | The competitive surface must be fair |
| Cloud save | Hostage monetization. It is a trust feature, not a product |

---

## 3. Cadence After Launch

### Girl Expansions

Six girls at launch. Post-launch girl additions (new characters, not expansions of existing six) arrive as paid DLC arcs, ~3–4 months apart. Each new girl:
- Has a full base kit in the purchased DLC (base game players cannot play her career without the DLC)
- Does **not** affect other girls' careers unless a player has both
- Brings one new cultural park or a new park culture designation for an existing park
- Is playable in the weekly challenge regardless of ownership (fixed roster means ownership parity on the competitive surface)

**Exception — original six:** Aoi, Reina, Miki, and the other three launch girls receive post-launch expansion arcs (Year 4+ content, paid, $3.99) that deepen existing careers. Owning the base game is the only prerequisite.

### Sacred-Date Live Events (Pilgrimage, Not FOMO)

These are permanent additions to the weekly challenge scenario library, unlocked by real-world calendar date. They recur annually. No content sunsets.

| Event | Approximate Date | Scenario | Notes |
|-------|-----------------|----------|-------|
| **Lantern Classic** | Late January | `koi` park, 応援団 full treatment, 9-inning career challenge | Annual pilgrimage. Returns every year. Earning the "Lantern Circuit" badge during the Lantern Classic week is the prestige marker, but the scenario stays in the library |
| **Midsummer Nine** | Early July | `heat` park, noon blazer, pitcher fatigue escalated | The test of stamina management |
| **Diamond Day** | Launch anniversary | Rotating — the scenario that scored highest in the prior year | Community vote determines the annual return |
| **First Frost** | Late October | `north` or `kings`, late-season elimination tension | New scenario each year |

**Rule:** Sacred-date events are *opt-in awareness*, not FOMO mechanics. The challenge reminder fires once, on opt-in. The scenario unlocks on the calendar date and stays in the library. Missing the week costs you a week on the leaderboard; it costs you nothing permanent.

### Weekly Challenge (Ongoing)

The scenario library grows by 1–2 entries per month post-launch. The target library at 12 months is 36 scenarios. Existing scenarios rotate back into the weekly slot; the full library is always playable in the unranked scenario replay mode (1.1, circle-up #4 §17).

### Nothing Sunsets

**The rule, stated once and never reopened:** No content introduced post-launch is removed from the game. No scenario retires. No challenge badge expires. No DLC is delisted. If a server ever closes, the game converts to full offline with a patch. This is the rule that makes every other retention mechanic trustworthy.

---

## 4. Retention Loops: Earned Cliffhangers

Circle-up #4 named this correctly. None of these loops are timers. They are narrative momentum.

### Next-Girl Appetite

Finish a career with Aoi. The Yearbook epitaph for her final season surfaces a two-line tease: another girl's name in a news headline — Reina's name appears in a press item about the team that just eliminated Aoi's club in the playoffs. That name is present in the roster data for the entire career but invisible until the ending. The player who finishes the Aoi arc wants to play the Reina arc to see the same story from the other side.

**Implementation:** `sessionHook` type `rival_career_tease` fires on the final `postGame` screen when a career ends (ring or retirement). One sentence, no menu item, no push notification. The hook is the sentence.

### Inherited Copy

When a career ends, the finished athlete is available as a Clubhouse parent in the next career — any girl, any user. This is the Uma training-support mechanic without the gacha layer. The parent's stats are derived from the actual career the player ran, not from a purchased card's ceiling. A Clubhouse parent who won the Lantern Classic with a .312 average in Year 3 passes different stats than one who barely cleared Amateur rank.

**The cliffhanger:** The best Clubhouse parents a player can get are the ones their friends finished. The weekly challenge leaderboard is also an implicit ranking of whose career you want to inherit. The social loop is: play challenge → finish careers → produce parents → share parents → friends import them.

**The copy:** "She's available to the clubhouse now." No menu push. The player finds her when they start the next career.

### Friend Carry

A friend's finished career can be imported as a Clubhouse parent via friend code (the 8-char Crockford code already in the platform layer). The import adds her to the parent pool with a friend badge. This is visible on the weekly leaderboard: a friend's score annotated with the career record of the parent they ran. The implied read: "They ran a .334 career with Miki and scored 840 in this week's challenge. I want that parent."

**Cap:** 3 imported friend parents active per career. Prevents the social layer from replacing the solo loop.

### Returning Calendar

Not a stamina calendar. A *sacred-date* calendar. The PWA home screen shows the next sacred-date event and its scenario description. For lapsed players (no session in 14+ days), the re-engagement email (opt-in only) names the live event and the friend leaderboard position: "The Lantern Classic opened Monday. Your friends have posted scores. You are currently unranked."

No "your team misses you." No energy refill offer. Just: the game is playing, your friends are in it, here is the door.

---

## 5. Brand Live: The Winning Live That Ships

Uma Musume's 応援 culture extended into physical concerts and merchandise. Diamond Rise has no concert budget. It has a design sensibility and six athletes with visual identities. The merch layer is the physical Winning Live.

### Product Hierarchy

| Product | Channel | Notes |
|---------|---------|-------|
| **応援 towel** | Print-on-demand (Printful / Gelato) | One per girl, text is her 応援歌 first verse in kanji, team colors as the stripe. The towel is the away-game carry item. $22 |
| **Walk-up vinyl** | Bandcamp / digital storefronts | The six walk-up songs as a licensed 6-track EP. $5.99 digital, $18 limited physical. These are original compositions already in the game; this is the licensing layer |
| **Curtain-call still prints** | INPRNT or Society6 | The お立ち台 pose (the pixel art still frame, output at 4800px clean) as a limited print. Numbered edition per girl. $35–80 depending on size |
| **Yearbook** | Kickstarter, annual | A physical print of the season arc documents, box scores, and character art from the prior year. The content already exists; this is production and fulfillment. Target $15K Kickstarter per run |

### Integration Rule

No in-game item is paywalled behind merch purchase. Merch is the fan layer, not the access layer. If a physical product generates an in-game cosmetic (e.g., a curtain-call still purchaser receives a unique border in their Legacy view), the cosmetic is also earnable by finishing 3+ careers. Merch buyers get it faster; committed players get it free.

---

## 6. KPIs: Targets That Match the Model

These are honest numbers for a premium paid mobile game with DLC. They are not vanity metrics.

### Engagement

| Metric | D1 | D7 | D30 | Why This Target |
|--------|----|----|-----|-----------------|
| Retention | ≥ 55 % | ≥ 30 % | ≥ 15 % | Premium buyers have high intent; they paid to be here |
| Session length | ≥ 18 min | — | — | A 3-inning challenge is 8–12 min; a first office session is 6–8 min; D1 should show stacking |
| First career completion | ≥ 35 % by D7 | ≥ 55 % by D30 | — | A finished career is the next-girl hook and the inheritance engine ignition |
| Weekly challenge participation | ≥ 40 % of DAU | — | — | Below 20 % by W6 → scenario difficulty needs review |
| Careers finished / girl (D90 cohort) | ≥ 1.6 per retained user | — | — | Multi-girl play is the long arc; below 1.2 means the next-girl hook is broken |
| Careers started week 8+ (W8 signal) | ≥ 45 % of D30 retained users start a new career in weeks 7–8 | — | — | This is the clearest signal that the inherited copy loop is working |

### Revenue

| Metric | Target | Notes |
|--------|--------|-------|
| Base game conversion (free trial → paid, if trial exists) | ≥ 22 % | Industry premium mobile benchmark; if no trial, track refund rate instead (target < 3 %) |
| DLC attach rate (expansion arcs) | ≥ 30 % of base game buyers within 90 days of DLC launch | Track per-girl, not aggregate; a girl whose attach rate is < 20 % needs a content/marketing review |
| Supporter tier conversion | ≥ 5 % of active accounts (D30+) | This is the fan layer; aggressive targets corrupt the ethics |
| Merch revenue | Not a primary KPI | Merch is brand health, not margin. Track it as a leading indicator of community depth |

### Health Signals

- **Mismatch ratio** (challenge verification failures): < 0.5 %. Sustained > 2 % = exploit in the wild.
- **Cloud save conflict rate**: < 1 % of push attempts. Tracks multi-device health.
- **Churn after first career end**: track separately from total D30 churn. If > 40 % of players who finish one career do not start a second within 7 days, the next-girl hook is broken.

---

## 7. What Would Make This Predatory — Kill List

The following items are prohibited in all future design passes. Any proposal that includes them must be escalated to creative director before any design work proceeds.

| Item | Why It's Predatory |
|------|--------------------|
| Stamina / energy gate | Converts session length into a spending pressure point. Violates circle-up #4 §4 |
| Gacha rates on any item | Random outcome + real money = regulated gambling in an increasing number of jurisdictions. Also: reviews will not forgive it |
| Battle pass with expiring content | Content sunset creates FOMO that is structurally manipulative. The "nothing sunsets" rule exists specifically to prevent this |
| Clubhouse parents as gacha cards | The inheritance engine is the retention engine. Monetizing it through probability corrupts the entire social loop |
| Plate power sold at any tier | Timing window modifiers, barrel radius expansions, or any stat that affects the weekly challenge outcome sold for money. This is pay-to-win by construction |
| Girl base kits behind paywall | New girls purchased as full DLC arcs is legitimate. Locking a girl's core training arc behind a $9.99 season pass is not |
| "Limited time" language on permanent content | Copy that implies urgency where none exists is deceptive. The 30-day permanent-pool rule is the system-level fix; "available for 48 hours" language is the usage-level kill |
| Push notifications with spending nudges | "Your friends are ahead of you. Upgrade now." is a coercive pattern regardless of the reward offered |
| Loot boxes / mystery packs | Any purchase with randomized output is gacha by another name. All prices are one-to-one |
| Predatory pricing tiers | $0.99 sparks bundles designed to obscure the per-item cost of meaningful progression. All sold items have transparent, stated value |
| Difficulty-gated DLC | "This challenge is only available to Supporter tier players." Competitive integrity requires a single ladder |

---

*Circle-up #4 locked "nothing sold." This document reopens to "base game sold, story arcs sold, cosmetics earned, plate power and progression currency never sold." The line that makes this a premium game and not a gacha game is: no random outcomes, no content that disappears, no gate between the player and the game they paid for. That line is the reason critics will recommend it and the reason players will stay.*
