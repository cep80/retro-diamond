import { createFileRoute, Link } from "@tanstack/react-router";
import { PixelBtn } from "@/components/chrome";
import { currentIsoWeek, SCENARIOS, weekSeed } from "@/game/challenge";

export const Route = createFileRoute("/challenge/")({
  component: ChallengePage,
});

function ChallengePage() {
  const isoWeek = currentIsoWeek();
  const scenario = SCENARIOS[weekSeed(isoWeek) % SCENARIOS.length]!;

  return (
    <main className="min-h-dvh bg-ink text-cream px-4 py-8 max-w-lg mx-auto">
      <header className="mb-8">
        <p className="font-display text-[10px] uppercase tracking-widest text-grass-2 mb-2">Weekly</p>
        <h1 className="font-display text-sm leading-relaxed">Challenge</h1>
      </header>

      <section className="pixel-border bg-panel p-4 space-y-3 mb-6">
        <p className="text-sm text-muted">{isoWeek}</p>
        <h2 className="font-display text-[11px] leading-relaxed">{scenario}</h2>
        <p className="text-sm">Same seed, different coaches. Sign in to submit a score.</p>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link to="/leaderboard">
          <PixelBtn variant="ghost">Leaderboard</PixelBtn>
        </Link>
        <Link to="/">
          <PixelBtn>Back to game</PixelBtn>
        </Link>
      </div>
    </main>
  );
}
