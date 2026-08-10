import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type { Friend } from "../lib/api";
import { friends as friendsApi, groups as groupsApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatMoney, useCurrencyUnits } from "../lib/currency";

function netForUser(group: { members: { id: string; balance: { currency_code: string; amount: string }[] }[] }, userId: string) {
  const member = group.members.find((m) => m.id === userId);
  return member?.balance ?? [];
}

export function GroupsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: groups, isLoading } = useQuery({ queryKey: ["groups"], queryFn: () => groupsApi.list() });
  const { data: friendsList } = useQuery({ queryKey: ["friends"], queryFn: friendsApi.list });
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Friend[]>([]);
  const [error, setError] = useState("");
  const units = useCurrencyUnits();

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return (friendsList ?? []).filter(
      (f) =>
        !selected.some((s) => s.id === f.id) &&
        (`${f.first_name} ${f.last_name ?? ""}`.toLowerCase().includes(q) || f.email.toLowerCase().includes(q))
    );
  }, [query, friendsList, selected]);

  const createGroup = useMutation({
    mutationFn: () =>
      groupsApi.create({
        name,
        group_type: "other",
        member_emails: selected.map((f) => f.email),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setShowCreate(false);
      setName("");
      setQuery("");
      setSelected([]);
      setError("");
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { errors?: { base?: string[] } } } })?.response?.data?.errors
        ?.base;
      setError(detail?.join(" ") ?? "Could not create group.");
    },
  });

  if (isLoading) return <p className="text-on-surface-variant">Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Groups</h1>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="px-4 py-2 rounded-full bg-primary text-on-primary text-sm font-semibold hover:opacity-90"
        >
          + New group
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createGroup.mutate();
          }}
          className="mb-6 p-5 rounded-xl border border-outline-variant bg-surface flex flex-col gap-3"
        >
          <input
            placeholder="Group name"
            className="px-3 py-2 rounded-lg border border-outline-variant bg-surface-container"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <div className="relative">
            {selected.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selected.map((f) => (
                  <span
                    key={f.id}
                    className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary-container text-on-primary-container text-sm"
                  >
                    {f.first_name} {f.last_name}
                    <button
                      type="button"
                      onClick={() => setSelected((s) => s.filter((x) => x.id !== f.id))}
                      className="hover:opacity-70"
                      aria-label={`Remove ${f.first_name}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              placeholder="Add from your friends"
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {suggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full rounded-lg border border-outline-variant bg-surface shadow-lg max-h-48 overflow-auto">
                {suggestions.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected((s) => [...s, f]);
                        setQuery("");
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-surface-container"
                    >
                      <span className="font-medium">
                        {f.first_name} {f.last_name}
                      </span>
                      <span className="text-on-surface-variant"> {f.email}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {query.trim() && suggestions.length === 0 && (
              <p className="text-sm text-on-surface-variant mt-1">No friends match "{query}".</p>
            )}
          </div>
          {error && <p className="text-sm text-negative">{error}</p>}
          <button className="self-start px-4 py-2 rounded-full bg-primary text-on-primary text-sm font-semibold hover:opacity-90">
            Create
          </button>
        </form>
      )}

      <div className="grid gap-3">
        {groups?.map((g) => {
          const mine = user ? netForUser(g, user.id) : [];
          return (
            <Link
              key={g.id}
              to={`/groups/${g.id}`}
              className="p-4 rounded-xl border border-outline-variant bg-surface flex items-center justify-between hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-semibold">
                  {g.name[0]}
                </div>
                <div>
                  <p className="font-semibold">{g.name}</p>
                  <p className="text-sm text-on-surface-variant">{g.members.length} members</p>
                </div>
              </div>
              <div className="text-right text-sm">
                {mine.length === 0 && <span className="text-on-surface-variant">settled up</span>}
                {mine.map((b) => (
                  <p key={b.currency_code} className={parseFloat(b.amount) >= 0 ? "text-positive" : "text-negative"}>
                    {parseFloat(b.amount) >= 0 ? "you are owed " : "you owe "}
                    {formatMoney(Math.abs(parseFloat(b.amount)), b.currency_code, units)}
                  </p>
                ))}
              </div>
            </Link>
          );
        })}
        {groups?.length === 0 && <p className="text-on-surface-variant">No groups yet. Create one to get started.</p>}
      </div>
    </div>
  );
}
