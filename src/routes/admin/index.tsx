import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "Diamond Shine · Balance admin" }],
  }),
  component: AdminPage,
});

/** Read-only balance dashboard stub (M4.10). SQL charts wire when telemetry Neon is live. */
function AdminPage() {
  const charts = [
    "K/BB/HR by difficulty",
    "Timing error histogram",
    "Location error histogram",
    "Kick/release miss",
    "Aim cell heatmap",
    "Swing type × outcome",
    "Pitch type usage",
    "CPU vs user symmetry",
    "Fatigue vs location error",
    "Park factor realized",
  ];
  return (
    <main className="mx-auto min-h-dvh max-w-lg bg-ink px-4 py-8 text-cream">
      <h1 className="font-display text-sm tracking-wide">BALANCE ADMIN</h1>
      <p className="mt-2 font-ui text-xs text-muted">
        Ten designer charts. Data arrives after `/api/telemetry` writes to Neon.
      </p>
      <ul className="mt-6 space-y-2 font-ui text-xs">
        {charts.map((c) => (
          <li key={c} className="border border-line bg-panel px-3 py-2">
            {c} <span className="text-muted">— pending data</span>
          </li>
        ))}
      </ul>
      <a href="/" className="mt-8 inline-block font-display text-[10px] text-gold underline">
        Back to game
      </a>
    </main>
  );
}
