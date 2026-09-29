/** Check-in 31 (F4): the 優勝 frame waits for its pictures, never longer than the cap. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decodePicture, PICTURE_WAIT_CAP_MS, picturesReady, readyWithin } from "./preload.ts";

describe("F4: the win moment waits for its pictures", () => {
  it("plays as soon as the pictures are decoded", async () => {
    assert.equal(await readyWithin(Promise.resolve(), 600, () => undefined), "ready");
  });

  it("plays anyway at the cap when they never arrive", async () => {
    let fire: (() => void) | null = null;
    const p = readyWithin(new Promise(() => {}), 600, (fn, ms) => {
      assert.equal(ms, 600);
      fire = fn;
    });
    assert.ok(fire);
    (fire as () => void)();
    assert.equal(await p, "cap");
  });

  it("caps the wait at 600 ms", () => {
    assert.equal(PICTURE_WAIT_CAP_MS, 600);
  });

  it("with no DOM (the server, a test) there is nothing to wait for", async () => {
    await decodePicture("/art/busts/aoi/elated.webp");
    assert.equal(await picturesReady(["/bg/skyline-complex.png"], 5), "ready");
  });
});
