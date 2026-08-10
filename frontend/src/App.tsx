import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { useAuth } from "./lib/auth";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { GroupsPage } from "./pages/GroupsPage";
import { AllExpensesPage } from "./pages/AllExpensesPage";
import { FriendsPage } from "./pages/FriendsPage";
import { GroupPage } from "./pages/GroupPage";
import { ExpenseDetailPage } from "./pages/ExpenseDetailPage";
import { ActivityPage } from "./pages/ActivityPage";
import { AccountPage } from "./pages/AccountPage";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-svh flex items-center justify-center text-gray-500">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/expenses" element={<AllExpensesPage />} />
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/groups/:groupId" element={<GroupPage />} />
        <Route path="/expenses/:expenseId" element={<ExpenseDetailPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/account" element={<AccountPage />} />
      </Route>
    </Routes>
  );
}
