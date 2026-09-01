# Retro Diamond

A baseball career game in the spirit of Retro Bowl. Run the club from the office, then time the swing at the plate.

## Play

- **Office** — 16 clubs, 16-week season, playoffs, rings. Roster, lineup, rotation, free agents, training, park, press. Keep the owner happy.
- **At-bats** — one pitch per plate appearance. Hit **Contact** when the meter hits green, or **Power** for a tighter window and more lift. Lay off balls. Defense sims itself.
- **Keys** — Space / J = Contact, K / X = Power, Enter = skip defense.

## Run

```bash
npm install
npm run dev
```

App listens on `0.0.0.0:8080`.

```bash
npm run build
npm run typecheck
```

Saves live in the browser (`localStorage`). No account required.

## Stack

TanStack Start, React 19, Tailwind v4, Zustand, Canvas 2D.
