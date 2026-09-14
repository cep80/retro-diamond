import { createFileRoute, Link } from "@tanstack/react-router";
import { PixelBtn } from "@/components/chrome";

export const Route = createFileRoute("/r/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Replay ${params.id} · Diamond Shine` },
      { name: "description", content: "Shared replay scorecard from Diamond Shine." },
      { property: "og:title", content: `Replay ${params.id}` },
      { property: "og:description", content: "Shared replay scorecard from Diamond Shine." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ReplayPage,
});

function ReplayPage() {
  const { id } = Route.useParams();

  return (
    <main className="min-h-dvh bg-ink text-cream px-4 py-8 max-w-lg mx-auto">
      <header className="mb-8">
        <p className="font-display text-[10px] uppercase tracking-widest text-grass-2 mb-2">Replay</p>
        <h1 className="font-display text-sm leading-relaxed">Scorecard</h1>
      </header>

      <section className="pixel-border bg-panel p-4 mb-6 space-y-2">
        <p className="text-xs text-muted font-mono break-all">{id}</p>
        <p className="text-sm">Worth remembering? Full playback arrives in a later update.</p>
      </section>

      <Link to="/">
        <PixelBtn>Back to game</PixelBtn>
      </Link>
    </main>
  );
}
