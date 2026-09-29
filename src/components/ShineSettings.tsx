"use client";

import { useEffect, useId, useState } from "react";
import { PixelBtn } from "@/components/pixel-btn";
import { ShineBack } from "@/components/ShineRoundBtn";
import { sfxSelect } from "@/shine/audio.ts";
import { useShine } from "@/shine/store.ts";
import { DEFAULT_KEYS, type KeyMap, type ShineSettings as Settings } from "@/shine/types.ts";

const KEY_LABELS: { id: keyof KeyMap; label: string; note: string }[] = [
  { id: "pause", label: "Pause", note: "Freezes the film. The attempt is saved." },
];

const TEXT_SIZES: { value: Settings["textScale"]; label: string }[] = [
  { value: 1, label: "Standard" },
  { value: 1.15, label: "Large" },
  { value: 1.3, label: "Largest" },
];

function keyName(code: string) {
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  return code.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function Slider({ label, value, onChange, note }: { label: string; value: number; onChange: (v: number) => void; note?: string }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between">
        <span className="shine-set-label">{label}</span>
        <span className="shine-set-num shine-set-pct">{Math.round(value * 100)}%</span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="shine-set-range"
        aria-label={label}
      />
      {note ? <span className="shine-set-note">{note}</span> : null}
    </label>
  );
}

/** A page head: the way back on the left, the name in her voice's face beside it. */
function PageHead({ kana, title, back, backLabel }: { kana: string; title: string; back: () => void; backLabel: string }) {
  return (
    <div className="shine-set-head">
      <ShineBack label={backLabel} onClick={back} />
      <h2 className="shine-set-title">
        <span className="shine-set-kana">{kana}</span>
        {title}
      </h2>
    </div>
  );
}

