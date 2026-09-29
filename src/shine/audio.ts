type ShineGraph = {
  ctx: AudioContext;
  master: GainNode;
  sfx: GainNode;
  music: GainNode;
  chipGen: number;
  chipTimer: number | null;
};

function graph(): ShineGraph | null {
  if (typeof window === "undefined") return null;
  return (window as Window & { __shineAudio?: ShineGraph }).__shineAudio ?? null;
}

function setGraph(next: ShineGraph) {
  (window as Window & { __shineAudio?: ShineGraph }).__shineAudio = next;
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfx: GainNode | null = null;
let music: GainNode | null = null;
let musicTimer: number | null = null;
let crowd: { src: AudioBufferSourceNode; gain: GainNode; cowbell?: number; bed: number } | null = null;
let fileMusic: { src: AudioBufferSourceNode; gain: GainNode; url?: string; bed: number } | null = null;
let fieldBed: { src: AudioBufferSourceNode; gain: GainNode; bed: number } | null = null;
const fieldBufs = new Map<string, AudioBuffer>();
let fieldBedGen = 0;
let pianoTimer: number | null = null;
let walkGen = 0;
let enabled = { sfx: true, music: true };
let muted = false;
/** Player mix (0..1). Applied on top of the enabled/mute gates. */
let mix = { music: 1, sfx: 1, crowd: 1 };
let crowdBus: GainNode | null = null;
let sfxAnalyser: AnalyserNode | null = null;
let masterAnalyser: AnalyserNode | null = null;
let sfxPeak = 0;
let masterPeak = 0;
const walkBufs = new Map<string, AudioBuffer>();

function applyMix() {
  if (sfx) sfx.gain.value = enabled.sfx ? mix.sfx : 0;
  if (music) music.gain.value = enabled.music ? 0.22 * mix.music : 0;
  if (crowdBus) crowdBus.gain.value = mix.crowd;
}

/** Per-channel volume from the settings screen. Safe to call before the graph exists. */
export function setMix(next: Partial<{ music: number; sfx: number; crowd: number }>) {
  mix = {
    music: clamp01(next.music ?? mix.music),
    sfx: clamp01(next.sfx ?? mix.sfx),
    crowd: clamp01(next.crowd ?? mix.crowd),
  };
  applyMix();
}

export function currentMix() {
  return { ...mix };
}

function clamp01(n: number) {
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1;
}

export type WalkId = "aoi" | "reina" | "miki" | "sol" | "kira" | "yuki";
export type FieldBedId = "lantern";

/** Served walk-up path. Authored stems live in `content/music/`; copies sit in `public/audio/`. */
export function walkUpUrl(id: WalkId, alt = false): string {
  return alt ? `/audio/walk-${id}-alt.mp3` : `/audio/walk-${id}.mp3`;
}

/** Lantern Field bed. `content/music/lantern_1.mp3` is copied to this public path. */
export function fieldBedUrl(id: FieldBedId = "lantern"): string {
  return `/audio/${id}-field.mp3`;
}

/** Synth stand-ins. The title and the office play the lantern bed now (screen music "title"). */
export type MusicTrack =
  | "tension"
  | "victory"
  | "legend"
  | "diamond"
  | "rough"
  | "quiet"
  | "never-quit"
  | "walk-aoi"
  | "walk-reina"
  | "walk-miki"
  | "walk-sol"
  | "walk-kira"
  | "walk-yuki";

const TRACK_CONFIG: Record<
  MusicTrack,
  { interval: number; chords: number[][]; octaveEvery: number; vol: number; type: OscillatorType }
> = {
  tension: { interval: 210, chords: [[110, 131, 165], [98, 117, 147], [104, 131, 156], [117, 139, 175]], octaveEvery: 6, vol: 0.055, type: "sawtooth" },
  victory: { interval: 240, chords: [[262, 330, 392], [294, 370, 440], [330, 415, 494], [262, 349, 440]], octaveEvery: 4, vol: 0.05, type: "triangle" },
  legend: { interval: 420, chords: [[196, 247, 330], [220, 262, 330], [247, 294, 392], [262, 330, 440]], octaveEvery: 5, vol: 0.05, type: "triangle" },
  diamond: { interval: 360, chords: [[174, 220, 261], [196, 247, 294], [220, 261, 329], [196, 247, 311]], octaveEvery: 6, vol: 0.048, type: "triangle" },
  rough: { interval: 300, chords: [[146, 174, 220], [130, 164, 196], [138, 174, 207], [146, 185, 220]], octaveEvery: 7, vol: 0.042, type: "sine" },
  quiet: { interval: 480, chords: [[110, 146, 174], [98, 130, 164], [104, 138, 174], [110, 146, 185]], octaveEvery: 8, vol: 0.035, type: "sine" },
  "never-quit": { interval: 190, chords: [[196, 233, 294], [174, 220, 261], [185, 233, 277], [196, 247, 294]], octaveEvery: 4, vol: 0.055, type: "square" },
  "walk-aoi": { interval: 260, chords: [[262, 330, 392], [294, 349, 440], [247, 330, 392], [220, 294, 349]], octaveEvery: 4, vol: 0.05, type: "square" },
  "walk-reina": { interval: 200, chords: [[220, 277, 330], [196, 247, 311], [233, 277, 349], [208, 277, 330]], octaveEvery: 3, vol: 0.048, type: "triangle" },
  "walk-miki": { interval: 340, chords: [[164, 196, 247], [146, 185, 220], [174, 196, 233], [155, 196, 247]], octaveEvery: 5, vol: 0.05, type: "sawtooth" },
  "walk-sol": { interval: 180, chords: [[311, 370, 466], [349, 415, 523], [277, 370, 440], [330, 415, 494]], octaveEvery: 3, vol: 0.052, type: "sawtooth" },
  "walk-kira": { interval: 150, chords: [[392, 466, 587], [349, 440, 523], [415, 494, 622], [370, 466, 554]], octaveEvery: 2, vol: 0.055, type: "square" },
  "walk-yuki": { interval: 230, chords: [[247, 311, 370], [277, 330, 415], [233, 311, 392], [261, 330, 392]], octaveEvery: 4, vol: 0.046, type: "triangle" },
};

let _activeTrack: MusicTrack = "quiet";

export function isMuted() {
  return muted;
}

/** Exhibition owns the master mute for the session. Career must not re-silence contact (hy80). */
export function careerMuteAppliesToScreen(screen: string): boolean {
  return screen !== "exhibition";
}

export function setMasterMuted(on: boolean) {
  muted = on;
  if (master) master.gain.value = on ? 0 : 0.7;
}

export function setAudioEnabled(next: { sfx: boolean; music: boolean }) {
  enabled = next;
  applyMix();
  if (!next.sfx && crowd) crowd.gain.gain.value = 0;
  if (!next.music) stopMusic();
}

/** Debug / HUD: "none" until the first Coach tap opens the graph. */
export function audioContextState(): AudioContextState | "none" {
  return ctx?.state ?? "none";
}

function tapPeak(analyser: AnalyserNode | null, held: number): number {
  if (!analyser) return held;
  const buf = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(buf);
  let peak = 0;
  for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
  return peak > held ? peak : held;
}

/** Peak of the SFX bus since unlock (0..128). Pre-master — can lie when muted (hy78). */
export function audioSfxPeak(): number {
  sfxPeak = tapPeak(sfxAnalyser, sfxPeak);
  return sfxPeak;
}

/** Peak after the master mute. This is the speaker path (hy85). */
export function audioMasterPeak(): number {
  masterPeak = tapPeak(masterAnalyser, masterPeak);
  return masterPeak;
}

/** Clear held peaks so the next release dump is this beat, not the walk-up. */
export function resetAudioPeaks() {
  sfxPeak = 0;
  masterPeak = 0;
}

export function unlockAudio() {
  const existing = graph();
  if (existing) {
    ctx = existing.ctx;
    master = existing.master;
    sfx = existing.sfx;
    music = existing.music;
  } else if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC({ latencyHint: "interactive" });
    master = ctx.createGain();
    sfx = ctx.createGain();
    music = ctx.createGain();
    master.gain.value = muted ? 0 : 0.7;
    sfx.connect(master);
    music.connect(master);
    master.connect(ctx.destination);
    setGraph({ ctx, master, sfx, music, chipGen: 0, chipTimer: null });
  }
  if (ctx && sfx && !crowdBus) {
    crowdBus = ctx.createGain();
    crowdBus.connect(sfx);
  }
  if (ctx && sfx && !sfxAnalyser) {
    sfxAnalyser = ctx.createAnalyser();
    sfxAnalyser.fftSize = 256;
    sfx.connect(sfxAnalyser);
  }
  if (ctx && master && !masterAnalyser) {
    masterAnalyser = ctx.createAnalyser();
    masterAnalyser.fftSize = 256;
    master.connect(masterAnalyser);
  }
  applyMix();
  if (master) master.gain.value = muted ? 0 : 0.7;
  if (ctx.state === "suspended") void ctx.resume();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && ctx?.state === "suspended") void ctx.resume();
  });
}

