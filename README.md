# Diamond Shine

**Diamond Shine** (ダイヤシャイン) is a single-player baseball career. You are her **Coach**. Home is the **complex**. The plate is the race.

Never ダイヤの〜.

## Play

- **Work** — Cage, Poles, Live looks, On-field BP, Situational, Off day, Trainer's room, Clubhouse (Catch with Coach). One station per turn. No tap at the stations; a one-second window preview, then the work lands.
- **Featured games** — Academy Gate (5), First Light (18), Lantern Classic (28, always Lantern Field), Night Classic, Stretch, Series, Finale. Sit on the 3×3, pick Contact / Power / Bunt, time the tap. Pitch reads `?` until her Eye picks it up. Hot cells `+`, cold cells `×`. Primary Goal for Aoi (Lead): **REACH**.
- You are not a GM. There is no office, cap, or trade board on the title.

Aoi's Rookie year (turns 1–20) is the first playable year. The career is 60 turns. Title select starts all six 1.0 girls. Ace (Reina, Sol) throw a three-act outing; Closers (Kira) enter in the ninth.

## Run

```bash
npm install
npm run dev
```

App listens on `0.0.0.0:8080`.

```bash
npm run typecheck
npm test
npm run test:contact
```

`test:contact` is the Turn-12 Contact 7 vs 14 oracle (target gap 25–35pp).

Saves live in the browser (`localStorage`).

## Stack

TanStack Start, React 19, Tailwind v4, Zustand.
