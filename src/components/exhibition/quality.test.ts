import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AUTO_MOBILE_MEMORY_GB,
  AUTO_PHONE_WIDTH_PX,
  effectiveTier,
  pickAutoTier,
} from "./quality.ts";

describe("exhibition auto tier", () => {
  it("keeps a 1280 mouse desktop on the desktop park", () => {
    assert.equal(pickAutoTier({ coarse: false, phoneWidth: false }), "desktop");
    assert.equal(pickAutoTier({ coarse: false, phoneWidth: false, deviceMemoryGb: 8 }), "desktop");
  });

  it("puts phone-width, coarse, and 4 GB on the mobile park", () => {
    assert.equal(pickAutoTier({ coarse: true, phoneWidth: false }), "mobile", "touch");
    assert.equal(pickAutoTier({ coarse: false, phoneWidth: true }), "mobile", "390 strip");
    assert.equal(
      pickAutoTier({ coarse: false, phoneWidth: false, deviceMemoryGb: AUTO_MOBILE_MEMORY_GB }),
      "mobile",
      "mid-range RAM",
    );
    assert.equal(pickAutoTier({ coarse: false, phoneWidth: false, deviceMemoryGb: 2 }), "mobile");
  });

  it("lets High opt into desktop and Low force mobile", () => {
    assert.equal(effectiveTier("low"), "mobile");
    assert.equal(effectiveTier("high"), "desktop");
    assert.ok(AUTO_PHONE_WIDTH_PX >= 600 && AUTO_PHONE_WIDTH_PX <= 800);
  });
});
