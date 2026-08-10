import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { friends as friendsApi, expenses as expensesApi, type Balance, type Friend } from "../lib/api";
import { AddExpenseModal } from "../components/AddExpenseModal";
import { CURRENCY_CODE, formatMoney, useCurrencyUnits } from "../lib/currency";

function SettleUpForm({ friend, onDone }: { friend: Friend; onDone: () => void }) {
  const queryClient = useQueryClient();
  const units = useCurrencyUnits();
  const primaryBalance = friend.balance[0];
  const owedByThem = primaryBalance ? parseFloat(primaryBalance.amount) > 0 : false;
  const [amount, setAmount] = useState(primaryBalance ? Math.abs(parseFloat(primaryBalance.amount)).toFixed(2) : "");
  const [iAmPaying, setIAmPaying] = useState(!owedByThem);

  const settle = useMutation({
    mutationFn: () =>
      expensesApi.settleUp({
        other_user_id: friend.id,
        amount,
        currency_code: CURRENCY_CODE,
        direction: iAmPaying ? "i_paid" : "they_paid",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onDone();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        settle.mutate();
      }}
      className="mt-3 pt-3 border-t border-outline-variant flex items-center gap-2 flex-wrap"
    >
      <select
        className="px-2 py-1.5 rounded-lg border border-outline-variant bg-surface text-sm"
        value={iAmPaying ? "me" : "them"}
        onChange={(e) => setIAmPaying(e.target.value === "me")}
      >
        <option value="me">I paid {friend.first_name}</option>
        <option value="them">{friend.first_name} paid me</option>
      </select>
      <input
        className="w-24 px-2 py-1.5 rounded-lg border border-outline-variant bg-surface text-sm"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />
      <span className="text-sm text-on-surface-variant">{units[CURRENCY_CODE]}</span>
      <button className="px-3 py-1.5 rounded-full bg-primary text-on-primary text-sm font-semibold hover:opacity-90">
        Record payment
      </button>
    </form>
  );
}

function FriendRow({ friend }: { friend: Friend }) {
  const [expanded, setExpanded] = useState(false);
  const [showSettle, setShowSettle] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const units = useCurrencyUnits();

  const { data: detail } = useQuery({
    queryKey: ["friend", friend.id],
    queryFn: () => friendsApi.get(friend.id),
    enabled: expanded,
  });

  const { data: friendExpenses } = useQuery({
    queryKey: ["friend-expenses", friend.id],
    queryFn: () => expensesApi.list({ friend_id: friend.id }),
    enabled: expanded,
  });

  return (
    <div className="p-4 rounded-xl border border-outline-variant bg-surface">
      <div className="flex items-center justify-between">
        <button className="text-left flex items-center gap-3" onClick={() => setExpanded((v) => !v)}>
          <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-semibold shrink-0">
            {friend.first_name[0]}
          </div>
          <div>
            <p className="font-semibold">
              {friend.first_name} {friend.last_name}
            </p>
            <p className="text-sm text-on-surface-variant">{friend.email}</p>
          </div>
        </button>
        <div className="text-right text-sm">
          {friend.balance.length === 0 && <span className="text-on-surface-variant">settled up</span>}
          {friend.balance.map((b: Balance) => (
            <p key={b.currency_code} className={parseFloat(b.amount) >= 0 ? "text-positive" : "text-negative"}>
              {parseFloat(b.amount) >= 0 ? "owes you " : "you owe "}
              {formatMoney(Math.abs(parseFloat(b.amount)), b.currency_code, units)}
            </p>
          ))}
          <div className="flex gap-2 mt-1 justify-end">
            <button onClick={() => setShowAdd((v) => !v)} className="text-xs text-primary font-medium">
              Add expense
            </button>
            <button onClick={() => setShowSettle((v) => !v)} className="text-xs text-primary font-medium">
              Settle up
            </button>
          </div>
        </div>
      </div>

      {expanded && detail?.by_group && detail.by_group.length > 0 && (
        <div className="mt-3 pt-3 border-t border-outline-variant grid gap-1">
          {detail.by_group.map((g, i) => (
            <p key={i} className="text-xs text-on-surface-variant">
              {parseFloat(g.amount) >= 0 ? "owes you " : "you owe "}
              {formatMoney(Math.abs(parseFloat(g.amount)), g.currency_code, units)} for "{g.group_name}"
            </p>
          ))}
        </div>
      )}

      {expanded && friendExpenses && friendExpenses.length > 0 && (
        <div className="mt-3 pt-3 border-t border-outline-variant grid gap-2">
          {friendExpenses.map((e) => (
            <Link key={e.id} to={`/expenses/${e.id}`} className="flex justify-between text-sm hover:text-primary">
              <span>{e.description}</span>
              <span className="text-on-surface-variant">{formatMoney(e.cost, e.currency_code, units)}</span>
            </Link>
          ))}
        </div>
      )}

      {showAdd && <AddExpenseModal initialParticipantIds={[friend.id]} onClose={() => setShowAdd(false)} />}
      {showSettle && <SettleUpForm friend={friend} onDone={() => setShowSettle(false)} />}
    </div>
  );
}

export function FriendsPage() {
  const queryClient = useQueryClient();
  const { data: friends, isLoading } = useQuery({ queryKey: ["friends"], queryFn: friendsApi.list });
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const addFriend = useMutation({
    mutationFn: () => friendsApi.create(email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      setEmail("");
      setError("");
    },
    onError: () => setError("No user found with that email."),
  });

  if (isLoading) return <p className="text-on-surface-variant">Loading...</p>;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">Friends</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          addFriend.mutate();
        }}
        className="mb-6 flex gap-3"
      >
        <input
          type="email"
          placeholder="Friend's email"
          className="flex-1 px-3 py-2 rounded-lg border border-outline-variant bg-surface"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button className="px-4 py-2 rounded-full bg-primary text-on-primary text-sm font-semibold hover:opacity-90">
          Add friend
        </button>
      </form>
      {error && <p className="text-sm text-negative mb-4">{error}</p>}

      <div className="grid gap-3">
        {friends?.map((f) => (
          <FriendRow key={f.id} friend={f} />
        ))}
        {friends?.length === 0 && <p className="text-on-surface-variant">No friends yet. Add one by email.</p>}
      </div>
    </div>
  );
}
