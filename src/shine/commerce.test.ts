import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NEVER_SOLD, SKUS, cosmeticClasses, previewClaimable, sellsPower } from "./commerce.ts";

describe("commerce lock", () => {
  it("prices the base game at $19.99 and expansion girls at $7.99", () => {
    assert.equal(SKUS.find((s) => s.id === "base")?.usd, 19.99);
    assert.equal(SKUS.find((s) => s.id === "girl-7")?.usd, 7.99);
    assert.equal(SKUS.find((s) => s.id === "lantern-pack")?.usd, 4.99);
  });

  it("never sells sparks, plate, Finale, or Never Quit", () => {
    // Said in words a player uses: what she learns and passes on, her games, the Finale, Never Quit.
    assert.ok(NEVER_SOLD.includes("anything that makes her better at baseball"));
    assert.ok(NEVER_SOLD.includes("what she passes on to the next girl"));
    assert.ok(NEVER_SOLD.includes("a way into the Diamond Finale"));
    assert.ok(NEVER_SOLD.includes("Never Quit"));
    for (const item of NEVER_SOLD) assert.doesNotMatch(item, /spark|plate constant|threshold/i);
    for (const sku of SKUS) {
      assert.doesNotMatch(sku.id, /spark/i);
      assert.doesNotMatch(sku.name, /^sparks?$/i);
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
});
