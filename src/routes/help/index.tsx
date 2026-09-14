import { createFileRoute, Link } from "@tanstack/react-router";
import { PixelBtn } from "@/components/chrome";

export const Route = createFileRoute("/help/")({
  component: HelpPage,
});

function HelpPage() {
  return (
    <main className="min-h-dvh bg-ink text-cream px-4 py-8 max-w-lg mx-auto">
      <header className="mb-8">
        <p className="font-display text-[10px] uppercase tracking-widest text-grass-2 mb-2">Reference</p>
        <h1 className="font-display text-sm leading-relaxed">Help &amp; Glossary</h1>
      </header>

      <section className="pixel-border bg-panel p-4 mb-4 space-y-3 text-sm leading-relaxed">
        <div>
          <h2 className="font-display text-[10px] mb-1 text-grass-2">Plate</h2>
          <p>Tap when the pitch crosses the zone. Timing and aim both matter.</p>
        </div>
        <div>
          <h2 className="font-display text-[10px] mb-1 text-grass-2">Credits</h2>
          <p>Single currency for training, trades, and stadium upgrades.</p>
        </div>
        <div>
          <h2 className="font-display text-[10px] mb-1 text-grass-2">Challenge</h2>
          <p>Same seed every week. Best score posts to the board.</p>
        </div>
      </section>

      <Link to="/">
        <PixelBtn>Back to game</PixelBtn>
      </Link>
    </main>
  );
}
