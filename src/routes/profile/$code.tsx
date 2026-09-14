import { createFileRoute, Link } from "@tanstack/react-router";
import { PixelBtn } from "@/components/chrome";

export const Route = createFileRoute("/profile/$code")({
  component: ProfilePage,
});

function ProfilePage() {
  const { code } = Route.useParams();

  return (
    <main className="min-h-dvh bg-ink text-cream px-4 py-8 max-w-lg mx-auto">
      <header className="mb-8">
        <p className="font-display text-[10px] uppercase tracking-widest text-grass-2 mb-2">Profile</p>
        <h1 className="font-display text-sm leading-relaxed">Player</h1>
      </header>

      <section className="pixel-border bg-panel p-4 mb-6 space-y-2">
        <p className="font-display text-[11px] tracking-wider">{code}</p>
        <p className="text-sm text-muted">Visible to friends only.</p>
      </section>

      <Link to="/">
        <PixelBtn>Back to game</PixelBtn>
      </Link>
    </main>
  );
}
