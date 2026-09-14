import { createFileRoute, Link } from "@tanstack/react-router";
import { PixelBtn } from "@/components/chrome";

export const Route = createFileRoute("/leaderboard/")({
  component: LeaderboardPage,
});

function LeaderboardPage() {
  return (
    <main className="min-h-dvh bg-ink text-cream px-4 py-8 max-w-lg mx-auto">
      <header className="mb-8">
        <p className="font-display text-[10px] uppercase tracking-widest text-grass-2 mb-2">Rankings</p>
        <h1 className="font-display text-sm leading-relaxed">Leaderboard</h1>
      </header>

      <section className="pixel-border bg-panel p-4 mb-6">
        <p className="text-sm text-muted mb-2">Weekly · Verified</p>
        <p className="text-sm">Nobody&apos;s posted a score yet. Go first.</p>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link to="/challenge">
          <PixelBtn variant="ghost">This week&apos;s challenge</PixelBtn>
        </Link>
        <Link to="/">
          <PixelBtn>Back to game</PixelBtn>
        </Link>
      </div>
    </main>
  );
}
