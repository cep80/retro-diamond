"use client";

import { useEffect, useState } from "react";
import { PixelBtn } from "@/components/pixel-btn";
import { sfxSelect } from "@/shine/audio.ts";
import { useShine } from "@/shine/store.ts";
import { DEFAULT_KEYS, type KeyMap } from "@/shine/types.ts";

const KEY_LABELS: { id: keyof KeyMap; label: string; note: string }[] = [
  { id: "pause", label: "Pause", note: "Freezes the film. The attempt is saved." },
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
          <p className="mt-3 font-ui text-sm text-cream/80">
            Sit the zone under her. Press Go. Watch her. She picks the pitch. The mound is the same verb. Nothing is timed in flight.
          </p>
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
          <p className="mt-1 font-ui text-xs text-muted">Enter or Space is Go. The 3×3 is the sit.</p>
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
                        Day {b.run.turn} · {new Date(b.at).toLocaleString()}
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
            How a date works
          </PixelBtn>
        </div>
      </div>
    </main>
  );
}

const TEACH_CARDS: { title: string; body: string }[] = [
  {
    title: "The race",
    body: "You are her Coach. Sit a cell on the zone under her, press Go, and watch. She decides the swing from who she is and where you sat her. Nothing is tapped in flight.",
  },
  {
    title: "The sit",
    body: "The 3×3 is where she looks. The right cell tightens her hands. A cell two away leaves her guessing. That is the whole pick.",
  },
  {
    title: "The mound",
    body: "Reina, Sol, and Kira throw. Sit the glove under her, press Go. She picks the pitch. Same verb as the plate.",
  },
  {
    title: "The date",
    body: "She came for something: REACH, HOLD, COMMAND, FIGHT, RUN. You watch whether she got it. The smaller ask can hold one miss. A second official miss folds the year.",
  },
  {
    title: "Rivals",
    body: "The girl across from her remembers what you have actually shown. She does not read a scouting report you never played.",
  },
  {
    title: "Mood and the shop",
    body: "The morning shows her mood. One tap, one line. The shop is looks only. Sparks, the plate, Clubhouse cards, the Finale, and Never Quit are never sold.",
  },
  {
    title: "Training",
    body: "One station. One line. The countdown to the next date stays on.",
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
          <p className="episode-chip w-fit">How a date works</p>
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
