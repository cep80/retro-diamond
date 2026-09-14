import { createFileRoute } from "@tanstack/react-router";

/**
 * OG image stub for replay cards (M4.7 / M5.5).
 * Production path: Satori/@vercel/og → Vercel Blob. Until then, redirect-style JSON meta.
 */
export const Route = createFileRoute("/api/og/r/$id")({
  server: {
    handlers: {
      GET: ({ params }) => {
        const id = params.id ?? "unknown";
        return new Response(
          JSON.stringify({
            ok: true,
            id,
            note: "OG PNG via Satori ships when Blob credentials are set",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});
