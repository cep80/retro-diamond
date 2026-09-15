"use client";

import { useEffect, useState } from "react";
import { PixelBtn } from "@/components/chrome";
import { sfxSelect } from "@/game/audio";
import { TIMING_ASSIST_FLIGHT, TIMING_ASSIST_WINDOW } from "@/shine/beats.ts";
import { TIMING_TOLERANCE_MS } from "@/shine/clock.ts";
import { useShine } from "@/shine/store.ts";
import { DEFAULT_KEYS, type KeyMap } from "@/shine/types.ts";

const KEY_LABELS: { id: keyof KeyMap; label: string; note: string }[] = [
  { id: "swing", label: "Swing", note: "Contact swing at the plate." },
  { id: "power", label: "Power swing", note: "Narrower window, more carry." },
  { id: "bunt", label: "Bunt", note: "Lay it down." },
  { id: "contact", label: "Contact (alt)", note: "Second key for the contact swing." },
  { id: "kick", label: "Kick", note: "Start the delivery on the mound." },
  { id: "release", label: "Release", note: "Let it go." },
  { id: "pause", label: "Pause", note: "Freezes the clock. The attempt is saved." },
];

function keyName(code: string) {
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  return code.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function Slider({ label, value, onChange, note }: { label: string; value: number; onChange: (v: number) => void; note?: string }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between font-ui text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-muted">{Math.round(value * 100)}%</span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="mt-1 w-full accent-[var(--shine-accent,#ffd166)]"
        aria-label={label}
      />
      {note ? <span className="block font-ui text-xs text-muted">{note}</span> : null}
    </label>
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

  useEffect(() => {
    if (!listening) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.code === "Escape" && listening !== "pause") {
        setListening(null);
        return;
      }
      setSettings({ keys: { ...settings.keys, [listening]: e.code } });
      setListening(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [listening, settings.keys, setSettings]);

  return (
    <main className="relative min-h-dvh overflow-hidden bg-ink text-cream">
      <div className="title-wash absolute inset-0" />
      <div className="relative z-10 mx-auto max-w-3xl px-4 py-8 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <p className="episode-chip w-fit">Settings</p>
          <PixelBtn variant="ghost" className="h-9 px-3 text-[10px]" onClick={closeOverlay}>
            Back
          </PixelBtn>
        </div>

        <section className="mt-6 rounded-2xl border border-line bg-panel/90 p-4">
          <p className="font-display text-[10px] uppercase tracking-widest text-gold">Mix</p>
          <div className="mt-3 space-y-4">
            <Slider label="Music" value={settings.music} onChange={(v) => setSettings({ music: v })} />
            <Slider label="Sound" value={settings.sfx} onChange={(v) => setSettings({ sfx: v })} note="Bat, glove, umpire, the release cues." />
            <Slider label="Crowd" value={settings.crowd} onChange={(v) => setSettings({ crowd: v })} note="Park ambience and the swell after a hit." />
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-line bg-panel/90 p-4">
          <p className="font-display text-[10px] uppercase tracking-widest text-gold">Play</p>
          <label className="mt-3 flex items-start gap-3 font-ui text-sm">
            <input type="checkbox" className="mt-1" checked={settings.duel} onChange={(e) => setSettings({ duel: e.target.checked })} />
            <span>
              The Duel (preview)
              <span className="block text-xs text-muted">
                Call the pitch before it comes: sit a cell, sit hard or soft, protect, or take. Three coach cards a game. Her book opens as you
                play her. Off keeps the plate exactly as it was.
              </span>
            </span>
          </label>
          <label className="mt-3 flex items-start gap-3 font-ui text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={settings.timingAssist}
              onChange={(e) => setSettings({ timingAssist: e.target.checked })}
            />
            <span>
              Timing assist
              <span className="block text-xs text-muted">
                Pitches arrive {Math.round((TIMING_ASSIST_FLIGHT - 1) * 100)}% slower and the swing window is {Math.round((TIMING_ASSIST_WINDOW - 1) * 100)}%
                wider. Goals resolve the same. Rivals read the same tells. Shown on the HUD when it's on.
              </span>
            </span>
          </label>
          <label className="mt-3 flex items-start gap-3 font-ui text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={settings.reducedMotion}
              onChange={(e) => setSettings({ reducedMotion: e.target.checked })}
            />
            <span>
              Reduced motion
              <span className="block text-xs text-muted">Shorter beats, no ball-flight trails, no portrait shake. The result still reads.</span>
            </span>
          </label>
          <label className="mt-3 block font-ui text-sm">
            Text size
            <select
              value={settings.textScale}
              onChange={(e) => setSettings({ textScale: Number(e.target.value) as 1 | 1.15 | 1.3 })}
              className="ml-3 rounded-lg border border-white/20 bg-ink/70 px-2 py-1 font-ui text-sm text-cream"
            >
              <option value={1}>Standard</option>
              <option value={1.15}>Large</option>
              <option value={1.3}>Largest</option>
            </select>
          </label>
        </section>

        <section className="mt-4 rounded-2xl border border-line bg-panel/90 p-4">
          <div className="flex items-center justify-between">
            <p className="font-display text-[10px] uppercase tracking-widest text-gold">Keys</p>
            <button
              type="button"
              className="font-display text-[10px] uppercase tracking-widest text-muted underline-offset-2 hover:underline"
              onClick={() => setSettings({ keys: { ...DEFAULT_KEYS } })}
            >
              Reset
            </button>
          </div>
          <p className="mt-1 font-ui text-xs text-muted">
            Pointer and touch always work. Keyboard timing is read at key-down. Tolerance ±{TIMING_TOLERANCE_MS} ms.
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {KEY_LABELS.map((k) => (
              <li key={k.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2">
                <span className="min-w-0">
                  <span className="block font-ui text-sm">{k.label}</span>
                  <span className="block font-ui text-[11px] text-muted">{k.note}</span>
                </span>
                <button
                  type="button"
                  aria-label={`Rebind ${k.label}, currently ${keyName(settings.keys[k.id])}`}
                  onClick={() => {
                    sfxSelect();
                    setListening(k.id);
                  }}
                  className={`shrink-0 rounded-lg border px-3 py-1 font-display text-xs uppercase ${
                    listening === k.id ? "border-gold text-gold" : "border-white/20 text-cream/90"
                  }`}
                >
                  {listening === k.id ? "Press a key…" : keyName(settings.keys[k.id])}
                </button>
              </li>
            ))}
          </ul>
        </section>

        {backups.length ? (
          <section className="mt-4 rounded-2xl border border-line bg-panel/90 p-4">
            <p className="font-display text-[10px] uppercase tracking-widest text-gold">Save recovery</p>
            <p className="mt-1 font-ui text-xs text-muted">
              The game keeps the last {backups.length} checkpoint{backups.length === 1 ? "" : "s"} of this career. Restoring replaces the current run.
            </p>
            <ul className="mt-3 space-y-2">
              {backups
                .map((b, i) => ({ b, i }))
                .reverse()
                .map(({ b, i }) => (
                  <li key={`${b.at}-${i}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2 font-ui text-sm">
                    <span>
                      {b.label}
                      <span className="block text-[11px] text-muted">
                        Turn {b.run.turn} · {new Date(b.at).toLocaleString()}
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

        <div className="mt-6 flex gap-3">
          <PixelBtn className="h-12" onClick={closeOverlay}>
            Done
          </PixelBtn>
          <PixelBtn variant="ghost" className="h-12" onClick={openHelp}>
            How the plate works
          </PixelBtn>
        </div>
      </div>
    </main>
  );
}

const TEACH_CARDS: { title: string; body: string }[] = [
  {
    title: "The window",
    body: "Every pitch has a timing window in milliseconds. Your swing is stamped the instant you press — pointer-down or key-down — against the same clock that moves the ball. Contact grows it. Power shrinks it and adds carry. Guts opens it when the game is on the line.",
  },
  {
    title: "The ?",
    body: "After Live looks open, the pitch starts as a ? and resolves in flight. Eye resolves it earlier. Wit shows more of the pitcher's book on the HUD.",
  },
  {
    title: "Goals",
    body: "Every date has a Primary Goal and a Support Goal. Both are checked against the game's own record — pitches, takes, contact, bases, runs — never against a description. What the card says is exactly what has to happen.",
  },
  {
    title: "Rivals",
    body: "Reina, Sol, and Kira pitch differently and read you differently. They only adjust to what you have actually shown them — first-pitch swings, two-strike chases — and the scouting card says what they've seen.",
  },
  {
    title: "Pause and recovery",
    body: "Pause or switching tabs freezes the clock; the ball does not move. If the page closes mid-game, the plate appearance is restored at the last pitch boundary. Backups of the career sit under Settings.",
  },
  {
    title: "Training",
    body: "The Coaching decision shows the Need (what the next test asks), the Choice (the station that moves it), and the Next test. After the work, the change is shown in the unit the plate uses. In the game, a chip says when a pitch touched what you worked on.",
  },
];

export function ShineHelp() {
  const closeOverlay = useShine((s) => s.closeOverlay);
  const openSettings = useShine((s) => s.openSettings);
  return (
    <main className="relative min-h-dvh overflow-hidden bg-ink text-cream">
      <div className="title-wash absolute inset-0" />
      <div className="relative z-10 mx-auto max-w-3xl px-4 py-8 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <p className="episode-chip w-fit">How the plate works</p>
          <PixelBtn variant="ghost" className="h-9 px-3 text-[10px]" onClick={closeOverlay}>
            Back
          </PixelBtn>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {TEACH_CARDS.map((c) => (
            <article key={c.title} className="rounded-2xl border border-line bg-panel/90 p-4">
              <p className="font-display text-xs font-bold uppercase tracking-wide text-gold">{c.title}</p>
              <p className="mt-2 font-ui text-sm leading-relaxed text-cream/90">{c.body}</p>
            </article>
          ))}
        </div>
        <div className="mt-6 flex gap-3">
          <PixelBtn className="h-12" onClick={closeOverlay}>
            Done
          </PixelBtn>
          <PixelBtn variant="ghost" className="h-12" onClick={openSettings}>
            Settings
          </PixelBtn>
        </div>
      </div>
    </main>
  );
}
