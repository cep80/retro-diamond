# Diamond Rise — Commerce & Sink/Faucet Design Note
**Date:** 2026-09-09  
**Author:** Economy Designer  
**Charge:** Revenue model that does not touch plate power. Numeric. Honest.  
**Binds:** GD Circle-Ups #1–#2 (sparks earned-never-pulled; `plate.ts` untouchable by any purchase; 応援歌 is presentation; credits killed for the trainer career).  
**Reopens from Studio Circle-Up #4:** "Free, nothing sold" — conditionally reopened *only for cosmetic SKUs and expansion characters*. The plate economy (sparks, stat ceilings, mentor quality) remains free-to-earn exclusively.

---

## The Honest Answer First

> **This is a $20 premium game plus $8 expansion girls, with optional $4 cosmetic packs on the side.**

Everything below is the justification and the guardrails that keep that statement true.

---

## 1. Currency in 1.0 — No Cosmetic Currency

**Recommendation: USD direct purchase only. Do not introduce a second in-game currency.**

Credits were killed for good reason — training costs turns, not credits, and a currency would immediately invite the question "can I buy more turns?" A *cosmetic* currency (Lanterns, Sparks-lite, whatever) creates a second problem: players cannot tell at a glance whether the currency is earnable, purchasable, or both. That ambiguity is where reviews turn hostile.

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **USD direct** | Transparent. No artificial exchange rate. Resistant to "what does this actually cost?" confusion. | Sticker shock on small purchases ($3.99 looks expensive when the base game is $20). | **Recommended** |
| Earnable-only cosmetic currency | Feels rewarding. Players see progress. | Engineers the variable-ratio schedule we should avoid; looks like a predatory shell without the shop to match. | Defer to post-launch if at all |
| Purchasable cosmetic currency | Maximum revenue extraction per session. | Destroys reviews. Is explicitly what the owner said not to do. | **Killed** |

**Rule:** Every SKU has a plain USD price visible before purchase. No bundles that obscure per-item cost.

---

## 2. SKU Pricing Table

### Base Game

| SKU | Price | Contents | Notes |
|---|---|---|---|
| Diamond Rise — Base | **$19.99** | All 6 launch characters (Aoi, Miki, Reina + 3), all 16 parks, full career mode, Clubhouse, weekly challenge, friends | One-time purchase. No time locks. No missing features. |
| Diamond Rise — Digital Deluxe | **$27.99** | Base + first expansion girl + "Opening Season" cosmetic pack | Launch bundle only. Saves $4 vs buying separately. |

> **Why $19.99 and not $24.99?** At $20, the game sits in the impulse-buy tier for PC (Steam) and the "I'll think about it" tier for mobile. At $25, it competes directly with $30 Switch titles and loses. Test at $19.99; raise to $24.99 on console if platform warrants. The girls carry the long-tail revenue.

### Expansion Girls

One new character every **8–10 weeks** post-launch. Each is a complete, fully-voiced career with her own academy, stats, style, mentor pool, and Clubhouse card set.

| SKU | Price | Contents |
|---|---|---|
| Expansion Girl — [Name] | **$7.99** | Full 3-year career arc, 1 walk-up song, 1 set of 応援歌 verses (3 tiers), unique ending ranks |
| Season 1 Pass (Girls 7–9) | **$19.99** | All 3 expansion girls in the pass. Saves $4 vs buying separately. No exclusive content — pass is strictly a bundle discount. |

**Rules:**
- No girl is on a "banner" with a pull rate. You pay $7.99 and she is yours. Period.
- No duplicate purchases possible. Once owned, always owned.
- No girl is exclusive to a time window after the first 30 days (soft launch exclusivity is acceptable; permanent FOMO is not).
- No girl provides a starting stat advantage over base characters. Mechanics are identical to base-game characters by design.

### Cosmetic Packs

Cosmetic packs are **not** power. They contain zero items that touch `plate.ts`, sparks, energy, mood, or mentor relationships. Staff who cannot confirm this by reading the `plate.ts` diff do not ship the pack.

