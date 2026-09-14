/**
 * Monte Carlo economy harness — smoke-checks luxury tax and broadcast bonus
 * across a handful of seeds. Full 5×2 season loops are optional; this run
 * stays fast for CI.
 *
 * Run: node --experimental-strip-types scripts/economy-montecarlo.ts
 */
import assert from "node:assert/strict";
import { broadcastBonus, luxuryTax } from "../src/game/economy.ts";

const SEEDS = [1, 7, 13, 42, 99];

function smokeEconomy(seed: number) {
  const payroll = 120 + (seed % 80);
  const wins = seed % 14;
  const mt = 2 + (seed % 2);
  const taxPro = luxuryTax(payroll, "pro");
  const taxLegend = luxuryTax(payroll, "legend");
  const bonus = broadcastBonus(wins, mt);
  assert.ok(taxPro >= 0);
  assert.ok(taxLegend >= taxPro || payroll <= 160, "legend threshold is lower");
  assert.ok(bonus >= mt * 2 && bonus <= mt * 6);
  return { seed, payroll, taxPro, bonus };
}

console.log("economy-montecarlo: smoke pass");
for (const seed of SEEDS) {
  const row = smokeEconomy(seed);
  console.log(`  seed ${row.seed}: payroll=${row.payroll} tax=${row.taxPro} broadcast=${row.bonus}`);
}

console.log("done — extend with simFullGame season loops when profiling economy balance");