function now() {
  return ctx?.currentTime ?? 0;
}

function tone(freq: number, dur: number, type: OscillatorType, vol = 0.08, dest?: GainNode) {
  if (!ctx || !sfx || !enabled.sfx) return;
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
  if (!ctx || !sfx || !enabled.sfx) return;
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

/** Moving to the next line of a scene: a soft tick, not a chiptune beep under painted art. */
export function sfxTick() {
  if (!enabled.sfx) return;
  tone(1320, 0.03, "sine", 0.03);
}

/** A choice paid off: two rising notes as the gain floats up. */
export function sfxGain() {
  if (!enabled.sfx || !ctx || !sfx) return;
  tone(880, 0.12, "sine", 0.045);
  window.setTimeout(() => tone(1320, 0.18, "sine", 0.045), 110);
}

/** One letter of a spoken line: a soft, short blip at the speaker's pitch. */
export function sfxVoice(freq: number) {
  if (!enabled.sfx) return;
  tone(freq * (0.97 + Math.random() * 0.06), 0.035, "triangle", 0.025);
  dipScreenMusic();
}

export function sfxSelect() {
  if (!enabled.sfx) return;
  tone(520, 0.05, "square", 0.04);
  tone(780, 0.08, "square", 0.04);
}

export function sfxGlove() {
  if (!enabled.sfx) return;
  noise(0.05, 0.12, 1200);
  tone(640, 0.04, "square", 0.03);
}

export function sfxSlide() {
  if (!enabled.sfx) return;
  noise(0.14, 0.09, 600);
  tone(180, 0.08, "triangle", 0.025);
}

export type CrowdStemId = "koi" | "north" | "east" | "west" | "midwest" | "desert";

const crowdBufs = new Map<CrowdStemId, AudioBuffer>();
let crowdGen = 0;

function crowdId(stem: CrowdStemId | "us"): CrowdStemId {
  return stem === "us" ? "east" : stem;
}

function fillCrowd(stem: CrowdStemId, sr: number) {
  const seconds = 4;
  const n = sr * seconds;
  const data = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let v = (Math.random() * 2 - 1) * 0.18;
    if (stem === "koi") {
      const clap = t % 0.4;
      if (clap < 0.025) v += (Math.random() * 2 - 1) * 0.55;
    } else if (stem === "north") {
      v *= 0.9;
      if (t % 0.52 < 0.04) v += (Math.random() * 2 - 1) * 0.35;
    } else if (stem === "west") {
      const swell = t % 1.6;
      if (swell < 0.12) v += (Math.random() * 2 - 1) * 0.22;
    } else if (stem === "midwest") {
      const swell = t % 0.85;
      if (swell < 0.1) v += (Math.random() * 2 - 1) * 0.4;
    } else if (stem === "desert") {
      v *= 0.55;
      if (t % 2.2 < 0.05) v += (Math.random() * 2 - 1) * 0.12;
    } else {
      const swell = t % 1.1;
      if (swell < 0.08) v += (Math.random() * 2 - 1) * 0.32;
    }
    data[i] = Math.max(-1, Math.min(1, v));
  }
  return data;
}

