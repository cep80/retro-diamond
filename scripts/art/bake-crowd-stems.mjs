/** Bake 4-bar crowd WAVs. Replace with licensed stems later; the loader is the contract. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "../../public/audio");
mkdirSync(dir, { recursive: true });

const SR = 22050;
const SECONDS = 4;

function fill(stem, n) {
  const data = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = (Math.random() * 2 - 1) * 0.18;
    if (stem === "koi") {
      const clap = t % 0.4;
      if (clap < 0.025) v += (Math.random() * 2 - 1) * 0.55;
    } else if (stem === "north") {
      v *= 0.9;
      if (t % 0.52 < 0.04) v += (Math.random() * 2 - 1) * 0.35;
    } else if (stem === "east") {
      const swell = t % 1.1;
      if (swell < 0.08) v += (Math.random() * 2 - 1) * 0.32;
    } else if (stem === "west") {
      const swell = t % 1.6;
      if (swell < 0.12) v += (Math.random() * 2 - 1) * 0.22;
    } else if (stem === "midwest") {
      const swell = t % 0.85;
      if (swell < 0.1) v += (Math.random() * 2 - 1) * 0.4;
    } else {
      v *= 0.55;
      if (t % 2.2 < 0.05) v += (Math.random() * 2 - 1) * 0.12;
    }
    data[i] = Math.max(-1, Math.min(1, v));
  }
  return data;
}

function wav(samples) {
  const pcm = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) pcm.writeInt16LE(Math.round(samples[i] * 32767), i * 2);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

for (const stem of ["koi", "north", "east", "west", "midwest", "desert"]) {
  writeFileSync(join(dir, `crowd-${stem}.wav`), wav(fill(stem, SR * SECONDS)));
  console.log(stem);
}
