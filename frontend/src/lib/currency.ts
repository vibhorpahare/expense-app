// App is India/INR-only -- no currency lookup, always the rupee sign.
export const RUPEE = "₹";
export const CURRENCY_CODE = "INR";

/** Kept for call-site compatibility; always returns the fixed INR unit map. */
export function useCurrencyUnits(): Record<string, string> {
  return { INR: RUPEE };
}

/** Renders an amount with the rupee sign. `currencyCode`/`units` args are accepted
 * for call-site compatibility but ignored -- the app only ever deals in INR. */
export function formatMoney(amount: string | number, _currencyCode?: string, _units?: Record<string, string>): string {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value).toFixed(2);
  return `${sign}${RUPEE}${abs}`;
}

/** Sums amounts per currency instead of blindly summing across currencies (which would silently mix them). */
export function sumByCurrency<T>(
  items: T[],
  getAmount: (item: T) => number,
  getCurrency: (item: T) => string,
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const item of items) {
    const code = getCurrency(item);
    totals.set(code, (totals.get(code) ?? 0) + getAmount(item));
  }
  return totals;
}
