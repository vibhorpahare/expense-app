import { api, toFormFile, UploadAsset } from "./client";
import type { Expense } from "./types";

export const expenses = {
  list: (params: {
    group_id?: string;
    friend_id?: string;
    category_id?: number;
    payer_id?: string;
    dated_after?: string;
    dated_before?: string;
    limit?: number;
    offset?: number;
  }) => api.get<{ expenses: Expense[] }>("/get_expenses", { params }).then((r) => r.data.expenses),
  get: (id: string) => api.get<{ expense: Expense }>(`/get_expense/${id}`).then((r) => r.data.expense),
  create: (data: unknown) => api.post<{ expenses: Expense[]; errors: Record<string, string[]> }>("/create_expense", data),
  update: (id: string, data: unknown) =>
    api.post<{ expenses: Expense[]; errors: Record<string, string[]> }>(`/update_expense/${id}`, data),
  remove: (id: string) => api.post(`/delete_expense/${id}`),
  undelete: (id: string) => api.post(`/undelete_expense/${id}`),
  settleUp: (data: {
    other_user_id: string;
    amount: string;
    currency_code: string;
    direction: "i_paid" | "they_paid";
    group_id?: string;
  }) => api.post<{ expenses: Expense[]; errors: Record<string, string[]> }>("/settle_up", data),
  extractReceipt: (asset: UploadAsset) =>
    api
      .post<{ available: boolean; amount?: number | null; date?: string | null; title?: string | null }>(
        "/expenses/extract_receipt",
        toFormFile(asset),
        { headers: { "Content-Type": "multipart/form-data" } },
      )
      .then((r) => r.data),
  uploadReceipt: (expenseId: string, asset: UploadAsset) =>
    api
      .post<{ expense: Expense }>(`/expenses/${expenseId}/receipt`, toFormFile(asset), {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data.expense),
};