function crowdFilter(stem: CrowdStemId) {
  if (stem === "koi") return { freq: 620, q: 1.6 };
  if (stem === "north") return { freq: 420, q: 0.9 };
  if (stem === "west") return { freq: 740, q: 0.55 };
  if (stem === "midwest") return { freq: 500, q: 0.8 };
  if (stem === "desert") return { freq: 1100, q: 0.45 };
  return { freq: 880, q: 0.7 };
}

function stopCrowdInternal() {
  if (crowd?.cowbell != null) window.clearInterval(crowd.cowbell);
  try {
    crowd?.src.stop();
  } catch {
    /* noop */
  }
  crowd = null;
}

async function decodeUrl(url: string): Promise<AudioBuffer | null> {
  if (!ctx) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const bytes = await res.arrayBuffer();
    return await ctx.decodeAudioData(bytes.slice(0));
  } catch {
    return null;
  }
}

function playCrowdBuffer(buf: AudioBuffer, stem: CrowdStemId, level: number, live = false) {
  if (!ctx || !sfx || !enabled.sfx) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const g = ctx.createGain();
  g.gain.value = live ? Math.max(level, 0.12) : level;
  if (live) {
    src.connect(g);
  } else {
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    const mix = crowdFilter(stem);
    f.frequency.value = mix.freq;
    f.Q.value = mix.q;
    src.connect(f);
    f.connect(g);
  }
  g.connect(crowdBus ?? sfx);
  src.start();
  let cowbell: number | undefined;
  if (!live && stem === "north") {
    const ding = () => {
      if (!ctx || !sfx || !enabled.sfx) return;
      tone(980, 0.08, "triangle", 0.035);
      tone(1470, 0.05, "sine", 0.02);
    };
    ding();
    cowbell = window.setInterval(ding, 520);
  }
  crowd = { src, gain: g, cowbell, bed: g.gain.value };
}

async function crowdFromFile(stem: CrowdStemId): Promise<AudioBuffer | null> {
  if (!ctx) return null;
  const hit = crowdBufs.get(stem);
  if (hit) return hit;
  const buf = (await decodeUrl(`/audio/crowd-${stem}.mp3`)) ?? (await decodeUrl(`/audio/crowd-${stem}.wav`));
  if (buf) crowdBufs.set(stem, buf);
  return buf;
}

export function sfxCrowd(level = 0.04, stem: CrowdStemId | "us" = "east") {
  if (!ctx || !sfx || !enabled.sfx) return;
  const id = crowdId(stem);
  const gen = ++crowdGen;
  stopCrowdInternal();
  void crowdFromFile(id).then((file) => {
    if (gen !== crowdGen || !ctx || !sfx || !enabled.sfx) return;
    if (file) {
      playCrowdBuffer(file, id, level, true);
      return;
    }
    const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    buf.getChannelData(0).set(fillCrowd(id, ctx.sampleRate));
    playCrowdBuffer(buf, id, level);
  });
}

/** Modulate ambient crowd level (0–1). No-op when crowd loop is not running. */
export function setCrowdLevel(n: number) {
  if (!crowd || !enabled.sfx) return;
  const t = Math.max(0, Math.min(1, n));
  const level = crowd.bed >= 0.08 ? Math.max(0.05, t) : t * 0.14;
  crowd.gain.gain.cancelScheduledValues(now());
  crowd.gain.gain.setValueAtTime(level, now());
}

/** Duck 応援 / crowd during the tap so the plate, not the song, is what testers name. */
export function duckCrowd(on: boolean) {
  if (crowd && enabled.sfx) {
    crowd.gain.gain.cancelScheduledValues(now());
    crowd.gain.gain.setTargetAtTime(on ? crowd.bed * 0.2 : crowd.bed, now(), 0.06);
  }
  if (fileMusic) {
    fileMusic.gain.gain.cancelScheduledValues(now());
    fileMusic.gain.gain.setTargetAtTime(on ? 0.06 * fileMusic.bed : fileMusic.bed, now(), 0.06);
  }
  if (fieldBed) {
    fieldBed.gain.gain.cancelScheduledValues(now());
    fieldBed.gain.gain.setTargetAtTime(on ? fieldBed.bed * 0.18 : fieldBed.bed, now(), 0.06);
  }
}

