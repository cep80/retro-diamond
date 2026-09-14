import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const eventSchema = z.object({
  t: z.number(),
  name: z.string().regex(/^[a-z][a-z0-9_.]*$/).max(64),
  props: z.record(z.string(), z.unknown()).optional(),
  session_id: z.string().optional(),
  device_id: z.string().optional(),
  user_id: z.string().optional(),
  version: z.string().optional(),
});

const bodySchema = z.object({
  events: z.array(eventSchema).min(1).max(50),
});

// Rate limit stub — wired to Upstash in M4.10.
const rateLimitStub = (_request: Request): boolean => true;

export const Route = createFileRoute("/api/telemetry")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!rateLimitStub(request)) {
          return new Response(JSON.stringify({ error: { code: "RATE_LIMITED", message: "Too many requests" } }), {
            status: 429,
            headers: { "content-type": "application/json" },
          });
        }

        let json: unknown;
        try {
          json = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: { code: "VALIDATION", message: "Invalid JSON body" } }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }

        const parsed = bodySchema.safeParse(json);
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: { code: "VALIDATION", message: "Invalid telemetry payload" } }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }

        // Persist to Neon in M4.9 — accept and ack for now.
        return new Response(null, { status: 200 });
      },
    },
  },
});
