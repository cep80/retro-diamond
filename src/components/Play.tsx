import { useEffect, useRef } from "react";
import { DiamondEngine } from "@/game/engine";
import { sfxCrowd, stopCrowd, unlockAudio } from "@/game/audio";
import { useGame } from "@/game/store";
import { PixelBtn } from "./chrome";

export function Play() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<DiamondEngine | null>(null);
  const career = useGame((s) => s.career);
  const settings = useGame((s) => s.settings);
  const applyLive = useGame((s) => s.applyLive);
  const simDefense = useGame((s) => s.simDefense);
  const endLiveGame = useGame((s) => s.endLiveGame);
  const setScreen = useGame((s) => s.setScreen);

  useEffect(() => {
    const canvas = canvasRef.current;
    const live = career?.live;
    if (!canvas || !career || !live) return;
    unlockAudio();
    sfxCrowd(0.03);
    const engine = new DiamondEngine({
      canvas,
      career,
      live,
      shake: settings.shake,
      onLive: (l) => applyLive(l),
      onOver: () => endLiveGame(),
      onDefense: () => {
        simDefense();
        const next = useGame.getState().career;
        if (next?.live) {
          engine.setLive(next.live, next);
          engine.continueFromLive();
        }
      },
    });
    engineRef.current = engine;
    void engine.start();
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "KeyJ" || e.code === "KeyZ") {
        e.preventDefault();
        engine.swing("contact");
      } else if (e.code === "ShiftLeft" || e.code === "ShiftRight" || e.code === "KeyK" || e.code === "KeyX") {
        e.preventDefault();
        engine.swing("power");
      } else if (e.code === "Enter") {
        e.preventDefault();
        engine.skipDefense();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      engine.destroy();
      engineRef.current = null;
      stopCrowd();
    };
    // mount once per play session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-ink text-cream">
      <div
        ref={wrapRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden bg-ink touch-none"
        style={{ touchAction: "none" }}
        onPointerDown={() => {
          unlockAudio();
          engineRef.current?.swing("contact");
          engineRef.current?.skipDefense();
        }}
      >
        <canvas ref={canvasRef} className="block max-h-full max-w-full" />
      </div>
      <div className="grid grid-cols-4 gap-2 border-t border-line bg-ink-2 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <PixelBtn variant="ghost" onClick={() => setScreen("office")}>
          Pause
        </PixelBtn>
        <PixelBtn
          className="min-h-14 text-[11px]"
          onClick={() => {
            unlockAudio();
            engineRef.current?.swing("contact");
            engineRef.current?.skipDefense();
          }}
        >
          Contact
        </PixelBtn>
        <PixelBtn
          variant="cream"
          className="min-h-14 text-[11px]"
          onClick={() => {
            unlockAudio();
            engineRef.current?.swing("power");
          }}
        >
          Power
        </PixelBtn>
        <PixelBtn
          variant="ghost"
          onClick={() => {
            engineRef.current?.skipDefense();
          }}
        >
          Skip
        </PixelBtn>
      </div>
    </div>
  );
}