export function sfxCrowdBurst() {
  if (!crowd || !ctx || !enabled.sfx) return;
  crowd.gain.gain.cancelScheduledValues(now());
  crowd.gain.gain.setValueAtTime(Math.max(0.18, crowd.bed * 1.6), now());
  crowd.gain.gain.exponentialRampToValueAtTime(Math.max(0.04, crowd.bed), now() + 1.4);
}

/** North Field cowbell — presentation only. Fires when cowbellOn is true; never a Guts buff. */
export function sfxCowbell() {
  if (!enabled.sfx) return;
  tone(980, 0.09, "triangle", 0.045);
  tone(1470, 0.06, "sine", 0.025);
  tone(740, 0.05, "triangle", 0.02);
}

export function stopCrowd() {
  crowdGen += 1;
  stopCrowdInternal();
}

/**
 * The curtain call's clapping (check-in 31, N10): the stands clap her name in time, two short
 * and one held, under the verses. Each clap is a burst of bright noise; a few hands a beat late
 * make it a crowd, not a metronome.
 */
export const CLAP_PATTERN_MS: readonly number[] = [0, 260, 780];
export const CLAP_BAR_MS = 1040;

export function sfxClap(vol = 0.09) {
  if (!ctx || !sfx || !enabled.sfx) return;
  noise(0.06, vol, 1400);
  const late = ctx;
  window.setTimeout(() => {
    if (ctx === late) noise(0.05, vol * 0.55, 1800);
  }, 18);
}

/** Clap the pattern bar after bar until the returned stop is called. Safe without audio. */
export function startClapping(): () => void {
  if (typeof window === "undefined") return () => {};
  const timers = new Set<number>();
  let live = true;
  const bar = () => {
    if (!live) return;
    for (const at of CLAP_PATTERN_MS) {
      const id = window.setTimeout(() => {
        timers.delete(id);
        if (live) sfxClap(at === CLAP_PATTERN_MS.at(-1) ? 0.11 : 0.08);
      }, at);
      timers.add(id);
    }
    const next = window.setTimeout(() => {
      timers.delete(next);
      bar();
    }, CLAP_BAR_MS);
    timers.add(next);
  };
  bar();
  return () => {
    live = false;
    for (const id of timers) window.clearTimeout(id);
    timers.clear();
  };
}

export function sfxWhoosh() {
  if (!enabled.sfx) return;
  noise(0.12, 0.07, 900);
  tone(420, 0.1, "triangle", 0.03);
}

export function sfxCrack() {
  sfxContact("barrel");
}

export type ContactTier = "miss" | "foul-tip" | "foul" | "hit" | "barrel";

type ContactTone = { freq: number; dur: number; type: OscillatorType; vol: number };
type ContactNoise = { dur: number; vol: number; freq: number };

/** Ear recipes for §1.4. Miss whoosh, tip ping, foul woody, hit crack, barrel — not one bat. */
export const CONTACT_SFX: Record<ContactTier, { noise: ContactNoise; tones: readonly ContactTone[] }> = {
  miss: { noise: { dur: 0.08, vol: 0.14, freq: 1800 }, tones: [{ freq: 240, dur: 0.07, type: "triangle", vol: 0.07 }] },
  "foul-tip": { noise: { dur: 0.04, vol: 0.22, freq: 2400 }, tones: [{ freq: 880, dur: 0.05, type: "triangle", vol: 0.09 }] },
  foul: { noise: { dur: 0.11, vol: 0.18, freq: 700 }, tones: [{ freq: 160, dur: 0.12, type: "sawtooth", vol: 0.08 }] },
  hit: { noise: { dur: 0.07, vol: 0.26, freq: 1000 }, tones: [{ freq: 220, dur: 0.1, type: "triangle", vol: 0.13 }] },
  barrel: {
    noise: { dur: 0.09, vol: 0.38, freq: 800 },
    tones: [
      { freq: 180, dur: 0.12, type: "square", vol: 0.18 },
      { freq: 90, dur: 0.16, type: "sawtooth", vol: 0.11 },
    ],
  },
};

/** Layers the ear hears on release. Take is leather+call, not a silent miss. */
export const RELEASE_SFX_LAYERS: Record<ReleaseBeat, readonly string[]> = {
  k: ["umpire", "tone:196", "crowd-burst"],
  out: ["glove", "tone:262"],
  hit: ["contact:hit", "crowd-swell"],
  double: ["contact:barrel", "crowd-burst"],
  hr: ["contact:barrel", "crowd-burst", "organ"],
  walk: ["tone:330", "tone:392"],
  foul: ["contact:foul"],
  "foul-tip": ["contact:foul-tip"],
  miss: ["contact:miss", "glove"],
  ball: ["glove"],
  // hy131: looking strike owns its recipe — quiet glove+ump died under the bed.
  "take-strike": ["take-leather", "ump-call"],
  "steal-safe": ["slide", "crowd-burst"],
  "steal-out": ["slide", "umpire"],
  "sac-fly": ["glove", "crowd-burst"],
  score: ["crowd-burst", "tone:392", "tone:523"],
};

/**
 * Looking strike. Louder leather + a short ump bark so take ear-names vs
 * miss whoosh under the lantern bed (hy131 peaks were 1–2 on take).
 * Does not touch contact / miss recipes.
 */
export const TAKE_STRIKE_SFX = {
  leather: { dur: 0.07, vol: 0.22, freq: 1000 },
  pop: { freq: 520, dur: 0.06, type: "square" as OscillatorType, vol: 0.1 },
  call: { freq: 310, dur: 0.11, type: "square" as OscillatorType, vol: 0.09 },
};

