import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NEVER_SOLD, SHOP_INTRO, SKUS, cosmeticClasses, neverSoldLine, neverSoldLines, previewClaimable, sellsPower, skuPreview } from "./commerce.ts";

describe("commerce lock", () => {
  it("prices the base game at $19.99 and expansion girls at $7.99", () => {
    assert.equal(SKUS.find((s) => s.id === "base")?.usd, 19.99);
    assert.equal(SKUS.find((s) => s.id === "girl-7")?.usd, 7.99);
    assert.equal(SKUS.find((s) => s.id === "lantern-pack")?.usd, 4.99);
    assert.equal(SKUS.find((s) => s.id === "lantern-pack")?.blurb, "Gold frames, and Koi at lantern-light.");
  });

  it("never sells sparks, plate, Finale, or Never Quit", () => {
    // Said in words a player uses: what she learns and passes on, her games, the Finale, Never Quit.
    assert.ok(NEVER_SOLD.includes("anything that makes her better at baseball"));
    assert.ok(NEVER_SOLD.includes("what she passes on to the next girl"));
    assert.ok(NEVER_SOLD.includes("a way into the Diamond Finale"));
    assert.ok(NEVER_SOLD.includes("Never Quit"));
    assert.ok(NEVER_SOLD.includes("the pictures on the Clubhouse wall"));
    assert.ok(NEVER_SOLD.includes("how her year is written on the Last Bow"));
    assert.doesNotMatch(NEVER_SOLD.join(" "), /Clubhouse cards|ending ranks/);
    assert.match(SKUS.find((s) => s.id === "deluxe")!.blurb, /Opening Season uniforms/);
    assert.doesNotMatch(SKUS.find((s) => s.id === "deluxe")!.blurb, /\blooks\b/);
    for (const item of NEVER_SOLD) assert.doesNotMatch(item, /spark|plate constant|threshold/i);
    assert.match(neverSoldLine(), /Never Quit/);
    assert.match(neverSoldLine(), /what she passes on to the next girl/);
    assert.doesNotMatch(neverSoldLine(), /spark|plate constant|threshold/i);
    const lines = neverSoldLines();
    assert.equal(lines.length, NEVER_SOLD.length);
    assert.match(lines[0]!, /better at baseball/);
    assert.match(lines.at(-1)!, /Never Quit/);
    for (const line of lines) {
      assert.doesNotMatch(line, /spark|plate constant|threshold/i, line);
      assert.match(line, /[.!]$/, line);
    }
    assert.ok(SHOP_INTRO.length >= 3);
    assert.match(SHOP_INTRO[0]!, /looks/);
    for (const line of SHOP_INTRO) {
      assert.doesNotMatch(line, /spark|plate constant|threshold/i, line);
      assert.match(line, /[.!]$/, line);
    }
    for (const sku of SKUS) {
      assert.doesNotMatch(sku.id, /spark/i);
      assert.doesNotMatch(sku.name, /^sparks?$/i);
      assert.doesNotMatch(sku.blurb, /pull rates|banners/i, sku.id);
    }
    for (const sku of SKUS) {
      assert.equal(sku.blurb.split(/(?<=[.!?])\s+/).length, 1, sku.blurb);
    }
    for (const sku of SKUS.filter((s) => s.kind === "cosmetic")) {
      assert.doesNotMatch(sku.blurb, /Nothing that changes|It only changes how things look/, sku.id);
    }
  });

  it("lets cosmetics claim in preview and never grants plate", () => {
    for (const sku of SKUS) {
      assert.equal(previewClaimable(sku), sku.kind === "cosmetic");
      assert.equal(sellsPower(sku), false);
    }
    assert.equal(cosmeticClasses(["lantern-pack", "opening-pack"]), "lantern-season broadcast-filter");
    assert.equal(cosmeticClasses([]), "");
  });

  it("shows a picture of the look for the packs that change a park, and none for a song", () => {
    const lantern = skuPreview("lantern-pack");
    assert.ok(lantern);
    assert.match(lantern.src, /park-koi/);
    assert.equal(lantern.skin, "lantern-season");
    const opening = skuPreview("opening-pack");
    assert.ok(opening);
    assert.match(opening.src, /park-kings/);
    assert.equal(opening.skin, "broadcast-filter");
    assert.equal(lantern.caption.split(/(?<=[.!?])\s+/).length, 1, lantern.caption);
    assert.equal(opening.caption.split(/(?<=[.!?])\s+/).length, 1, opening.caption);
    assert.equal(skuPreview("walk-up-alt"), null);
    assert.equal(skuPreview("base"), null);
  });
});
