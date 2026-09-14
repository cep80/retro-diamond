export function challengeScore(opts: {
  won: boolean;
  tied: boolean;
  runDiff: number;
  hits: number;
  totalBases: number;
  strikeouts: number;
}): number {
  const outcome = opts.won ? 300 : opts.tied ? 100 : 0;
  const raw =
    outcome +
    opts.runDiff * 50 +
    opts.hits * 10 +
    opts.totalBases * 5 -
    opts.strikeouts * 2;
  return raw < 0 ? 0 : raw;
}