export function sfxTakeStrike() {
  if (!enabled.sfx) return;
  noise(TAKE_STRIKE_SFX.leather.dur, TAKE_STRIKE_SFX.leather.vol, TAKE_STRIKE_SFX.leather.freq);
  tone(TAKE_STRIKE_SFX.pop.freq, TAKE_STRIKE_SFX.pop.dur, TAKE_STRIKE_SFX.pop.type, TAKE_STRIKE_SFX.pop.vol);
  tone(TAKE_STRIKE_SFX.call.freq, TAKE_STRIKE_SFX.call.dur, TAKE_STRIKE_SFX.call.type, TAKE_STRIKE_SFX.call.vol);
}

export function sfxContact(tier: ContactTier) {
  if (!enabled.sfx) return;
  const rec = CONTACT_SFX[tier];
  noise(rec.noise.dur, rec.noise.vol, rec.noise.freq);
  for (const t of rec.tones) tone(t.freq, t.dur, t.type, t.vol);
}

function stopFileMusic() {
  try {
    fileMusic?.src.stop();
  } catch {
    /* noop */
  }
  fileMusic = null;
}

function playWalkBuffer(buf: AudioBuffer, level = 1, url?: string, fadeIn = 0, loop = true) {
  if (!ctx || !music || !enabled.music) return;
  // One song in this slot, ever: a late decode never leaves the last one playing with no handle on it.
  stopFileMusic();
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = loop;
  const g = ctx.createGain();
  if (fadeIn > 0) {
    g.gain.setValueAtTime(0.0001, now());
    g.gain.linearRampToValueAtTime(level, now() + fadeIn);
  } else {
    g.gain.value = level;
  }
  src.connect(g);
  g.connect(music);
  src.start();
  fileMusic = { src, gain: g, url, bed: level };
}

function stopFieldBed() {
  try {
    fieldBed?.src.stop();
  } catch {
    /* noop */
  }
  fieldBed = null;
}

function playFieldBuffer(buf: AudioBuffer, level = 0.55, fadeIn = 0) {
  if (!ctx || !music || !enabled.music) return;
  stopFieldBed();
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const g = ctx.createGain();
  if (fadeIn > 0) {
    g.gain.setValueAtTime(0.0001, now());
    g.gain.linearRampToValueAtTime(level, now() + fadeIn);
  } else {
    g.gain.value = level;
  }
  src.connect(g);
  g.connect(music);
  src.start();
  fieldBed = { src, gain: g, bed: level };
}

export function startWalkUp(id: WalkId, alt = false) {
  unlockAudio();
  if (!enabled.music || !ctx || !music) return;
  stopMusic();
  const gen = walkGen;
  const primary = walkUpUrl(id);
  const url = walkUpUrl(id, alt);
  void (async () => {
    let buf = walkBufs.get(url) ?? (await decodeUrl(url));
    if (!buf && alt && url !== primary) buf = walkBufs.get(primary) ?? (await decodeUrl(primary));
    if (buf) walkBufs.set(url, buf);
    if (gen !== walkGen) return;
    // A walk-up plays once as she steps in, like the park's; the crowd carries the date after it.
    // (It used to loop under every pitch: a 13-second song for five minutes, over the organ and the fanfare.)
    if (buf) {
      playWalkBuffer(buf, 1, url, 0, false);
      return;
    }
  })();
}

/** Park bed under the walk-up. Does not stop the walk-up or start a new engine. */
export function startFieldBed(id: FieldBedId = "lantern") {
  unlockAudio();
  if (!enabled.music || !ctx || !music) return;
  const gen = ++fieldBedGen;
  stopFieldBed();
  const url = fieldBedUrl(id);
  void (async () => {
    const buf = fieldBufs.get(url) ?? (await decodeUrl(url));
    if (buf) fieldBufs.set(url, buf);
    if (gen !== fieldBedGen) return;
    if (buf) playFieldBuffer(buf);
  })();
}

const PIANO: Record<"legend" | "diamond" | "rough" | "quiet" | "never-quit", { notes: number[]; hold: number; last: number[] }> = {
  legend: { notes: [261.63, 329.63, 392.0, 523.25, 493.88, 392.0, 329.63, 523.25], hold: 520, last: [523.25, 659.25, 783.99] },
  diamond: { notes: [220.0, 261.63, 329.63, 392.0, 349.23, 329.63, 261.63, 392.0], hold: 560, last: [392.0, 523.25] },
  rough: { notes: [196.0, 246.94, 293.66, 246.94, 220.0, 196.0, 174.61, 196.0], hold: 640, last: [174.61, 146.83] },
  quiet: { notes: [174.61, 196.0, 220.0, 196.0, 174.61, 146.83, 164.81, 174.61], hold: 720, last: [146.83] },
  "never-quit": { notes: [196.0, 233.08, 293.66, 349.23, 329.63, 293.66, 233.08, 293.66], hold: 480, last: [293.66, 392.0, 466.16] },
};

function pianoVoice(freq: number, dur: number, vol: number) {
  if (!ctx || !music || !enabled.music) return;
  const t = now();
  const fund = ctx.createOscillator();
  const over = ctx.createOscillator();
  const g = ctx.createGain();
  fund.type = "sine";
  over.type = "sine";
  fund.frequency.value = freq;
  over.frequency.value = freq * 2;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
  g.gain.exponentialRampToValueAtTime(vol * 0.35, t + dur * 0.35);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  fund.connect(g);
  over.connect(g);
  g.connect(music);
  fund.start(t);
  over.start(t);
  fund.stop(t + dur + 0.02);
  over.stop(t + dur + 0.02);
}

