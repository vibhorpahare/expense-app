import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { comments as commentsApi, expenses as expensesApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useCurrencyUnits, formatMoney } from "../lib/currency";
import { formatDateTime } from "../lib/datetime";

export function ExpenseDetailPage() {
  const { expenseId } = useParams<{ expenseId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const units = useCurrencyUnits();

  const { data: expense, isLoading } = useQuery({
    queryKey: ["expense", expenseId],
    queryFn: () => expensesApi.get(expenseId!),
    enabled: !!expenseId,
  });

  const { data: commentList } = useQuery({
    queryKey: ["comments", expenseId],
    queryFn: () => commentsApi.list(expenseId!),
    enabled: !!expenseId,
  });

  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [commentText, setCommentText] = useState("");
  const [error, setError] = useState("");

  const startEdit = () => {
    if (!expense) return;
    setDescription(expense.description);
    setCost(expense.cost);
    setEditing(true);
  };

  const invalidateExpense = () => {
    queryClient.invalidateQueries({ queryKey: ["expense", expenseId] });
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
    queryClient.invalidateQueries({ queryKey: ["group"] });
    queryClient.invalidateQueries({ queryKey: ["groups"] });
    queryClient.invalidateQueries({ queryKey: ["friend"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const save = useMutation({
    mutationFn: () => {
      if (!expense) throw new Error("not loaded");
      // Re-scale each share proportionally so paid/owed still sum to the new cost --
      // this is a simple metadata edit (description/cost), not a re-split.
      const ratio = parseFloat(cost) / parseFloat(expense.cost || "1");
      const shares = expense.shares.map((s) => ({
        user_id: s.user.id,
        paid_share: (parseFloat(s.paid_share) * ratio).toFixed(2),
        owed_share: (parseFloat(s.owed_share) * ratio).toFixed(2),
      }));
      return expensesApi.update(expense.id, { description, cost, shares });
    },
    onSuccess: (res) => {
      if (res.data.errors && Object.keys(res.data.errors).length > 0) {
        setError(Object.values(res.data.errors).flat().join(", "));
        return;
      }
      setEditing(false);
      invalidateExpense();
    },
    onError: () => setError("Could not save changes"),
  });

  const remove = useMutation({
    mutationFn: () => expensesApi.remove(expense!.id),
    onSuccess: () => {
      invalidateExpense();
      navigate(-1);
    },
  });

  const uploadReceipt = useMutation({
    mutationFn: (file: File) => expensesApi.uploadReceipt(expense!.id, file),
    onSuccess: invalidateExpense,
  });

  const addComment = useMutation({
    mutationFn: () => commentsApi.create(expense!.id, commentText),
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["comments", expenseId] });
    },
  });

  const removeComment = useMutation({
    mutationFn: (id: string) => commentsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comments", expenseId] }),
  });

  if (isLoading || !expense) return <p className="text-on-surface-variant">Loading...</p>;

  return (
    <div className="max-w-2xl">
      <button onClick={() => navigate(-1)} className="text-sm text-on-surface-variant hover:text-on-surface mb-4">
        &larr; Back
      </button>

      <div className="p-5 rounded-xl border border-outline-variant bg-surface mb-4">
        {error && <p className="text-sm text-negative mb-2">{error}</p>}

        {editing ? (
          <div className="flex flex-col gap-3">
            <input
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <input
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => save.mutate()}
                disabled={save.isPending}
                className="px-4 py-2 rounded-full bg-primary text-on-primary text-sm font-semibold hover:opacity-90"
              >
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 rounded-full border border-outline-variant text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-display text-xl font-bold">{expense.description}</h1>
              <p className="text-2xl font-display font-bold mt-1">{formatMoney(expense.cost, expense.currency_code, units)}</p>
              <p className="text-sm text-on-surface-variant mt-1">{formatDateTime(expense.date)}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={startEdit} className="px-3 py-1.5 rounded-full border border-outline-variant text-xs font-medium hover:bg-surface-container">
                Edit
              </button>
              <button
                onClick={() => confirm("Delete this expense?") && remove.mutate()}
                className="px-3 py-1.5 rounded-full border border-negative text-negative text-xs font-medium hover:bg-negative-bg"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {expense.shares.map((s) => (
            <span
              key={s.user.id}
              className={`text-xs px-2 py-1 rounded-full ${parseFloat(s.net_balance) >= 0 ? "bg-positive-bg text-positive" : "bg-negative-bg text-negative"}`}
            >
              {s.user.first_name}: {parseFloat(s.net_balance) >= 0 ? "+" : ""}
              {parseFloat(s.net_balance).toFixed(2)}
            </span>
          ))}
        </div>

        <div className="mt-4">
          {expense.receipt_url ? (
            <a href={expense.receipt_url} target="_blank" rel="noreferrer">
              <img src={expense.receipt_url} alt="Receipt" className="max-h-64 rounded-lg border border-outline-variant" />
            </a>
          ) : (
            <label className="inline-block text-sm px-3 py-1.5 rounded-full border border-outline-variant cursor-pointer hover:bg-surface-container">
              Attach receipt
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadReceipt.mutate(e.target.files[0])}
              />
            </label>
          )}
        </div>
      </div>

      <div className="p-5 rounded-xl border border-outline-variant bg-surface">
        <h2 className="font-display text-lg font-semibold mb-3">Comments</h2>
        <div className="grid gap-2 mb-4">
          {commentList?.map((c) => (
            <div key={c.id} className="flex items-start justify-between gap-2 text-sm p-2 rounded-lg bg-surface-container">
              <div>
                <span className="font-medium">{c.user?.first_name ?? "System"}</span>{" "}
                <span className="text-on-surface-variant text-xs">{new Date(c.created_at).toLocaleString()}</span>
                <p>{c.content}</p>
              </div>
              {c.user?.id === user?.id && (
                <button
                  onClick={() => removeComment.mutate(c.id)}
                  className="text-xs text-on-surface-variant hover:text-negative shrink-0"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
          {commentList?.length === 0 && <p className="text-on-surface-variant text-sm">No comments yet.</p>}
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 px-3 py-2 rounded-lg border border-outline-variant bg-surface-container text-sm"
            placeholder="Add a comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && commentText.trim() && addComment.mutate()}
          />
          <button
            disabled={!commentText.trim() || addComment.isPending}
            onClick={() => addComment.mutate()}
            className="px-4 py-2 rounded-full bg-primary text-on-primary text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            Post
          </button>
        </div>
      </div>

      {expense.group_id && (
        <Link to={`/groups/${expense.group_id}`} className="inline-block mt-4 text-sm text-primary hover:underline">
          View group
        </Link>
      )}
    </div>
  );
}
