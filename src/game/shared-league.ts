/**
 * Shared-league stub (M5.8): deterministic seed from friend codes for future
 * async head-to-head seasons. Not wired to sim yet.
 * Door for async leagues: see `src/lib/server/async-leagues.ts`.
 */
export function sharedLeagueSeed(friendCodes: string[]): number {
  const sorted = [...friendCodes].map((c) => c.trim().toUpperCase()).sort();
  let h = 2166136261 >>> 0;
  for (const code of sorted) {
    for (let i = 0; i < code.length; i++) {
      h ^= code.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h ^= 0xff;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Opt-in flag for friends who share one generated league seed (post-launch beta). */
export function sharedLeagueOptInKey(userId: string): string {
  return `rd-shared-league-optin:${userId}`;
}