function startPiano(rank: "S" | "A" | "B" | "C" | "D" | "never-quit") {
  if (!ctx || !music || !enabled.music) return;
  stopMusic();
  const key = rank === "S" ? "legend" : rank === "A" ? "diamond" : rank === "never-quit" ? "never-quit" : rank === "D" ? "quiet" : "rough";
  const cfg = PIANO[key];
  let step = 0;
  const tick = () => {
    if (!enabled.music) return;
    const cycle = Math.floor(step / cfg.notes.length);
    const inBar = step % cfg.notes.length;
    const freq = cycle > 0 && inBar >= cfg.notes.length - cfg.last.length ? cfg.last[inBar - (cfg.notes.length - cfg.last.length)] ?? cfg.notes[inBar]! : cfg.notes[inBar]!;
    pianoVoice(freq, (cfg.hold / 1000) * 1.6, key === "quiet" ? 0.04 : 0.055);
    step += 1;
    pianoTimer = window.setTimeout(tick, cfg.hold);
  };
  tick();
}

export function startEnding(rank: "S" | "A" | "B" | "C" | "D" | "never-quit") {
  startPiano(rank);
}

// ── Music between games (check-in 22, F9) ───────────────────────────────────
// The complex, her big scenes and the end of a career each have a bed. ShineApp picks
// one cue per screen; a cue that is already playing never restarts, so swapping screens
// under the same cue (the work screen, an event, the work screen again) is seamless.

/** The §9.4 files. Null until they land in public/audio; the stand-ins play until then. */
export const COMPLEX_THEME_FILE: string | null = null; // "/audio/complex-day.mp3"
export const LIVE_SONG_FILE: string | null = null; // "/audio/winning-live.mp3"

export type ScreenMusic =
  /** The title, Select and her promise scene: the lantern bed, one start across all three (check-in 27, N9). */
  | { kind: "title" }
  | { kind: "complex" }
  | { kind: "theme"; id: WalkId }
  | { kind: "live"; id: WalkId }
  | { kind: "bow"; rank: "S" | "A" | "B" | "C" | "D" | "never-quit" };

/** Gain of each bed on the music bus (before the player's Music volume and the mute). */
export const SCREEN_MUSIC_LEVEL = { title: 0.3, complex: 0.3, theme: 0.2, live: 1 } as const;

export function screenMusicKey(cue: ScreenMusic | null): string {
  if (!cue) return "";
  if (cue.kind === "title") return "title";
  if (cue.kind === "complex") return "complex";
  if (cue.kind === "bow") return `bow:${cue.rank}`;
  return `${cue.kind}:${cue.id}`;
}

/**
 * The walk-ups too chiptune to carry a Winning Live (check-in 30, F9): the girls whose walk-up
 * voice is the square wave (TRACK_CONFIG; Aoi and Kira). Until the Live song lands
 * (LIVE_SONG_FILE, the swap point), their Live plays the lantern bed at the Live's gain, with
 * the fanfare over it, as the title does.
 */
export const LIVE_ON_LANTERN_BED: readonly WalkId[] = (["aoi", "reina", "miki", "sol", "kira", "yuki"] as const).filter(
  (id) => TRACK_CONFIG[`walk-${id}`].type === "square",
);

/** The file a cue plays. Her theme and her Live are the same walk-up until the Live song lands. */
export function screenMusicUrl(cue: ScreenMusic): string | null {
  if (cue.kind === "title") return fieldBedUrl("lantern");
  if (cue.kind === "complex") return COMPLEX_THEME_FILE ?? fieldBedUrl("lantern");
  if (cue.kind === "theme") return walkUpUrl(cue.id);
  if (cue.kind === "live") return LIVE_SONG_FILE ?? (LIVE_ON_LANTERN_BED.includes(cue.id) ? fieldBedUrl("lantern") : walkUpUrl(cue.id));
  return null;
}

let screenKey: string | null = null;
let screenGen = 0;
const screenBufs = new Map<string, AudioBuffer>();

/** The cue the screen music is playing, or null (a race or another engine owns the bus). */
export function activeScreenMusic(): string | null {
  return screenKey;
}

export function playScreenMusic(cue: ScreenMusic) {
  if (!ctx || !music || !enabled.music) return;
  const key = screenMusicKey(cue);
  if (key === screenKey) return;
  const url = screenMusicUrl(cue);
  // Her theme rising into her Live is one song: ride the level up, never restart it.
  if (url && screenKey && fileMusic && fileMusic.url === url && (cue.kind === "theme" || cue.kind === "live")) {
    const level = SCREEN_MUSIC_LEVEL[cue.kind];
    const g = fileMusic.gain.gain;
    g.cancelScheduledValues(now());
    g.setValueAtTime(g.value, now());
    g.linearRampToValueAtTime(level, now() + 1.6);
    fileMusic.bed = level;
    screenKey = key;
    return;
  }
  stopMusic();
  if (cue.kind === "bow") {
    startPiano(cue.rank);
    screenKey = key;
    return;
  }
  screenKey = key;
  const gen = ++screenGen;
  if (!url) return;
  const kind = cue.kind;
  const level = SCREEN_MUSIC_LEVEL[kind];
  void (async () => {
    const buf = screenBufs.get(url) ?? (await decodeUrl(url));
    if (buf) screenBufs.set(url, buf);
    if (gen !== screenGen || screenKey !== key || !buf) return;
    if (kind === "complex" || kind === "title") playFieldBuffer(buf, level, 1.2);
    else playWalkBuffer(buf, level, url, kind === "live" ? 0.4 : 1.2);
  })();
}