export function ShineSettings() {
  const settings = useShine((s) => s.settings);
  const setSettings = useShine((s) => s.setSettings);
  const closeOverlay = useShine((s) => s.closeOverlay);
  const openHelp = useShine((s) => s.openHelp);
  const backups = useShine((s) => s.backups);
  const restoreBackup = useShine((s) => s.restoreBackup);
  const [listening, setListening] = useState<keyof KeyMap | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<number | null>(null);
  const ids = useId();

  useEffect(() => {
    if (!listening) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.code === "Escape" && listening !== "pause") {
        setListening(null);
        return;
      }
      // Enter and Space are Go, and Tab moves focus: a binding there would shadow them. Keep waiting.
      if (e.code === "Enter" || e.code === "NumpadEnter" || e.code === "Space" || e.code === "Tab") return;
      setSettings({ keys: { ...settings.keys, [listening]: e.code } });
      setListening(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [listening, settings.keys, setSettings]);

  return (
    // Settings opens as a fixed overlay, so it scrolls itself; the one way out is the back button at the top.
    <main className="shine-set relative h-dvh overflow-y-auto overscroll-contain bg-ink text-cream" data-listening={listening ? "true" : undefined}>
      <div className="title-wash fixed inset-0" />
      <div className="relative z-10 mx-auto max-w-xl px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] sm:px-8 sm:pt-8">
        <PageHead kana="設定" title="Settings" back={closeOverlay} backLabel="Close settings" />

        <button
          type="button"
          className="shine-settings-help mt-5"
          onClick={() => {
            sfxSelect();
            openHelp();
          }}
        >
          <span className="shine-settings-help-mark" aria-hidden>
            ?
          </span>
          <span className="min-w-0 flex-1">
            <span className="shine-settings-help-title">How it works</span>
            <span className="shine-settings-help-note">Where she looks, the mound, and the big games.</span>
          </span>
          <span className="shine-settings-help-go" aria-hidden>
            ›
          </span>
        </button>

        <section className="shine-set-card mt-4" aria-labelledby={`${ids}-mix`}>
          <h3 id={`${ids}-mix`} className="shine-set-h">
            Mix
          </h3>
          <div className="mt-3 space-y-4">
            <Slider label="Music" value={settings.music} onChange={(v) => setSettings({ music: v })} />
            <Slider label="Sound" value={settings.sfx} onChange={(v) => setSettings({ sfx: v })} note="Bat, glove, umpire, the release cues." />
            <Slider label="Crowd" value={settings.crowd} onChange={(v) => setSettings({ crowd: v })} note="Park ambience and the swell after a hit." />
          </div>
        </section>

        <section className="shine-set-card mt-4" aria-labelledby={`${ids}-play`}>
          <h3 id={`${ids}-play`} className="shine-set-h">
            Play
          </h3>
          <p className="shine-set-body mt-2">
            Tap the box she&apos;s sitting on. Then Go, and watch. She decides the swing. Pitching works the same way. Nothing is timed while the ball is in the air.
          </p>
          {/* A real checkbox under the switch: role="switch" reads it as on or off, the label row is the target. */}
          <label className="shine-set-toggle mt-4">
            <span className="min-w-0 flex-1">
              <span id={`${ids}-rm`} className="shine-set-label block">
                Reduced motion
              </span>
              <span id={`${ids}-rm-note`} className="shine-set-note">
                Shorter beats, no ball-flight trails, no portrait shake. The result still reads.
              </span>
            </span>
            <input
              type="checkbox"
              role="switch"
              className="shine-switch"
              aria-labelledby={`${ids}-rm`}
              aria-describedby={`${ids}-rm-note`}
              checked={settings.reducedMotion}
              onChange={(e) => {
                sfxSelect();
                setSettings({ reducedMotion: e.target.checked });
              }}
            />
          </label>
          <div className="mt-4">
            <span id={`${ids}-size`} className="shine-set-label block">
              Text size
            </span>
            <div className="shine-seg mt-2" role="radiogroup" aria-labelledby={`${ids}-size`}>
              {TEXT_SIZES.map((t) => (
                <label key={t.value} className="shine-seg-opt">
                  <input
                    type="radio"
                    name={`${ids}-text-size`}
                    className="shine-seg-input"
                    value={t.value}
                    checked={settings.textScale === t.value}
                    onChange={() => {
                      sfxSelect();
                      setSettings({ textScale: t.value });
                    }}
                  />
                  <span className="shine-seg-face">
                    <span className="shine-seg-aa" style={{ fontSize: `${t.value}rem` }} aria-hidden>
                      Aa
                    </span>
                    <span className="shine-seg-name">{t.label}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* A phone has no keyboard to rebind: the section only shows where there is a pointer that hovers or a fine one. */}
        <section className="shine-set-card shine-set-keys mt-4" aria-labelledby={`${ids}-keys`} data-settings-keys>
          <div className="flex items-center justify-between gap-3">
            <h3 id={`${ids}-keys`} className="shine-set-h">
              Keys
            </h3>
            <button type="button" className="shine-set-link" onClick={() => setSettings({ keys: { ...DEFAULT_KEYS } })}>
              Reset
            </button>
          </div>
          <p className="shine-set-note">Enter or Space is Go. The 3×3 grid is where she looks.</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {KEY_LABELS.map((k) => (
              <li key={k.id} className="shine-set-item">
                <span className="min-w-0">
                  <span className="shine-set-label block">{k.label}</span>
                  <span className="shine-set-note">{k.note}</span>
                </span>
                <button
                  type="button"
                  aria-label={`Rebind ${k.label}, currently ${keyName(settings.keys[k.id])}`}
                  onClick={() => {
                    sfxSelect();
                    setListening(k.id);
                  }}
                  className="shine-set-keycap"
                  data-on={listening === k.id ? "true" : undefined}
                >
                  {listening === k.id ? "Press a key…" : keyName(settings.keys[k.id])}
                </button>
              </li>
            ))}
          </ul>
        </section>

        {backups.length ? (
          <section className="shine-set-card mt-4" aria-labelledby={`${ids}-saves`}>
            <h3 id={`${ids}-saves`} className="shine-set-h">
              Save recovery
            </h3>
            <p className="shine-set-note">
              The game keeps the last {backups.length} checkpoint{backups.length === 1 ? "" : "s"} of this career. Restoring replaces the current run.
            </p>
            <ul className="mt-3 space-y-2">
              {backups
                .map((b, i) => ({ b, i }))
                .reverse()
                .map(({ b, i }) => (
                  <li key={`${b.at}-${i}`} className="shine-set-item">
                    <span className="min-w-0">
                      <span className="shine-set-label block">{b.label}</span>
                      <span className="shine-set-note">
                        Day <span className="shine-set-num">{b.run.turn}</span> · <span className="shine-set-num">{new Date(b.at).toLocaleString()}</span>
                      </span>
                    </span>
                    {confirmRestore === i ? (
                      <span className="flex gap-2">
                        <PixelBtn
                          className="h-9 px-3 text-[10px]"
                          onClick={() => {
                            restoreBackup(i);
                            setConfirmRestore(null);
                          }}
                        >
                          Restore
                        </PixelBtn>
                        <PixelBtn variant="ghost" className="h-9 px-3 text-[10px]" onClick={() => setConfirmRestore(null)}>
                          Keep
                        </PixelBtn>
                      </span>
                    ) : (
                      <PixelBtn variant="ghost" className="h-9 px-3 text-[10px]" onClick={() => setConfirmRestore(i)}>
                        Restore…
                      </PixelBtn>
                    )}
                  </li>
                ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}

const TEACH_CARDS: { title: string; body: string }[] = [
  {
    title: "The at-bat",
    body: "You are her Coach. Tap the box she's sitting on. Then Go, and watch. She decides the swing from who she is and where you told her to look. Nothing is tapped while the ball is in the air.",
  },
  {
    title: "Where she looks",
    body: "The 3×3 grid is where she looks. The right square tightens her hands. A square two away leaves her guessing. That is the whole choice.",
  },
  {
    title: "The mound",
    body: "Reina, Sol, and Kira throw. Show her where the catcher sets up, press Go. She picks the pitch. It works just like the plate.",
  },
  {
    title: "The big games",
    body: "Every girl has a promise to keep. Each big game asks one thing of her, like getting on base or getting three outs, and you watch whether she does it. If she gets the smaller thing instead, it doesn't count against her. Miss two big games and her Academy days are over.",
  },
  {
    title: "Rivals",
    body: "The girl across from her remembers what you have actually shown. She does not read a scouting report you never played.",
  },
  {
    title: "Mood and the shop",
    body: "The morning shows her mood. One tap, one line. The shop sells looks only. What she learns, her games, Clubhouse cards, the Finale, and Never Quit are never for sale.",
  },
  {
    title: "Training",
    body: "One station a day. One line about how it went. The countdown to the next big game stays on screen.",
  },
];

export function ShineHelp() {
  const closeOverlay = useShine((s) => s.closeOverlay);
  const openSettings = useShine((s) => s.openSettings);
  return (
    <main className="relative h-dvh overflow-y-auto overscroll-contain bg-ink text-cream">
      <div className="title-wash fixed inset-0" />
      <div className="relative z-10 mx-auto max-w-3xl px-4 pb-8 pt-[calc(1rem+env(safe-area-inset-top))] sm:px-8 sm:pt-8">
        {/* How it works opens from Settings, so the back button goes back there; Done closes both. */}
        <PageHead kana="遊び方" title="How it works" back={openSettings} backLabel="Back to Settings" />
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {TEACH_CARDS.map((c) => (
            <article key={c.title} className="shine-set-card">
              <h3 className="shine-set-h">{c.title}</h3>
              <p className="shine-set-body mt-2">{c.body}</p>
            </article>
          ))}
        </div>
        <div className="mt-6 flex gap-3 pb-[env(safe-area-inset-bottom)]">
          <PixelBtn className="h-12" onClick={closeOverlay}>
            Done
          </PixelBtn>
        </div>
      </div>
    </main>
  );
}
