/**
 * Apple Sign In (M5.2) — enable when APPLE_CLIENT_ID / TEAM_ID / KEY_ID / PRIVATE_KEY
 * are set in Vercel env. Wire into better-auth socialProviders.apple in server.ts.
 * Required for a wrapped iOS build; optional for web 1.0.
 */
export function appleAuthConfigured(): boolean {
  return Boolean(
    process.env.APPLE_CLIENT_ID?.trim() &&
      process.env.APPLE_TEAM_ID?.trim() &&
      process.env.APPLE_KEY_ID?.trim() &&
      process.env.APPLE_PRIVATE_KEY?.trim(),
  );
}
