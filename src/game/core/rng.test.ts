import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashId, makeIdFactory, stream } from "./rng.ts";

describe("core rng", () => {
  it("stream is deterministic for the same seed, label, and index", () => {
    const a = stream(42, "contact", 0);
    const b = stream(42, "contact", 0);
    const seqA = [a(), a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b(), b()];
    assert.deepEqual(seqA, seqB);
  });

  it("different labels produce different sequences", () => {
    const contact = stream(42, "contact", 0);
    const fielding = stream(42, "fielding", 0);
    const seqContact = [contact(), contact(), contact(), contact(), contact()];
    const seqFielding = [fielding(), fielding(), fielding(), fielding(), fielding()];
    assert.notDeepEqual(seqContact, seqFielding);
  });

  it("makeIdFactory emits counter-based ids", () => {
    const next = makeIdFactory(7);
    assert.equal(next("p"), "p_7_1");
    assert.equal(next("p"), "p_7_2");
    assert.equal(next("n"), "n_7_3");
  });

  it("hashId is stable", () => {
    assert.equal(hashId("test"), hashId("test"));
    assert.notEqual(hashId("a"), hashId("b"));
  });
});
