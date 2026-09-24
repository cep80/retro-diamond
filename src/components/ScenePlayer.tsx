"use client";

/**
 * A JRPG scene: one beat at a time over her still. Tap (or Enter / Space)
 * finishes the line; tap again moves on. Narration has no nameplate, the
 * Coach's lines sit on the right, hers carry her name. The place's plate
 * fills the screen, blurred; her bust stands in front of it and wears the mood
 * of her last line; each letter she says blips at her own pitch. Reduced motion prints each line whole.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { placePlateSrc, sceneBustSrc, sheet } from "@/shine/bible.ts";
import { kitAccent } from "@/shine/stage.ts";
import { sfxBlip, sfxVoice } from "@/shine/audio.ts";
import type { Beat, Mood, SceneLike } from "@/shine/story.ts";
import type { CharacterId } from "@/shine/types.ts";

const CHARS_PER_SEC = 42;
/** Each voice has its own pitch; narration is silent. Blips every other letter. */
const VOICE_HZ: Record<CharacterId | "coach", number> = {
  aoi: 660,
  miki: 740,
  yuki: 820,
  reina: 520,
  sol: 600,
  kira: 700,
  coach: 300,
};

export function ScenePlayer({ scene, reduced, onDone }: { scene: SceneLike; reduced: boolean; onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(0);
  const [done, setDone] = useState(false);
  const beat: Beat = scene.beats[index]!;
  const full = beat.text.length;
  const typing = shown < full;
  // The still follows whoever spoke last (her rival can have the frame), in that line's mood.
  let still: CharacterId = scene.girl;
  let mood: Mood = "neutral";
  for (let i = index; i >= 0; i--) {
    const b = scene.beats[i]!;
    if (b.who !== "narration" && b.who !== "coach") {
      still = b.who;
      mood = b.mood ?? "neutral";
      break;
    }
  }
  const speakerId = beat.who !== "narration" && beat.who !== "coach" ? beat.who : null;
  const girl = speakerId ? sheet(speakerId) : null;

  // The typing loop lives in a ref so a tap (or Skip) can stop it; otherwise the next frame types the line back over the finished one.
  const rafRef = useRef(0);
  const doneRef = useRef(false);
  useEffect(() => {
    if (reduced || doneRef.current) {
      setShown(full);
      return;
    }
    setShown(0);
    const voice = beat.who === "narration" ? 0 : (VOICE_HZ[beat.who as CharacterId | "coach"] ?? 0);
    let last = 0;
    const start = performance.now();
    const tick = () => {
      const n = Math.min(full, Math.floor(((performance.now() - start) / 1000) * CHARS_PER_SEC));
      if (voice && Math.floor(n / 2) > Math.floor(last / 2) && /\S/.test(beat.text[n - 1] ?? "")) sfxVoice(voice);
      last = n;
      setShown(n);
      if (n < full) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [index, full, reduced]);

  const advance = useCallback(() => {
    if (done) return;
    if (typing) {
      cancelAnimationFrame(rafRef.current);
      setShown(full);
      return;
    }
    if (index < scene.beats.length - 1) {
      sfxBlip();
      setIndex(index + 1);
      return;
    }
    doneRef.current = true;
    setDone(true);
    onDone();
  }, [done, typing, full, index, scene.beats.length, onDone]);

  const advanceRef = useRef(advance);
  advanceRef.current = advance;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || doneRef.current) return;
      // A focused button, field or open dialog handles its own Enter/Space.
      const t = e.target instanceof Element ? e.target : null;
      if (t?.closest("button, a, input, select, textarea, [role=dialog]") || document.querySelector("[role=dialog], [aria-modal=true]")) return;
      if (e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        advanceRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const skip = () => {
    doneRef.current = true;
    cancelAnimationFrame(rafRef.current);
    setIndex(scene.beats.length - 1);
    setShown(scene.beats.at(-1)!.text.length);
    setDone(true);
    onDone();
  };

  const speaker = beat.who === "narration" ? null : beat.who === "coach" ? "Coach" : girl!.name;
  const quoted = beat.who !== "narration";
  return (
    <div className="shine-scene" data-speaker={beat.who === "coach" ? "coach" : beat.who === "narration" ? "narration" : "girl"} data-scene={scene.id} data-scene-beat={index} data-scene-done={done ? "1" : "0"}>
      <img src={placePlateSrc(scene.place, scene.girl)} alt="" className="shine-scene-plate" aria-hidden />
      <img key={`${still}-${mood}`} src={sceneBustSrc(still, mood)} alt="" className="shine-scene-bust" data-scene-mood={mood} data-scene-still={still} />
      <div className="shine-scene-shade" aria-hidden />
      {index === 0 ? <p className="shine-scene-place">{scene.place}</p> : null}
      {!done ? (
        <button type="button" className="shine-scene-skip" onClick={skip}>
          Skip
        </button>
      ) : null}
      <button
        type="button"
        className={`shine-scene-box ${beat.who === "narration" ? "is-narration" : beat.who === "coach" ? "is-coach" : "is-girl"}`}
        style={speakerId ? ({ ["--shine-accent" as string]: kitAccent(speakerId) } as React.CSSProperties) : undefined}
        onClick={advance}
        aria-label={done ? "Scene finished" : typing ? "Show the whole line" : "Next line"}
      >
        {speaker ? (
          <span className="shine-scene-name">
            <span className="shine-kana">{girl ? girl.jp : "コーチ"}</span>
            {speaker}
          </span>
        ) : null}
        <span className="shine-scene-text" aria-live="polite">
          {quoted ? "“" : ""}
          {beat.text.slice(0, shown)}
          {!typing && quoted ? "”" : ""}
        </span>
        {!typing && !done ? <span className="shine-scene-next" aria-hidden>▼</span> : null}
      </button>
    </div>
  );
}
