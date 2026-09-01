import { sfxCrack, sfxCrowdBurst, sfxHr, sfxUmpire, sfxWhiff, sfxWhoosh } from "./audio";
import type { Career, LiveGame, PitchType, PlayResult, Player, SwingKind } from "./types";
import {
  applyPlay,
  currentBatter,
  currentPitcher,
  pickPitch,
  resolveContact,
  teamById,
  userIsBatting,
} from "./sim";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
};

type Phase = "intro" | "windup" | "pitch" | "result" | "defense" | "over";

const W = 480;
const H = 270;
const FIXED = 1 / 60;
const CREAM = "#e8eadf";
const GRASS = "#c8e09a";
const MUTED = "#8a9180";
const INK = "#0c1210";

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadImageSafe(src: string) {
  try {
    return await loadImage(src);
  } catch {
    return null;
  }
}

function drawCell(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  frame: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  cols = 2,
  rows = 2,
) {
  const cw = img.width / cols;
  const ch = img.height / rows;
  const c = frame % cols;
  const r = Math.floor(frame / cols) % rows;
  ctx.drawImage(img, c * cw, r * ch, cw, ch, Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh));
}

export class DiamondEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private career: Career;
  private live: LiveGame;
  private shakeOn: boolean;
  private onLive: (l: LiveGame) => void;
  private onOver: () => void;
  private onDefense: () => void;
  private imgs: Record<string, HTMLImageElement | null> = {};
  private raf = 0;
  private acc = 0;
  private last = 0;
  private running = false;
  private phase: Phase = "intro";
  private t = 0;
  private hitstop = 0;
  private trauma = 0;
  private flash = 0;
  private particles: Particle[] = [];
  private trail: { x: number; y: number }[] = [];
  private pitch!: { type: PitchType; inZone: boolean; speed: number };
  private ball = { x: 0, y: 0, visible: false, spin: 0 };
  private swung = false;
  private swingKind: SwingKind = "contact";
  private swingT = -1;
  private releaseT = 0;
  private plateT = 0;
  private result: PlayResult | null = null;
  private banner = "";
  private sub = "";
  private batter!: Player;
  private pitcher!: Player;
  private destroyed = false;
  private reduced = false;
  private taught = false;
  private meterU = 0;
  private pop: { text: string; life: number; x: number; y: number } | null = null;

  constructor(opts: {
    canvas: HTMLCanvasElement;
    career: Career;
    live: LiveGame;
    shake: boolean;
    onLive: (l: LiveGame) => void;
    onOver: () => void;
    onDefense: () => void;
  }) {
    this.canvas = opts.canvas;
    this.ctx = opts.canvas.getContext("2d")!;
    this.career = opts.career;
    this.live = opts.live;
    this.shakeOn = opts.shake;
    this.onLive = opts.onLive;
    this.onOver = opts.onOver;
    this.onDefense = opts.onDefense;
    this.reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }

  async start() {
    const names = ["batter-idle", "batter-swing", "pitcher", "ball", "impact"] as const;
    const loaded = await Promise.all(names.map((n) => loadImageSafe(`/sprites/${n}.png`)));
    names.forEach((n, i) => {
      this.imgs[n] = loaded[i];
    });
    this.imgs.stadium = await loadImageSafe("/bg/stadium.jpg");
    try {
      await document.fonts.load("8px 'Press Start 2P'");
    } catch {
      /* system mono is fine */
    }
    if (this.destroyed) return;
    this.resize();
    window.addEventListener("resize", this.resize);
    this.running = true;
    this.last = performance.now();
    this.syncActors();
    if (this.live.over) this.phase = "over";
    else if (this.live.waitingDefense || !userIsBatting(this.live)) this.beginDefense();
    else this.beginAtBat();
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() {
    this.destroyed = true;
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
  }

  setLive(live: LiveGame, career: Career) {
    this.live = live;
    this.career = career;
    if (live.over && this.phase !== "over") {
      this.phase = "over";
      this.banner = "FINAL";
    }
  }

  swing(kind: SwingKind = "contact") {
    if (this.phase !== "pitch" && this.phase !== "windup") return;
    if (this.swung) return;
    this.swung = true;
    this.swingKind = kind;
    this.swingT = this.t;
  }

  skipDefense() {
    if (this.phase === "defense") this.finishDefense();
  }

  continueFromLive() {
    this.syncActors();
    if (this.live.over) {
      this.phase = "over";
      this.banner = "FINAL";
      this.sub = `${this.live.scoreA} - ${this.live.scoreH}`;
      window.setTimeout(() => this.onOver(), 700);
      return;
    }
    if (this.live.waitingDefense || !userIsBatting(this.live)) this.beginDefense();
    else this.beginAtBat();
  }

  private resize = () => {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = parent.getBoundingClientRect();
    const scale = Math.max(0.5, Math.min(rect.width / W, rect.height / H));
    const cssW = Math.floor(W * scale);
    const cssH = Math.floor(H * scale);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.canvas.width = Math.floor(W * dpr);
    this.canvas.height = Math.floor(H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  private syncActors() {
    this.batter = currentBatter(this.career, this.live);
    this.pitcher = currentPitcher(this.career, this.live);
  }

  private beginAtBat() {
    this.syncActors();
    this.phase = "intro";
    this.t = 0;
    this.swung = false;
    this.swingT = -1;
    this.result = null;
    this.ball.visible = false;
    this.trail = [];
    this.meterU = 0;
    this.banner = "NOW BATTING";
    this.sub = this.batter.name.toUpperCase();
  }

  private beginDefense() {
    this.phase = "defense";
    this.t = 0;
    this.banner = this.live.half === "top" ? "TOP" : "BOTTOM";
    this.sub = "THEY'RE BATTING";
    this.ball.visible = false;
  }

  private finishDefense() {
    if (this.phase !== "defense") return;
    this.phase = "intro";
    this.t = 0;
    this.onDefense();
  }

  private loop = (ts: number) => {
    if (!this.running) return;
    const dt = Math.min(0.1, (ts - this.last) / 1000);
    this.last = ts;
    this.acc += dt;
    while (this.acc >= FIXED) {
      if (this.hitstop > 0) this.hitstop -= FIXED;
      else this.update(FIXED);
      this.acc -= FIXED;
    }
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    this.t += dt;
    this.trauma = Math.max(0, this.trauma - dt * 1.8);
    this.flash = Math.max(0, this.flash - dt * 5);
    if (this.pop) {
      this.pop.life -= dt;
      this.pop.y -= 22 * dt;
      if (this.pop.life <= 0) this.pop = null;
    }
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 90 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    if (this.phase === "intro") {
      if (this.t > 0.7) this.startPitch();
    } else if (this.phase === "windup") {
      if (this.t >= this.releaseT) {
        this.phase = "pitch";
        this.ball.visible = true;
        sfxWhoosh();
      }
    } else if (this.phase === "pitch") {
      this.updateBall();
      if (this.swung && this.swingT >= 0 && this.t - this.swingT > 0.08) this.resolveSwing();
      if (!this.swung && this.t > this.plateT + 0.14) this.resolveSwing();
    } else if (this.phase === "result") {
      const hold = this.result?.kind === "hr" ? 1.35 : 0.95;
      if (this.t > hold) this.afterResult();
    } else if (this.phase === "defense") {
      if (this.t > 1.05) this.finishDefense();
    }
  }

  private startPitch() {
    this.pitch = pickPitch(this.pitcher, Math.random);
    this.phase = "windup";
    this.t = 0;
    this.releaseT = 0.48;
    this.plateT = this.releaseT + this.pitch.speed;
    this.swung = false;
    this.swingT = -1;
    this.banner = "";
    this.sub = this.pitch.type.toUpperCase();
    this.ball.visible = false;
    this.trail = [];
    this.meterU = 0;
  }

  private updateBall() {
    const u = Math.min(1.15, (this.t - this.releaseT) / Math.max(0.01, this.pitch.speed));
    this.meterU = Math.max(0, Math.min(1.12, u));
    const startX = 148;
    const startY = 118;
    const plateX = 338;
    const plateY = this.pitch.inZone ? 158 : this.pitch.type === "curve" ? 188 : 138;
    let yOff = 0;
    if (this.pitch.type === "curve") yOff = Math.sin(Math.min(1, u) * Math.PI) * 22;
    if (this.pitch.type === "slider") yOff = u * u * -16;
    if (this.pitch.type === "changeup") yOff = u * 10;
    this.ball.x = startX + (plateX - startX) * Math.min(1, u);
    this.ball.y = startY + (plateY - startY) * Math.min(1, u) + yOff;
    this.ball.spin += 18 * (this.pitch.type === "fastball" ? 1.5 : 1);
    this.trail.push({ x: this.ball.x, y: this.ball.y });
    if (this.trail.length > 8) this.trail.shift();
  }

  private resolveSwing() {
    if (this.phase !== "pitch") return;
    const error = this.swung ? this.swingT - this.plateT : 1;
    const play = resolveContact({
      error,
      swung: this.swung,
      inZone: this.pitch.inZone,
      type: this.pitch.type,
      batter: this.batter,
      pitcher: this.pitcher,
      rand: Math.random,
      powerSwing: this.swingKind === "power",
    });
    this.result = play;
    this.phase = "result";
    this.t = 0;
    this.banner = play.label;
    this.sub = play.description;
    this.taught = true;

    if (play.kind === "k" || play.kind === "out") {
      this.burst(this.ball.x, this.ball.y, CREAM, 7);
      sfxWhiff();
      sfxUmpire();
    } else if (play.kind === "bb") {
      sfxUmpire();
    } else {
      this.hitstop = this.reduced ? 0 : play.kind === "hr" ? 0.1 : 0.055;
      this.trauma = this.reduced || !this.shakeOn ? 0 : play.kind === "hr" ? 0.95 : 0.5;
      this.flash = this.reduced ? 0 : play.perfect ? 0.28 : 0.16;
      this.burst(338, 150, play.kind === "hr" ? GRASS : CREAM, play.kind === "hr" ? 32 : 16);
      this.pop = {
        text: play.perfect ? "PERFECT" : play.label,
        life: 0.7,
        x: 338,
        y: 120,
      };
      if (play.kind === "hr") sfxHr();
      else {
        sfxCrack();
        sfxCrowdBurst();
      }
    }
  }

  private afterResult() {
    if (!this.result) return;
    const { live } = applyPlay(this.live, this.result, this.batter);
    this.live = live;
    this.onLive(live);
    this.result = null;
    this.pop = null;
    if (live.over) {
      this.phase = "over";
      this.banner = live.walkOff ? "WALK OFF" : "FINAL";
      this.sub = `${live.scoreA} - ${live.scoreH}`;
      window.setTimeout(() => this.onOver(), 900);
      return;
    }
    if (live.waitingDefense || !userIsBatting(live)) {
      this.beginDefense();
      return;
    }
    this.beginAtBat();
  }

  private burst(x: number, y: number, color: string, n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 120;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 40,
        life: 0.35 + Math.random() * 0.35,
        max: 0.7,
        size: 1 + Math.random() * 2.4,
        color,
      });
    }
  }

  private render() {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    const shake = this.trauma * this.trauma;
    const ox = this.shakeOn && !this.reduced ? (Math.random() * 2 - 1) * 7 * shake : 0;
    const oy = this.shakeOn && !this.reduced ? (Math.random() * 2 - 1) * 5 * shake : 0;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.fillStyle = INK;
    ctx.fillRect(-10, -10, W + 20, H + 20);

    const stad = this.imgs.stadium;
    if (stad) ctx.drawImage(stad, 0, 0, W, H);
    ctx.fillStyle = "rgba(12,18,16,0.22)";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgba(196,165,116,0.28)";
    ctx.beginPath();
    ctx.ellipse(338, 208, 64, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(232,234,223,0.92)";
    ctx.beginPath();
    ctx.moveTo(338, 196);
    ctx.lineTo(350, 208);
    ctx.lineTo(338, 218);
    ctx.lineTo(326, 208);
    ctx.closePath();
    ctx.fill();

    // strike zone
    ctx.strokeStyle = "rgba(232,234,223,0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(322, 128, 32, 52);

    const pitcherFrame =
      this.phase === "windup"
        ? Math.min(3, Math.floor((this.t / this.releaseT) * 4))
        : this.phase === "pitch"
          ? 3
          : 0;
    if (this.imgs.pitcher) {
      drawCell(ctx, this.imgs.pitcher, pitcherFrame, 78, 86, 96, 96);
    }

    const swinging =
      this.swung && (this.phase === "pitch" || this.phase === "result") && (this.phase === "result" ? this.t : this.t - this.swingT) < 0.42;
    const batImg = swinging ? this.imgs["batter-swing"] : this.imgs["batter-idle"];
    const swingAge = this.phase === "result" ? this.t : Math.max(0, this.t - this.swingT);
    const batFrame = swinging
      ? Math.min(3, Math.floor((swingAge / 0.28) * 4))
      : Math.floor((performance.now() / 240) % 4);
    if (batImg) drawCell(ctx, batImg, batFrame, 286, 78, 112, 112);

    if (this.phase === "result" && this.result && this.result.quality > 0.4 && this.imgs.impact && this.t < 0.28) {
      const f = Math.min(3, Math.floor(this.t / 0.07));
      drawCell(ctx, this.imgs.impact, f, 312, 118, 52, 52);
    }

    if (this.ball.visible && (this.phase === "pitch" || (this.phase === "result" && this.t < 0.18))) {
      for (let i = 0; i < this.trail.length; i++) {
        const p = this.trail[i]!;
        ctx.globalAlpha = (i / this.trail.length) * 0.35;
        ctx.fillStyle = CREAM;
        ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
      }
      ctx.globalAlpha = 1;
      const u = Math.min(1, Math.max(0, (this.t - this.releaseT) / Math.max(0.01, this.pitch.speed)));
      const size = 10 + u * 10;
      const frame = Math.floor(this.ball.spin) % 4;
      if (this.imgs.ball) {
        ctx.save();
        ctx.translate(this.ball.x, this.ball.y);
        drawCell(ctx, this.imgs.ball, frame, -size / 2, -size / 2, size, size);
        ctx.restore();
      } else {
        ctx.fillStyle = CREAM;
        ctx.beginPath();
        ctx.arc(this.ball.x, this.ball.y, size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (this.phase === "result" && this.result && ["1b", "2b", "3b", "hr"].includes(this.result.kind)) {
      const u = Math.min(1, this.t / 0.85);
      const dist = this.result.kind === "hr" ? 110 : this.result.kind === "3b" ? 80 : this.result.kind === "2b" ? 58 : 36;
      const bx = 338 + u * dist;
      const by = 150 - Math.sin(u * Math.PI) * (this.result.kind === "hr" ? 118 : 52);
      ctx.fillStyle = CREAM;
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const p of this.particles) {
      ctx.globalAlpha = p.life / p.max;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.globalAlpha = 1;
    }

    if (this.pop) {
      ctx.globalAlpha = Math.min(1, this.pop.life * 2);
      ctx.fillStyle = GRASS;
      ctx.font = "10px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText(this.pop.text, this.pop.x, this.pop.y);
      ctx.textAlign = "left";
      ctx.globalAlpha = 1;
    }

    this.drawMeter(ctx);
    this.drawHud(ctx);

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(232,234,223,${this.flash * 0.35})`;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  private drawMeter(ctx: CanvasRenderingContext2D) {
    const show =
      this.phase === "windup" ||
      this.phase === "pitch" ||
      (this.phase === "result" && this.t < 0.4);
    if (!show) return;
    const x = 36;
    const y = 228;
    const w = 408;
    const h = 10;
    ctx.fillStyle = "rgba(12,18,16,0.72)";
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = "#1c2620";
    ctx.fillRect(x, y, w, h);

    const contactLo = 0.78;
    const contactHi = 1.02;
    const powerLo = 0.9;
    const powerHi = 1.0;
    ctx.fillStyle = "rgba(200,224,154,0.55)";
    ctx.fillRect(x + contactLo * w, y, (contactHi - contactLo) * w, h);
    ctx.fillStyle = GRASS;
    ctx.fillRect(x + powerLo * w, y, (powerHi - powerLo) * w, h);

    const u = this.phase === "windup" ? 0 : Math.min(1.12, this.meterU);
    const nx = x + Math.min(1, u) * w;
    ctx.fillStyle = CREAM;
    ctx.fillRect(nx - 1, y - 3, 2, h + 6);

    ctx.font = "6px 'Press Start 2P', monospace";
    ctx.fillStyle = MUTED;
    ctx.fillText(this.swingKind === "power" && this.swung ? "PWR" : "TIMING", x, y - 6);
    ctx.fillStyle = GRASS;
    ctx.textAlign = "right";
    ctx.fillText("SWEET", x + w, y - 6);
    ctx.textAlign = "left";
  }

  private drawHud(ctx: CanvasRenderingContext2D) {
    const live = this.live;
    const home = teamById(this.career, live.homeId);
    const away = teamById(this.career, live.awayId);

    ctx.fillStyle = "rgba(12,18,16,0.78)";
    ctx.fillRect(0, 0, W, 28);
    ctx.fillRect(0, H - 22, W, 22);

    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.fillStyle = CREAM;
    ctx.textBaseline = "top";
    ctx.fillText(`${away.abbr} ${live.scoreA}`, 8, 10);
    ctx.fillText(`${home.abbr} ${live.scoreH}`, 108, 10);
    ctx.fillStyle = GRASS;
    ctx.fillText(`${live.half === "top" ? "TOP" : "BOT"} ${live.inning}`, 208, 10);
    ctx.fillStyle = MUTED;
    ctx.fillText(`${live.outs} OUT`, 312, 10);
    this.drawDiamond(ctx, 456, 14, live.bases);

    if (this.banner) {
      ctx.fillStyle = "rgba(12,18,16,0.82)";
      ctx.fillRect(70, 36, 340, 40);
      ctx.strokeStyle = GRASS;
      ctx.strokeRect(70.5, 36.5, 339, 39);
      ctx.fillStyle = GRASS;
      ctx.font = "10px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText(this.banner.slice(0, 18), 240, 42);
      if (this.sub) {
        ctx.fillStyle = CREAM;
        ctx.font = "7px 'Press Start 2P', monospace";
        ctx.fillText(this.sub.slice(0, 32), 240, 58);
      }
      ctx.textAlign = "left";
    }

    if (!this.taught && (this.phase === "windup" || this.phase === "pitch") && !this.swung) {
      ctx.fillStyle = "rgba(12,18,16,0.7)";
      ctx.fillRect(70, 80, 340, 22);
      ctx.fillStyle = GRASS;
      ctx.font = "7px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText("SWING WHEN THE BAR HITS GREEN", 240, 87);
      ctx.textAlign = "left";
    }

    ctx.font = "7px 'Press Start 2P', monospace";
    ctx.fillStyle = CREAM;
    ctx.textBaseline = "middle";
    ctx.fillText(this.batter.name.slice(0, 16), 8, H - 11);
    ctx.fillStyle = MUTED;
    ctx.fillText(`VS ${this.pitcher.name.split(" ").pop()}`, 200, H - 11);

    if ((this.phase === "pitch" || this.phase === "windup") && !this.swung) {
      ctx.fillStyle = GRASS;
      ctx.font = "7px 'Press Start 2P', monospace";
      ctx.textAlign = "right";
      ctx.fillText("CONTACT / POWER", W - 10, H - 11);
      ctx.textAlign = "left";
    }
    if (this.phase === "defense") {
      ctx.fillStyle = GRASS;
      ctx.font = "8px 'Press Start 2P', monospace";
      ctx.textAlign = "right";
      ctx.fillText("TAP SKIP", W - 10, H - 11);
      ctx.textAlign = "left";
    }
  }

  private drawDiamond(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    bases: [boolean, boolean, boolean],
  ) {
    const pts = [
      [x, y + 8],
      [x + 8, y],
      [x, y - 8],
      [x - 8, y],
    ];
    ctx.strokeStyle = MUTED;
    ctx.beginPath();
    ctx.moveTo(pts[0]![0], pts[0]![1]);
    for (let i = 1; i < 4; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
    ctx.closePath();
    ctx.stroke();
    const occupied = [bases[0], bases[1], bases[2]];
    const idx = [1, 2, 3];
    idx.forEach((i, k) => {
      ctx.fillStyle = occupied[k] ? GRASS : "#2e3c34";
      ctx.beginPath();
      ctx.arc(pts[i]![0], pts[i]![1], 2.2, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}
