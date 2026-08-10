import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";
import { friends as friendsApi, groups as groupsApi, notifications as notificationsApi } from "../lib/api";
import { AddExpenseModal } from "./AddExpenseModal";

const navItem =
  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium font-body transition-colors";
const navActive = "bg-primary-container text-on-primary-container";
const navInactive = "text-on-surface-variant hover:bg-surface-container";

function SearchBox() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { data: groups } = useQuery({ queryKey: ["groups"], queryFn: () => groupsApi.list() });
  const { data: friends } = useQuery({ queryKey: ["friends"], queryFn: friendsApi.list });

  const results = useMemo(() => {
    if (!query.trim()) return { groups: [], friends: [] };
    const q = query.toLowerCase();
    return {
      groups: (groups ?? []).filter((g) => g.name.toLowerCase().includes(q)).slice(0, 5),
      friends: (friends ?? []).filter(
        (f) => f.first_name.toLowerCase().includes(q) || f.email.toLowerCase().includes(q),
      ).slice(0, 5),
    };
  }, [query, groups, friends]);

  const hasResults = results.groups.length > 0 || results.friends.length > 0;

  return (
    <div className="relative flex-1 max-w-md min-w-0">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search groups or friends..."
        className="w-full px-4 py-2 rounded-full bg-surface-container border border-outline-variant text-sm font-body placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      {query.trim() && (
        <div className="absolute mt-1 w-full bg-surface border border-outline-variant rounded-lg shadow-lg overflow-hidden z-40">
          {!hasResults && <p className="px-4 py-3 text-sm text-on-surface-variant">No matches.</p>}
          {results.groups.map((g) => (
            <button
              key={g.id}
              onClick={() => {
                navigate(`/groups/${g.id}`);
                setQuery("");
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-surface-container flex items-center justify-between"
            >
              <span>{g.name}</span>
              <span className="text-xs text-on-surface-variant">Group</span>
            </button>
          ))}
          {results.friends.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                navigate("/friends");
                setQuery("");
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-surface-container flex items-center justify-between"
            >
              <span>
                {f.first_name} {f.last_name}
              </span>
              <span className="text-xs text-on-surface-variant">Friend</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarContent({ onNavigate, onAddExpense }: { onNavigate?: () => void; onAddExpense: () => void }) {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex flex-col h-full p-4">
      <Link to="/" onClick={onNavigate} className="font-display text-2xl font-bold text-primary tracking-tight px-2 mb-8">
        Splitly
      </Link>

      <nav className="flex flex-col gap-1">
        <NavLink to="/" end onClick={onNavigate} className={({ isActive }) => `${navItem} ${isActive ? navActive : navInactive}`}>
          <span className="material-symbols-outlined text-[20px]" aria-hidden>
            grid_view
          </span>
          Dashboard
        </NavLink>
        <NavLink to="/expenses" onClick={onNavigate} className={({ isActive }) => `${navItem} ${isActive ? navActive : navInactive}`}>
          <span className="material-symbols-outlined text-[20px]" aria-hidden>
            receipt_long
          </span>
          Expenses
        </NavLink>
        <NavLink to="/groups" onClick={onNavigate} className={({ isActive }) => `${navItem} ${isActive ? navActive : navInactive}`}>
          <span className="material-symbols-outlined text-[20px]" aria-hidden>
            group
          </span>
          Groups
        </NavLink>
        <NavLink to="/friends" onClick={onNavigate} className={({ isActive }) => `${navItem} ${isActive ? navActive : navInactive}`}>
          <span className="material-symbols-outlined text-[20px]" aria-hidden>
            person
          </span>
          Friends
        </NavLink>
      </nav>

      <button
        onClick={onAddExpense}
        className="mt-6 px-4 py-2.5 rounded-full bg-primary text-on-primary font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all"
      >
        + New Group / Expense
      </button>

      <div className="mt-auto flex flex-col gap-1">
        <button onClick={toggleTheme} className={`${navItem} ${navInactive} w-full justify-between`}>
          <span className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[20px]" aria-hidden>
              {theme === "dark" ? "dark_mode" : "light_mode"}
            </span>
            {theme === "dark" ? "Dark mode" : "Light mode"}
          </span>
          <span
            className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors ${theme === "dark" ? "bg-primary justify-end" : "bg-outline-variant justify-start"}`}
          >
            <span className="w-4 h-4 rounded-full bg-white shadow" />
          </span>
        </button>
        <Link to="/account" onClick={onNavigate} className={`${navItem} ${navInactive}`}>
          <span className="material-symbols-outlined text-[20px]" aria-hidden>
            settings
          </span>
          Settings
        </Link>
        <button onClick={logout} className={`${navItem} ${navInactive}`}>
          <span className="material-symbols-outlined text-[20px]" aria-hidden>
            logout
          </span>
          Log out
        </button>
      </div>
    </div>
  );
}

function MobileDrawer({ onClose, onAddExpense }: { onClose: () => void; onAddExpense: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex md:hidden transition-colors duration-200 ${visible ? "bg-black/40" : "bg-black/0"}`}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-[260px] h-full bg-surface border-r border-outline-variant transition-transform duration-200 ease-out ${visible ? "translate-x-0" : "-translate-x-full"}`}
      >
        <SidebarContent
          onNavigate={handleClose}
          onAddExpense={() => {
            handleClose();
            onAddExpense();
          }}
        />
      </div>
    </div>
  );
}

export function Layout() {
  const { user } = useAuth();
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const { data: notifData } = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationsApi.list,
    refetchInterval: 30_000,
  });
  const unreadCount = notifData?.unread_count ?? 0;

  return (
    <div className="h-svh flex bg-background text-on-surface font-body overflow-hidden">
      <aside className="hidden md:flex w-[260px] shrink-0 border-r border-outline-variant bg-surface overflow-y-auto">
        <SidebarContent onAddExpense={() => setShowAddExpense(true)} />
      </aside>

      {showMobileNav && (
        <MobileDrawer onClose={() => setShowMobileNav(false)} onAddExpense={() => setShowAddExpense(true)} />
      )}

      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-6 h-16 border-b border-outline-variant bg-background/80 backdrop-blur-xl">
          <button
            onClick={() => setShowMobileNav(true)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container shrink-0"
            aria-label="Open menu"
          >
            <span className="material-symbols-outlined" aria-hidden>
              menu
            </span>
          </button>
          <Link to="/" className="md:hidden font-display text-lg font-bold text-primary shrink-0">
            Splitly
          </Link>
          <SearchBox />
          <div className="ml-auto flex items-center gap-2 md:gap-3">
            <Link
              to="/activity"
              className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors shrink-0"
              aria-label="Activity"
            >
              <span className="material-symbols-outlined text-on-surface-variant" aria-hidden>
                notifications
              </span>
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-negative text-white text-[10px] font-semibold flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setShowAddExpense(true)}
              className="px-3 md:px-4 py-2 rounded-full bg-primary text-on-primary text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-1.5 shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden>
                add
              </span>
              <span className="hidden sm:inline">Add Expense</span>
            </button>
            <Link to="/account" className="w-9 h-9 rounded-full overflow-hidden border border-outline-variant flex items-center justify-center bg-primary-container text-on-primary-container font-semibold text-sm shrink-0">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                user?.first_name?.[0]
              )}
            </Link>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {showAddExpense && <AddExpenseModal onClose={() => setShowAddExpense(false)} />}
    </div>
  );
}