| SKU | Price | Contents |
|---|---|---|
| Walk-Up Song — [Girl] Alt | **$1.99** | One alternate walk-up song for a character you already own |
| "Season of the Lantern" Cosmetic Pack | **$4.99** | Seasonal Clubhouse Card frame set (5 designs), 2 park palette variants (lantern-lit versions of `koi` and `north`), 1 alt kit color per launch character, 1 Curtain Call entrance animation variant |
| "Opening Season" Pack (launch only) | **$3.99** | Retro broadcast filter (presentation overlay during featured games), 2 throwback alt kits |

**Rules:**
- All items in a cosmetic pack are visible and listed before purchase. No mystery.
- Alt kits change colors only — zero change to `identityFor` gameplay output.
- Park palette variants are purely visual backdrop swaps (an additional lighting pass). Wind, HR factor, park.ts values are untouched.
- Walk-up songs are audio/visual only — this was locked in GD Circle-Up #2 and binds here.

---

## 3. What MUST Stay Earnable — The Clubhouse Contract

The Clubhouse must feel like *your work*. These items are **never sold** and are **always earnable through play**. This is the non-negotiable floor.

| Item | How earned | Why it cannot be sold |
|---|---|---|
| **Sparks** (all types) | Met via play conditions (§9 of GD Circle-Up #1) | Sparks modify plate.ts constants. Selling them is pay-for-Contact. Killed. |
| **Clubhouse Cards** | Every career end, every rank including D | The record of your work. Selling it would mean some players have richer histories without playing. |
| **Ending Ranks** (S/A/B/C/D/◆) | Earned by play — goals met, stat floors, fan thresholds | The ranking *is* the experience. Pay-for-rank is the oldest review killer in sports games. |
| **Fan Thresholds** (30/60/80/100 unlocks) | Character Story scenes, park banner, gold border, alt look | These are the visible proof you played this character hard. Cannot be bought. |
| **Breakthrough Events** | Mentor relationship ≥ 70, earned through turn investment | The Uma Musume "special training" moment must be earned. |
| **Diamond Finale access** | ≤1 PG miss + style stat floor by Turn 55 | Gating the finale behind a purchase would invalidate the two-miss tension system entirely. |
| **Never Quit Ending** | Miki ◆ — fans ≥ 60 + Finale locked | This is the Haru Urara fantasy. It is the game's soul. It is free. |

**The earnable floor has a simple test:** after a complete run with zero purchases, does the Clubhouse card look like you earned it? The answer must be yes. If cosmetic purchases make bought-card players visually distinguishable in a way that makes earned cards look *inferior*, re-scope the cosmetics.

---

## 4. 12-Month Revenue Mix

**Projection basis:** 15,000 unit sales at launch (conservative indie baseball niche), 60% PC / 40% mobile. No advertising spend assumed. Organic.

| Month | Revenue Event | Gross Est. | Cumulative |
|---|---|---|---|
| M0 (Launch) | Base game (15k units × $20) | $300,000 | $300k |
| M0 | Digital Deluxe upgrade (20% of buyers × $8 premium) | $24,000 | $324k |
| M0 | "Opening Season" Pack (10% attach × 15k × $4) | $6,000 | $330k |
| M2 | Expansion Girl #7 (40% buy rate × 15k × $8) | $48,000 | $378k |
| M3 | Walk-Up Alt Songs — 3 launch girls × 5% attach × 15k × $2 | $4,500 | $382k |
| M4 | "Season of the Lantern" Pack (8% attach × 20k installs × $5) | $8,000 | $390k |
| M5 | Expansion Girl #8 (35% of 20k installs × $8) | $56,000 | $446k |
| M6 | Season 1 Pass (new buyers; 5% of 25k × $20) | $25,000 | $471k |
| M7 | Walk-Up Alt Songs — Girls #7–8 | $3,000 | $474k |
| M9 | Expansion Girl #9 (30% of 30k installs × $8) | $72,000 | $546k |
| M10 | "Winter Classic" Cosmetic Pack ($5) (10% attach × 30k) | $15,000 | $561k |
| M11–12 | Holiday sale (10% new base game sales, 25k total; $14.99 sale price) | $18,750 | $580k |

**Year 1 gross estimate: ~$580k**  
Platform cut (30% console / 15% mobile / 30% PC): blended ~26% → **~$430k net**  
Taxes, Vercel/Neon infra, support: ~$30k → **~$400k to studio**

These are conservative. Every 5,000 additional units shifts the model by ~$40k net. The girl DLC is the real lever — attach rate is highly sensitive to character quality, not marketing.

**Revenue mix breakdown (Year 1):**
| Source | % of Gross |
|---|---|
| Base game + Deluxe | **59%** |
| Expansion girls (DLC direct + Season Pass) | **35%** |
| Cosmetic packs + walk-up songs | **6%** |

This is **not gacha**. It is not a subscription. It is a premium game with character DLC — the same model as fighting games (Street Fighter, Guilty Gear) and rhythm games (Hatsune Miku, DJMAX). Those models produce positive reviews when the base game is complete and the DLC is optional quality content, not missing content.

---

## 5. Anti-Goals — Explicit and Numbered

These are design constraints, not aspirations. A shipped feature that violates any of these is a rollback.

**1. No pay-for-Contact.**  
No purchase, bundle, DLC, or service may increase `CONTACT_WINDOW`, `timingMult`, `barrel` radius, or any other constant in `plate.ts`. The only mechanism that touches plate constants is **sparks**, and sparks are earned-never-pulled.

**2. No pay-for-Guts-threshold.**  
`LEVERAGE_THRESHOLD` and `GUTS_WINDOW_BONUS` are untouchable by any purchase. Purchasing a girl DLC does not give that girl a lower leverage threshold than base characters — all characters use the same formula, and Closer's `CLOSER_LEVERAGE_THRESHOLD = 1.5` override is a style rule (locked in GD Circle-Up #1), not a premium perk.

**3. No duplicate-girl banners.**  
Expansion girls are sold as direct-purchase SKUs at a fixed price. There are no "banner" mechanics, no pull rates, no pity timers for character acquisition, and no mechanism by which a player could accidentally purchase the same character twice. Each character is a single SKU with a binary owned/not-owned state.

**4. No girl behind a time-lock after 30 days.**  
Expansion girls may have a 30-day launch exclusivity window (the pass holder advantage). After 30 days, every girl is available as a direct purchase indefinitely. No girl ever enters a "vault."

**5. No earnable-then-purchasable ambiguity.**  
Every item in the game is either (a) earnable through play and free forever, or (b) a direct USD purchase with a visible price. There is no "you can grind for 80 hours or pay $4.99." If it can be bought, it is only available to buy. If it can be earned, it is only available to earn. No gray zone.

**6. No gameplay-affecting content in cosmetic packs.**  
The `plate.ts` diff from any cosmetic pack must be empty. This is enforced as a CI check: if a cosmetic pack release commit touches `src/game/core/` or `plate.ts`, the release is blocked.

---

## 6. What This Costs to Build

The revenue model above assumes:

| Feature | Engineering cost | Priority |
|---|---|---|
| IAP/store integration (Steam, App Store, Google Play) | L (1 week) | Launch requirement |
| DLC character unlock gating (character is in the build, IAP unlocks it) | M (3 days) | Launch requirement |
| Cosmetic pack application (frames, palettes, alt kits) | M (3 days) | Can slip to M2 |
| Receipt validation server-side | M (3 days) | Launch requirement |
| "No duplicate purchase" SKU check | S (1 day) | Launch requirement |

**The character DLC model has a key implication:** all expansion girl assets should ship inside the game binary or be downloaded at purchase time. No partial install that lets players preview locked content in a way that creates FOMO pressure.

---

## 7. What This Does to Reviews

**The risk is not the model — it is execution.**

Games with this model that earned positive reviews: *Into the Breach* (paid DLC, full base), *Stardew Valley* (free updates, no DLC — the aspirational ceiling), *Guilty Gear Strive* (character DLC at $7.99, honest pricing). Games with this model that earned negative reviews: any game where the base felt incomplete without the DLC; any game where DLC girls had better stats than base characters.

**The safe zone:** launch with all 6 girls *fully playable* in the base game. The first expansion girl is a genuine addition, not a restoration of cut content. Players who never buy DLC get a complete game. Players who love the game buy DLC because they want *more*, not because the base game is missing something.

If the honest answer ever becomes "players need Girl #7 to experience the full game," that is a design failure, not a pricing failure.

---

*Economy note closed. The model is: $20 game + $8 girls + optional $4 cosmetic packs. Sparks are free. The plate is free. The Clubhouse is earned. Revenue is honest.*
