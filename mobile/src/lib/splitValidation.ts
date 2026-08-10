import type { SplitMode } from "./splits";

export interface SplitValidation {
  ok: boolean;
  message: string;
}

// Ported verbatim from AddExpenseModal's validation useMemo -- per-mode
// live validation shown while filling the form, and the submit-button gate.
export function validateSplit(
  mode: SplitMode,
  perPerson: Record<string, string>,
  cost: string,
  participantIds: string[],
): SplitValidation {
  const costNum = parseFloat(cost || "0");
  if (!costNum || participantIds.length === 0) return { ok: false, message: "" };
  if (mode === "equally") return { ok: true, message: `${(costNum / participantIds.length).toFixed(2)} / person` };

  const sum = participantIds.reduce((acc, uid) => acc + (parseFloat(perPerson[uid] || "0") || 0), 0);
  if (mode === "exact") {
    const left = costNum - sum;
    return { ok: Math.abs(left) < 0.005, message: `${left.toFixed(2)} left` };
  }
  if (mode === "percent") {
    const left = 100 - sum;
    return { ok: Math.abs(left) < 0.01, message: `${left.toFixed(2)}% left` };
  }
  if (mode === "shares") {
    return { ok: sum > 0, message: `${sum} total share(s)` };
  }
  if (mode === "adjustment") {
    return { ok: Math.abs(sum) < 0.005, message: `${sum.toFixed(2)} net adjustment (must be 0)` };
  }
  return { ok: false, message: "" };
}
