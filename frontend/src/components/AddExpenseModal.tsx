import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { friends as friendsApi, other as otherApi, expenses as expensesApi, type Friend, type Category } from "../lib/api";
import { CURRENCY_CODE, RUPEE } from "../lib/currency";
import { dateAtCurrentTime } from "../lib/datetime";

import { useAuth } from "../lib/auth";
import {
  splitEqually,
  splitExact,
  splitByPercent,
  splitByShareCount,
  splitByAdjustment,
  type SplitMode,
} from "../lib/splits";

const MODES: { key: SplitMode; label: string }[] = [
  { key: "equally", label: "Equally" },
  { key: "exact", label: "Exact amounts" },
  { key: "percent", label: "Percentages" },
  { key: "shares", label: "Shares" },
  { key: "adjustment", label: "Adjustment" },
];

function flattenCategories(categories: Category[]): { id: number; label: string }[] {
  const out: { id: number; label: string }[] = [];
  for (const parent of categories) {
    for (const sub of parent.subcategories) {
      out.push({ id: sub.id, label: `${parent.name} / ${sub.name}` });
    }
  }
  return out;
}

export function AddExpenseModal({
  groupId,
  initialParticipantIds = [],
  onClose,
}: {
  groupId?: string;
  initialParticipantIds?: string[];
  onClose: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: friendsList } = useQuery({ queryKey: ["friends"], queryFn: friendsApi.list });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: otherApi.categories });
  const flatCategories = useMemo(() => (categories ? flattenCategories(categories) : []), [categories]);

  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const [participantIds, setParticipantIds] = useState<string[]>(
    Array.from(new Set([user!.id, ...initialParticipantIds])),
  );
  const [addQuery, setAddQuery] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [payerId, setPayerId] = useState(user!.id);
  const [mode, setMode] = useState<SplitMode>("equally");
  const [perPerson, setPerPerson] = useState<Record<string, string>>({});
  const [categoryQuery, setCategoryQuery] = useState("");
  const [error, setError] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);

  const handleReceiptSelected = async (file: File | null) => {
    setReceiptFile(file);
    if (!file) return;
    setExtracting(true);
    try {
      const result = await expensesApi.extractReceipt(file);
      if (result.available) {
        if (result.title && !description) setDescription(result.title);
        if (result.amount != null) setCost(String(result.amount));
        if (result.date) setDate(result.date.slice(0, 10));
      }
    } catch {
      // OCR is a convenience prefill -- silently ignore failures, user can still fill the form manually.
    } finally {
      setExtracting(false);
    }
  };

  const friendById = useMemo(() => {
    const map = new Map<string, Friend>();
    friendsList?.forEach((f) => map.set(f.id, f));
    return map;
  }, [friendsList]);

  const nameOf = (id: string) => (id === user!.id ? "You" : friendById.get(id)?.first_name ?? "?");

  useEffect(() => {
    if (!payerId || !participantIds.includes(payerId)) setPayerId(participantIds[0]);
  }, [participantIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const matchingFriends = (friendsList ?? []).filter(
    (f) =>
      !participantIds.includes(f.id) &&
      (f.first_name.toLowerCase().includes(addQuery.toLowerCase()) || f.email.toLowerCase().includes(addQuery.toLowerCase())),
  );

  const create = useMutation({
    mutationFn: () => {
      let shares;
      try {
        switch (mode) {
          case "exact":
            shares = splitExact(cost, payerId, perPerson);
            break;
          case "percent":
            shares = splitByPercent(cost, payerId, perPerson);
            break;
          case "shares":
            shares = splitByShareCount(cost, payerId, perPerson);
            break;
          case "adjustment":
            shares = splitByAdjustment(cost, payerId, perPerson);
            break;
          default:
            shares = splitEqually(cost, payerId, participantIds);
        }
      } catch {
        throw new Error("Invalid split values");
      }
      return expensesApi.create({
        description,
        cost,
        currency_code: CURRENCY_CODE,
        category_id: categoryId || null,
        date: dateAtCurrentTime(date),
        group_id: groupId,
        shares,
      });
    },
    onSuccess: async (res) => {
      if (res.data.errors && Object.keys(res.data.errors).length > 0) {
        setError(Object.values(res.data.errors).flat().join(", "));
        return;
      }
      const created = res.data.expenses[0];
      if (receiptFile && created) {
        try {
          await expensesApi.uploadReceipt(created.id, receiptFile);
        } catch {
          // Expense is already saved; a failed receipt attach shouldn't block the flow.
        }
      }
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["group"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["friend"] });
      queryClient.invalidateQueries({ queryKey: ["friend-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      handleClose();
    },
    onError: (e: Error) => setError(e.message || "Could not save expense"),
  });

  // Validation summary per mode, computed for display + submit guard.
  const validation = useMemo(() => {
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
  }, [mode, perPerson, cost, participantIds]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center transition-colors duration-200 ${visible ? "bg-black/40" : "bg-black/0"}`}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-surface rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[92vh] sm:max-h-[90vh] overflow-y-auto transition-transform duration-200 ease-out ${visible ? "translate-y-0" : "translate-y-full sm:translate-y-8 sm:opacity-0"}`}
      >
        <div className="flex justify-center sm:hidden pt-2 pb-1">
          <div className="w-10 h-1.5 rounded-full bg-outline-variant" />
        </div>
        <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Add an expense</h2>
          <button onClick={handleClose} className="text-on-surface-variant hover:text-on-surface text-xl leading-none">
            &times;
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {error && <p className="text-sm text-negative">{error}</p>}

          <div>
            <label className="block text-sm font-medium mb-1">With</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {participantIds.map((uid) => (
                <span
                  key={uid}
                  className="px-2 py-1 rounded-full bg-primary-container text-on-primary-container text-sm flex items-center gap-1"
                >
                  {nameOf(uid)}
                  {uid !== user!.id && (
                    <button
                      onClick={() => setParticipantIds((ids) => ids.filter((id) => id !== uid))}
                      className="hover:opacity-70"
                    >
                      &times;
                    </button>
                  )}
                </span>
              ))}
            </div>
            <input
              placeholder="Add a friend by name or email..."
              className="w-full px-3 py-1.5 rounded-lg border border-outline-variant bg-surface-container text-sm"
              value={addQuery}
              onChange={(e) => setAddQuery(e.target.value)}
            />
            {addQuery && matchingFriends.length > 0 && (
              <div className="mt-1 border border-outline-variant rounded-lg overflow-hidden">
                {matchingFriends.map((f) => (
                  <button
                    key={f.id}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-surface-container"
                    onClick={() => {
                      setParticipantIds((ids) => [...ids, f.id]);
                      setAddQuery("");
                    }}
                  >
                    {f.first_name} {f.last_name} ({f.email})
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Expense type</label>
              <input
                className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cost</label>
              <div className="flex items-center gap-2">
                <span className="px-3 py-2 rounded-lg border border-outline-variant bg-surface-container text-sm text-on-surface-variant">
                  {RUPEE}
                </span>
                <input
                  className="w-full min-w-0 px-3 py-2 rounded-lg border border-outline-variant bg-surface-container"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">
                Receipt {extracting && <span className="text-xs text-on-surface-variant">(reading...)</span>}
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="w-full text-sm"
                onChange={(e) => handleReceiptSelected(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Category</label>
              {categoryId ? (
                <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-outline-variant bg-surface-container text-sm">
                  <span>{flatCategories.find((c) => c.id === categoryId)?.label}</span>
                  <button type="button" onClick={() => setCategoryId("")} className="text-on-surface-variant hover:opacity-70">
                    &times;
                  </button>
                </div>
              ) : (
                <>
                  <input
                    placeholder="Search category..."
                    className="w-full px-3 py-1.5 rounded-lg border border-outline-variant bg-surface-container text-sm"
                    value={categoryQuery}
                    onChange={(e) => setCategoryQuery(e.target.value)}
                  />
                  {categoryQuery && (
                    <div className="mt-1 border border-outline-variant rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                      {flatCategories
                        .filter((c) => c.label.toLowerCase().includes(categoryQuery.toLowerCase()))
                        .map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-surface-container"
                            onClick={() => {
                              setCategoryId(c.id);
                              setCategoryQuery("");
                            }}
                          >
                            {c.label}
                          </button>
                        ))}
                      {flatCategories.filter((c) => c.label.toLowerCase().includes(categoryQuery.toLowerCase())).length === 0 && (
                        <p className="px-3 py-1.5 text-sm text-on-surface-variant">No matches.</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Paid by</label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container"
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
              >
                {participantIds.map((uid) => (
                  <option key={uid} value={uid}>
                    {nameOf(uid)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Split</label>
            <div className="flex gap-1 mb-3 flex-wrap">
              {MODES.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                    mode === m.key
                      ? "bg-primary text-on-primary border-primary"
                      : "border-outline-variant text-on-surface-variant"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {mode !== "equally" && (
              <div className="grid gap-2">
                {participantIds.map((uid) => (
                  <div key={uid} className="flex items-center justify-between gap-2 text-sm">
                    <span>{nameOf(uid)}</span>
                    <div className="flex items-center gap-1">
                      <input
                        className="w-24 px-2 py-1 rounded-lg border border-outline-variant bg-surface-container text-sm text-right"
                        value={perPerson[uid] ?? ""}
                        onChange={(e) => setPerPerson((p) => ({ ...p, [uid]: e.target.value }))}
                        placeholder={mode === "shares" ? "1" : "0.00"}
                      />
                      <span className="text-xs text-on-surface-variant w-5">
                        {mode === "percent" ? "%" : mode === "shares" ? "sh" : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {validation.message && (
              <p className={`text-xs mt-2 ${validation.ok ? "text-positive" : "text-negative"}`}>{validation.message}</p>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-outline-variant flex justify-end gap-2">
          <button onClick={handleClose} className="px-4 py-2 rounded-full text-sm border border-outline-variant">
            Cancel
          </button>
          <button
            disabled={!description || !validation.ok || create.isPending}
            onClick={() => create.mutate()}
            className="px-4 py-2 rounded-full bg-primary text-on-primary text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
