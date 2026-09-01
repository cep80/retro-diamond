let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfx: GainNode | null = null;
let music: GainNode | null = null;
let musicTimer: number | null = null;
let crowd: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
let enabled = { sfx: true, music: true };

export function setAudioEnabled(next: { sfx: boolean; music: boolean }) {
  enabled = next;
  if (sfx) sfx.gain.value = next.sfx ? 1 : 0;
  if (music) music.gain.value = next.music ? 0.22 : 0;
  if (!next.music) stopMusic();
}

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC({ latencyHint: "interactive" });
    master = ctx.createGain();
    sfx = ctx.createGain();
    music = ctx.createGain();
    sfx.gain.value = enabled.sfx ? 1 : 0;
    music.gain.value = enabled.music ? 0.22 : 0;
    master.gain.value = 0.7;
    sfx.connect(master);
    music.connect(master);
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && ctx?.state === "suspended") void ctx.resume();
  });
}

function now() {
  return ctx?.currentTime ?? 0;
}

function tone(freq: number, dur: number, type: OscillatorType, vol = 0.08, dest?: GainNode) {
  if (!ctx || !sfx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, now());
  g.gain.setValueAtTime(vol, now());
  g.gain.exponentialRampToValueAtTime(0.0001, now() + dur);
  o.connect(g);
  g.connect(dest ?? sfx);
  o.start();
  o.stop(now() + dur + 0.02);
}

function noise(dur: number, vol: number, hp = 400) {
  if (!ctx || !sfx) return;
  const n = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const d = n.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = n;
  const f = ctx.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = hp;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, now());
  g.gain.exponentialRampToValueAtTime(0.0001, now() + dur);
  src.connect(f);
  f.connect(g);
  g.connect(sfx);
  src.start();
}

export function sfxBlip() {
  if (!enabled.sfx) return;
  tone(880, 0.06, "square", 0.05);
}

export function sfxSelect() {
  if (!enabled.sfx) return;
  tone(520, 0.05, "square", 0.04);
  tone(780, 0.08, "square", 0.04);
}

export function sfxCrowd(level = 0.04) {
  if (!ctx || !sfx || !enabled.sfx) return;
  const n = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = n.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.4;
  const src = ctx.createBufferSource();
  src.buffer = n;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 900;
  const g = ctx.createGain();
  g.gain.value = level;
  src.connect(f);
  f.connect(g);
  g.connect(sfx);
  src.start();
  crowd = { src, gain: g };
}

export function sfxCrowdBurst() {
  if (!crowd || !ctx) return;
  crowd.gain.gain.cancelScheduledValues(now());
  crowd.gain.gain.setValueAtTime(0.12, now());
  crowd.gain.gain.exponentialRampToValueAtTime(0.035, now() + 1.4);
}

export function stopCrowd() {
  try {
    crowd?.src.stop();
  } catch {
    /* noop */
  }
  crowd = null;
}

export function sfxWhoosh() {
  if (!enabled.sfx) return;
  noise(0.12, 0.07, 900);
  tone(420, 0.1, "triangle", 0.03);
}

export function sfxCrack() {
  if (!enabled.sfx) return;
  noise(0.09, 0.22, 800);
  tone(180, 0.12, "square", 0.1);
  tone(90, 0.16, "sawtooth", 0.06);
}

export function sfxWhiff() {
  if (!enabled.sfx) return;
  noise(0.08, 0.08, 1800);
  tone(240, 0.07, "triangle", 0.04);
}

export function sfxUmpire() {
  if (!enabled.sfx) return;
  tone(300, 0.09, "square", 0.05);
}

export function sfxOrgan() {
  if (!enabled.sfx || !ctx || !sfx) return;
  const notes = [196, 247, 294, 392];
  notes.forEach((f, i) => {
    const o = ctx!.createOscillator();
    const g = ctx!.createGain();
    o.type = "square";
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, now() + i * 0.09);
    g.gain.exponentialRampToValueAtTime(0.05, now() + i * 0.09 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now() + i * 0.09 + 0.28);
    o.connect(g);
    g.connect(sfx!);
    o.start(now() + i * 0.09);
    o.stop(now() + i * 0.09 + 0.3);
  });
}

export function sfxHr() {
  sfxCrack();
  sfxCrowdBurst();
  sfxOrgan();
}

const CHORDS = [
  [196, 247, 294],
  [174, 220, 261],
  [164, 196, 246],
  [196, 246, 293],
];

export function startMusic() {
  if (!ctx || !music || !enabled.music) return;
  stopMusic();
  let step = 0;
  const tick = () => {
    if (!ctx || !music || !enabled.music) return;
    const chord = CHORDS[step % CHORDS.length]!;
    const note = chord[step % 3]!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.value = note * (step % 8 === 7 ? 2 : 1);
    g.gain.setValueAtTime(0.0001, now());
    g.gain.exponentialRampToValueAtTime(0.045, now() + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now() + 0.22);
    o.connect(g);
    g.connect(music);
    o.start();
    o.stop(now() + 0.24);
    step += 1;
    musicTimer = window.setTimeout(tick, 280);
  };
  tick();
}

export function stopMusic() {
  if (musicTimer != null) {
    clearTimeout(musicTimer);
    musicTimer = null;
  }
}
