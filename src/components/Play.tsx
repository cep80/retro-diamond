import { useEffect, useRef, useState } from "react";
import { DiamondEngine, type PlateUi } from "@/game/engine";
import { sfxCrowd, stopCrowd, unlockAudio } from "@/game/audio";
import { CANVAS_H, CANVAS_W } from "@/game/layout";
import { PITCH_ABBR, gradeLetter } from "@/game/plate";
import { useGame } from "@/game/store";
import type { SwingKind } from "@/game/types";
import { PixelBtn } from "./chrome";

const IDLE_UI: PlateUi = {
  defense: false,
  phase: "intro",
  swing: "contact",
  arsenal: [],
  pitchIdx: 0,
  calling: false,
  delivering: false,
  autoPitch: false,
  runnerDecision: false,
  stealArmed: false,
  shiftOn: false,
};

export function Play() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<DiamondEngine | null>(null);
  const [ui, setUi] = useState<PlateUi>(IDLE_UI);
  const career = useGame((s) => s.career);
  const settings = useGame((s) => s.settings);
  const applyLive = useGame((s) => s.applyLive);
  const simRestDefense = useGame((s) => s.simRestDefense);
  const endLiveGame = useGame((s) => s.endLiveGame);
  const setScreen = useGame((s) => s.setScreen);
  const isChallenge = career?.isChallenge === true;

  useEffect(() => {
    engineRef.current?.setAutoPitch(settings.autoPitch);
  }, [settings.autoPitch]);

  useEffect(() => {
    engineRef.current?.setAutoBaserun(settings.autoBaserun);
  }, [settings.autoBaserun]);

  useEffect(() => {
    engineRef.current?.setTimingAssist(settings.timingAssist);
  }, [settings.timingAssist]);

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
      autoPitch: settings.autoPitch,
      autoBaserun: settings.autoBaserun,
      timingAssist: settings.timingAssist,
      onLive: (l) => applyLive(l),
      onOver: () => {
        if (isChallenge) {
          const log = engineRef.current?.getInputLog();
          if (log) useGame.setState({ challengeInputLog: log });
        }
        endLiveGame();
      },
      onUi: (u) => setUi(u),
      onSkipDefense: () => {
        simRestDefense();
        const next = useGame.getState().career;
        if (next?.live) engine.setLive(next.live, next);
      },
    });
    engineRef.current = engine;
    if (import.meta.env.DEV) (window as unknown as { __rdEngine?: DiamondEngine }).__rdEngine = engine;
    void engine.start();
    const onKey = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;
      const defense = engine.isDefense();
      if (engine.hasRunnerDecision()) {
        if (e.code === "KeyS" || e.code === "ArrowRight") {
          e.preventDefault();
          engine.sendRunner();
          return;
        }
        if (e.code === "KeyH" || e.code === "ArrowLeft") {
          e.preventDefault();
          engine.holdRunner();
          return;
        }
      }
      switch (e.code) {
        case "Space":
        case "KeyJ":
        case "KeyZ":
          e.preventDefault();
          if (!defense) engine.swing();
          else if (engine.isCalling()) engine.throwPitch();
          else engine.deliveryTap();
          return;
        case "ShiftLeft":
        case "ShiftRight":
        case "KeyK":
        case "KeyX":
          e.preventDefault();
          if (!defense) engine.swing("power");
          return;
        case "KeyC":
          engine.selectSwing("contact");
          return;
        case "KeyP":
          engine.selectSwing("power");
          return;
        case "KeyB":
          engine.selectSwing("bunt");
          return;
        case "ArrowUp":
        case "KeyW":
          e.preventDefault();
          engine.moveAim(-1, 0);
          return;
        case "ArrowDown":
          if (engine.hasRunnerDecision()) return;
          e.preventDefault();
          engine.moveAim(1, 0);
          return;
        case "ArrowLeft":
        case "KeyA":
          if (engine.hasRunnerDecision()) return;
          e.preventDefault();
          engine.moveAim(0, -1);
          return;
        case "ArrowRight":
        case "KeyD":
          if (engine.hasRunnerDecision()) return;
          e.preventDefault();
          engine.moveAim(0, 1);
          return;
        case "Digit1":
        case "Digit2":
        case "Digit3":
        case "Digit4":
          engine.selectPitch(Number(e.code.slice(-1)) - 1);
          return;
        case "Tab":
          if (defense) {
            e.preventDefault();
            engine.callAuto();
          }
          return;
        case "Enter":
        case "Escape":
          e.preventDefault();
          engine.skipDefense();
          return;
        default:
          return;
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

  const swingBtn = (kind: SwingKind, label: string) => (
    <PixelBtn
      variant={ui.swing === kind ? "primary" : "ghost"}
      className="min-h-14 text-[11px]"
      pressed={ui.swing === kind}
      onClick={() => {
        unlockAudio();
        engineRef.current?.selectSwing(kind);
      }}
    >
      {label}
    </PixelBtn>
  );

  const canSteal = !ui.defense && (career?.live?.bases[0] || career?.live?.bases[1]);
  const canIbb = ui.defense && ui.calling && career?.live && !career.live.bases[0];

  return (
    <div className="flex min-h-dvh flex-col bg-ink text-cream">
      <div
        ref={wrapRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden bg-ink touch-none"
        style={{ touchAction: "none" }}
        onPointerDown={(e) => {
          unlockAudio();
          const engine = engineRef.current;
          const canvas = canvasRef.current;
          if (!engine || !canvas) return;
          const r = canvas.getBoundingClientRect();
          const x = ((e.clientX - r.left) / Math.max(1, r.width)) * CANVAS_W;
          const y = ((e.clientY - r.top) / Math.max(1, r.height)) * CANVAS_H;
          if (engine.tapAt(x, y)) return;
          if (engine.isDefense()) {
            if (ui.autoPitch) engine.skipDefense();
            return;
          }
          if (engine.hasRunnerDecision()) return;
          engine.swing();
        }}
      >
        <canvas ref={canvasRef} className="block" style={{ imageRendering: "pixelated" }} />
      </div>
      <div className="grid grid-cols-4 gap-2 border-t border-line bg-ink-2 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <PixelBtn variant="ghost" onClick={() => setScreen("office")}>
          Menu
        </PixelBtn>
        {ui.runnerDecision ? (
          <>
            <PixelBtn
              variant="ghost"
              className="min-h-14 text-[11px]"
              onClick={() => {
                unlockAudio();
                engineRef.current?.holdRunner();
              }}
            >
              Hold
            </PixelBtn>
            <PixelBtn
              variant="cream"
              className="col-span-2 min-h-14 text-[11px]"
              onClick={() => {
                unlockAudio();
                engineRef.current?.sendRunner();
              }}
            >
              Send
            </PixelBtn>
          </>
        ) : ui.defense && ui.autoPitch ? (
          <PixelBtn
            className="col-span-3 min-h-14 text-[11px]"
            onClick={() => {
              unlockAudio();
              engineRef.current?.skipDefense();
            }}
          >
            Skip to our at-bat
          </PixelBtn>
        ) : ui.defense ? (
          <>
            <PixelBtn
              variant="ghost"
              className="min-h-14 text-[11px]"
              disabled={!ui.calling}
              onClick={() => {
                unlockAudio();
                engineRef.current?.cyclePitch(1);
              }}
            >
              {ui.arsenal[ui.pitchIdx]
                ? `${PITCH_ABBR[ui.arsenal[ui.pitchIdx]!.type]} ${gradeLetter(ui.arsenal[ui.pitchIdx]!.grade)} >`
                : "Pitch"}
            </PixelBtn>
            {canIbb ? (
              <PixelBtn
                variant="ghost"
                className="min-h-14 text-[9px]"
                disabled={!ui.calling}
                onClick={() => {
                  unlockAudio();
                  engineRef.current?.intentionalWalk();
                }}
              >
                IBB
              </PixelBtn>
            ) : (
              <PixelBtn
                variant={ui.shiftOn ? "cream" : "ghost"}
                className="min-h-14 text-[10px]"
                disabled={!ui.calling}
                onClick={() => {
                  unlockAudio();
                  engineRef.current?.toggleShift();
                }}
              >
                Shift
              </PixelBtn>
            )}
            {ui.delivering ? (
              <PixelBtn
                variant="cream"
                className="min-h-14 text-[11px]"
                onClick={() => {
                  unlockAudio();
                  engineRef.current?.deliveryTap();
                }}
              >
                Tap
              </PixelBtn>
            ) : (
              <PixelBtn
                className="min-h-14 text-[11px]"
                disabled={!ui.calling}
                onClick={() => {
                  unlockAudio();
                  engineRef.current?.throwPitch();
                }}
              >
                Throw
              </PixelBtn>
            )}
          </>
        ) : (
          <>
            {canSteal ? (
              <PixelBtn
                variant={ui.stealArmed ? "cream" : "ghost"}
                className="min-h-14 text-[10px]"
                onClick={() => {
                  unlockAudio();
                  engineRef.current?.armSteal();
                }}
              >
                {ui.stealArmed ? "Steal!" : "Steal"}
              </PixelBtn>
            ) : (
              swingBtn("bunt", "Bunt")
            )}
            {swingBtn("contact", "Contact")}
            {swingBtn("power", "Power")}
          </>
        )}
      </div>
    </div>
  );
}
