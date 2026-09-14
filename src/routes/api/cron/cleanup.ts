import { createFileRoute } from "@tanstack/react-router";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export const Route = createFileRoute("/api/cron/cleanup")({
  server: {
    handlers: {
      GET: ({ request }) => {
        if (!authorizeCron(request)) {
          return new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Invalid cron secret" } }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }
        return Response.json({ ok: true });
      },
    },
  },
});
