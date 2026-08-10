export type SplitMode = "equally" | "exact" | "percent" | "shares" | "adjustment";

export interface ShareInput {
  user_id: string;
  paid_share: string;
  owed_share: string;
}

function toCents(amount: string | number): number {
  return Math.round(parseFloat(String(amount)) * 100);
}

function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Distributes `totalCents` across `n` people as evenly as possible, giving the
 * leftover cent(s) to the first entries -- same convention the backend's
 * equal-split (build_shares) uses for group expenses, kept consistent here. */
function distributeCents(totalCents: number, n: number): number[] {
  const base = Math.floor(totalCents / n);
  const remainder = totalCents - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}

function buildShares(
  cost: string,
  payerId: string,
  participantIds: string[],
  owedCentsByUser: Record<string, number>,
): ShareInput[] {
  return participantIds.map((uid) => ({
    user_id: uid,
    paid_share: uid === payerId ? cost : "0.00",
    owed_share: fromCents(owedCentsByUser[uid]),
  }));
}

export function splitEqually(cost: string, payerId: string, participantIds: string[]): ShareInput[] {
  const cents = distributeCents(toCents(cost), participantIds.length);
  const owed: Record<string, number> = {};
  participantIds.forEach((uid, i) => (owed[uid] = cents[i]));
  return buildShares(cost, payerId, participantIds, owed);
}

export function splitExact(cost: string, payerId: string, exactAmounts: Record<string, string>): ShareInput[] {
  const participantIds = Object.keys(exactAmounts);
  const owed: Record<string, number> = {};
  participantIds.forEach((uid) => (owed[uid] = toCents(exactAmounts[uid] || "0")));
  return buildShares(cost, payerId, participantIds, owed);
}

/** Percentages must sum to 100 (validated by the caller before submit). Rounding
 * remainder from cents division is given to the first participant. */
export function splitByPercent(cost: string, payerId: string, percentages: Record<string, string>): ShareInput[] {
  const participantIds = Object.keys(percentages);
  const totalCents = toCents(cost);
  const raw = participantIds.map((uid) => (totalCents * parseFloat(percentages[uid] || "0")) / 100);
  const floored = raw.map(Math.floor);
  let remainder = totalCents - floored.reduce((a, b) => a + b, 0);
  const owed: Record<string, number> = {};
  participantIds.forEach((uid, i) => {
    owed[uid] = floored[i] + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
  });
  return buildShares(cost, payerId, participantIds, owed);
}

/** Same rounding-remainder convention as splitByPercent, weighted by share count
 * instead of percentage (e.g. 2 shares vs 1 share). */
export function splitByShareCount(cost: string, payerId: string, shareCounts: Record<string, string>): ShareInput[] {
  const participantIds = Object.keys(shareCounts);
  const totalCents = toCents(cost);
  const totalShares = participantIds.reduce((sum, uid) => sum + (parseFloat(shareCounts[uid]) || 0), 0);
  const raw = participantIds.map((uid) => (totalCents * (parseFloat(shareCounts[uid]) || 0)) / totalShares);
  const floored = raw.map(Math.floor);
  let remainder = totalCents - floored.reduce((a, b) => a + b, 0);
  const owed: Record<string, number> = {};
  participantIds.forEach((uid, i) => {
    owed[uid] = floored[i] + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
  });
  return buildShares(cost, payerId, participantIds, owed);
}

/** Starts from an equal split, then applies each person's +/- adjustment.
 * Adjustments must net to zero (validated by the caller) so the total still
 * equals `cost`. */
export function splitByAdjustment(cost: string, payerId: string, adjustments: Record<string, string>): ShareInput[] {
  const participantIds = Object.keys(adjustments);
  const totalCents = toCents(cost);
  const adjCents = participantIds.map((uid) => toCents(adjustments[uid] || "0"));
  const netAdjustment = adjCents.reduce((a, b) => a + b, 0);
  const baseCents = distributeCents(totalCents - netAdjustment, participantIds.length);
  const owed: Record<string, number> = {};
  participantIds.forEach((uid, i) => (owed[uid] = baseCents[i] + adjCents[i]));
  return buildShares(cost, payerId, participantIds, owed);
}