/** A spoken line dips the quiet beds for a breath so the voice sits on top. The race's walk-up is left alone. */
function dipScreenMusic() {
  if (!ctx || !screenKey) return;
  const t = now();
  for (const b of [fieldBed, fileMusic]) {
    if (!b || b.bed >= 0.9) continue;
    const g = b.gain.gain;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(b.bed * 0.55, t, 0.03);
    g.setTargetAtTime(b.bed, t + 0.2, 0.25);
  }
}

export function sfxWhiff() {
  sfxContact("miss");
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

/**
 * The result stamp lands with a body blow: a low boom under the slam, then
 * a chime that names the mood (gold climbs, coral falls, teal lifts once).
 */
/** Tap to start: a warm open chord that blooms, the first sound of the game. */
export const TITLE_STING = [262, 392, 523, 659, 784] as const;

export function sfxTitleSting() {
  if (!enabled.sfx || !ctx || !sfx) return;
  TITLE_STING.forEach((f, i) => {
    const o = ctx!.createOscillator();
    const g = ctx!.createGain();
    o.type = i === 0 ? "sine" : "triangle";
    o.frequency.value = f;
    const at = now() + i * 0.06;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(i === 0 ? 0.09 : 0.05, at + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 1.4);
    o.connect(g);
    g.connect(sfx!);
    o.start(at);
    o.stop(at + 1.45);
  });
}

export type StampTone = "gold" | "coral" | "teal";
export const STAMP_SFX: Record<StampTone, readonly number[]> = {
  gold: [523, 659, 784, 1047],
  coral: [392, 311],
  teal: [587, 880],
};

export function sfxStamp(stampTone: StampTone) {
  if (!enabled.sfx || !ctx || !sfx) return;
  noise(0.16, 0.3, 140);
  tone(55, 0.42, "sine", 0.22);
  tone(82, 0.24, "triangle", 0.1);
  STAMP_SFX[stampTone].forEach((f, i) => {
    const o = ctx!.createOscillator();
    const g = ctx!.createGain();
    o.type = "triangle";
    o.frequency.value = f;
    const at = now() + 0.05 + i * 0.07;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(stampTone === "gold" ? 0.07 : 0.05, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.34);
    o.connect(g);
    g.connect(sfx!);
    o.start(at);
    o.stop(at + 0.36);
  });
}

export function sfxHr() {
  sfxCrack();
  sfxCrowdBurst();
  sfxOrgan();
}

/**
 * Anticipation: a held two-note under the windup. The release cue that follows
 * is what pays it off, so this stays quiet and unresolved.
 */
export function sfxAnticipation(leverage = false) {
  if (!enabled.sfx || !ctx || !sfx) return;
  tone(leverage ? 147 : 131, 0.42, "triangle", 0.028);
  tone(leverage ? 220 : 196, 0.42, "sine", 0.02);
}

export type ReleaseBeat =
  | "k"
  | "out"
  | "hit"
  | "double"
  | "hr"
  | "walk"
  | "foul"
  | "foul-tip"
  | "miss"
  | "ball"
  | "take-strike"
  | "steal-safe"
  | "steal-out"
  | "sac-fly"
  | "score";

/** Release: each field outcome owns a distinct cue so the ear knows before the banner does. */
export function sfxRelease(beat: ReleaseBeat) {
  if (!enabled.sfx) return;
  switch (beat) {
    case "k":
      sfxUmpire();
      tone(196, 0.14, "square", 0.05);
      sfxCrowdBurst();
      return;
    case "out":
      sfxGlove();
      tone(262, 0.08, "triangle", 0.03);
      return;
    case "hit":
      sfxContact("hit");
      if (crowd && ctx) {
        crowd.gain.gain.cancelScheduledValues(now());
        crowd.gain.gain.setValueAtTime(Math.max(0.12, crowd.bed * 1.3), now());
        crowd.gain.gain.exponentialRampToValueAtTime(Math.max(0.04, crowd.bed), now() + 0.9);
      }
      return;
    case "double":
      sfxContact("barrel");
      sfxCrowdBurst();
      return;
    case "hr":
      sfxHr();
      return;
    case "score":
      sfxCrowdBurst();
      tone(392, 0.12, "triangle", 0.05);
      tone(523, 0.16, "triangle", 0.05);
      return;
    case "sac-fly":
      sfxGlove();
      sfxCrowdBurst();
      return;
    case "walk":
      tone(330, 0.1, "sine", 0.035);
      tone(392, 0.12, "sine", 0.03);
      return;
    case "ball":
      sfxGlove();
      return;
    case "take-strike":
      sfxTakeStrike();
      return;
    case "foul":
      sfxContact("foul");
      return;
    case "foul-tip":
      sfxContact("foul-tip");
      return;
    case "miss":
      sfxContact("miss");
      sfxGlove();
      return;
    case "steal-safe":
      sfxSlide();
      sfxCrowdBurst();
      return;
    case "steal-out":
      sfxSlide();
      sfxUmpire();
      return;
  }
}

function stopChip() {
  const g = graph();
  if (g) {
    g.chipGen += 1;
    if (g.chipTimer != null) {
      clearTimeout(g.chipTimer);
      g.chipTimer = null;
    }
  }
  if (musicTimer != null) {
    clearTimeout(musicTimer);
    musicTimer = null;
  }
}

export function startMusic(track: MusicTrack = "quiet") {
  if (!ctx || !music || !enabled.music) return;
  _activeTrack = track;
  stopMusic();
  const cfg = TRACK_CONFIG[track];
  const g = graph();
  const gen = g?.chipGen ?? 0;
  let step = 0;
  const tick = () => {
    if (!ctx || !music || !enabled.music) return;
    if (g && g.chipGen !== gen) return;
    const chord = cfg.chords[step % cfg.chords.length]!;
    const note = chord[step % 3]!;
    const o = ctx.createOscillator();
    const gn = ctx.createGain();
    o.type = cfg.type;
    o.frequency.value = note * (step % cfg.octaveEvery === cfg.octaveEvery - 1 ? 2 : 1);
    gn.gain.setValueAtTime(0.0001, now());
    gn.gain.exponentialRampToValueAtTime(cfg.vol, now() + 0.02);
    gn.gain.exponentialRampToValueAtTime(0.0001, now() + 0.22);
    o.connect(gn);
    gn.connect(music);
    o.start();
    o.stop(now() + 0.24);
    step += 1;
    const t = window.setTimeout(tick, cfg.interval);
    musicTimer = t;
    if (g) g.chipTimer = t;
  };
  tick();
}

export function stopMusic() {
  walkGen += 1;
  fieldBedGen += 1;
  screenGen += 1;
  screenKey = null;
  stopFileMusic();
  stopFieldBed();
  stopChip();
  if (pianoTimer != null) {
    clearTimeout(pianoTimer);
    pianoTimer = null;
  }
}

// ── Date-presentation builder (check-in 22): the Finale's fanfare, the crowd by date tier ──

/**
 * The live crowd stem's bed for a date's level (race-ui dateCrowdLevel). The
 * old floor (0.12) is First Light's bed; the ladder scales around it, so the
 * Gate sits under it and the Finale well over it.
 */
export function liveCrowdBed(level: number): number {
  return Math.max(0.1, Math.min(0.26, (0.12 * level) / 0.05));
}

/** The date's crowd, at its rung on the ladder: the park's stem, with the bed scaled by the date. */
export function sfxCrowdForDate(level: number, stem: CrowdStemId | "us" = "east") {
  if (!ctx || !sfx || !enabled.sfx) return;
  const id = crowdId(stem);
  const gen = ++crowdGen;
  stopCrowdInternal();
  void crowdFromFile(id).then((file) => {
    if (gen !== crowdGen || !ctx || !sfx || !enabled.sfx) return;
    if (file) {
      playCrowdBuffer(file, id, level, true);
      if (crowd) {
        const bed = liveCrowdBed(level);
        crowd.gain.gain.value = bed;
        crowd.bed = bed;
      }
      return;
    }
    const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    buf.getChannelData(0).set(fillCrowd(id, ctx.sampleRate));
    playCrowdBuffer(buf, id, level);
  });
}

/** Strike two: the park leans in, then settles back to its bed. Smaller than a burst. */
export function sfxCrowdSwell() {
  if (!crowd || !ctx || !enabled.sfx) return;
  const bed = crowd.bed;
  crowd.gain.gain.cancelScheduledValues(now());
  crowd.gain.gain.setValueAtTime(Math.max(0.0001, crowd.gain.gain.value), now());
  crowd.gain.gain.linearRampToValueAtTime(Math.max(0.08, bed * 1.45), now() + 0.35);
  crowd.gain.gain.exponentialRampToValueAtTime(Math.max(0.02, bed), now() + 1.5);
}

/** One brass voice: three detuned saws through a lowpass that opens on the attack. */
function brass(freq: number, at: number, dur: number, vol: number) {
  if (!ctx || !sfx) return;
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.Q.value = 1.4;
  f.frequency.setValueAtTime(freq * 1.2, at);
  f.frequency.linearRampToValueAtTime(freq * 6, at + 0.05);
  f.frequency.exponentialRampToValueAtTime(freq * 2.4, at + Math.max(0.1, dur));
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.035);
  g.gain.setValueAtTime(vol * 0.8, at + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  f.connect(g);
  g.connect(sfx);
  for (const detune of [-8, 0, 7]) {
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = freq;
    o.detune.value = detune;
    o.connect(f);
    o.start(at);
    o.stop(at + dur + 0.05);
  }
}

/** The Finale's call to the post: a triplet pickup, the tonic, a climb, and the held chord. [freq Hz, start s, length s]. */
export const FINALE_FANFARE: readonly (readonly [number, number, number])[] = [
  [392.0, 0, 0.11],
  [392.0, 0.13, 0.11],
  [392.0, 0.26, 0.11],
  [523.25, 0.4, 0.46],
  [329.63, 0.4, 0.46],
  [440.0, 0.9, 0.14],
  [493.88, 1.06, 0.14],
  [523.25, 1.22, 1.35],
  [659.25, 1.22, 1.35],
  [783.99, 1.22, 1.35],
  [261.63, 1.22, 1.35],
];

let lastFanfare = -1;

/** The Finale's brass sting. A second call inside half a second (StrictMode's double mount) is the same sting. */
export function sfxFanfare() {
  if (!ctx || !sfx || !enabled.sfx) return;
  const t0 = now();
  if (lastFanfare >= 0 && t0 - lastFanfare < 0.5) return;
  lastFanfare = t0;
  for (const [f, at, dur] of FINALE_FANFARE) brass(f, t0 + at, dur, f < 300 ? 0.03 : 0.024);
}

/** A won Finale: the fanfare again over the park coming out of its seats. */
export function sfxFinaleWin() {
  sfxFanfare();
  sfxCrowdBurst();
  if (typeof window !== "undefined") window.setTimeout(sfxCrowdBurst, 1300);
}
