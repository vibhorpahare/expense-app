import axios from "axios";

export const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface PublicUser {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  avatar_url: string | null;
}

export interface Balance {
  currency_code: string;
  amount: string;
}

export interface GroupMember extends PublicUser {
  balance: Balance[];
}

export interface Debt {
  from: string;
  to?: string;
  amount: string;
  currency_code: string;
}

export interface Group {
  id: string;
  name: string;
  group_type: string;
  simplify_by_default: boolean;
  avatar_url: string | null;
  archived_at: string | null;
  created_by_id: string;
  members: GroupMember[];
  simplified_debts: Debt[];
  original_debts: Debt[];
}

export interface GroupBalanceEntry {
  group_id: string | null;
  group_name: string | null;
  currency_code: string;
  amount: string;
}

export interface Friend extends PublicUser {
  balance: Balance[];
  by_group?: GroupBalanceEntry[];
}

export interface ExpenseShare {
  user: PublicUser;
  paid_share: string;
  owed_share: string;
  net_balance: string;
}

export interface Comment {
  id: string;
  content: string;
  comment_type: string;
  created_at: string;
  user: PublicUser | null;
}

export interface Expense {
  id: string;
  group_id: string | null;
  description: string;
  details: string | null;
  cost: string;
  currency_code: string;
  category_id: number | null;
  date: string;
  payment: boolean;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  shares: ExpenseShare[];
  comments: Comment[];
}

export interface Category {
  id: number;
  name: string;
  icon_url: string | null;
  subcategories: Category[];
}

export interface Notification {
  id: string;
  type: number;
  content: string;
  image_url: string | null;
  image_shape: string;
  source_type: string | null;
  source_id: string | null;
  created_at: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string | null;
  locale: string;
  phone_number: string | null;
  avatar_url: string | null;
  custom_picture: boolean;
  notification_settings: Record<string, boolean>;
}

export interface DashboardSummary {
  total_balance: Balance[];
  you_owe: Balance[];
  you_are_owed: Balance[];
  by_friend: Record<string, Balance[]>;
}

export const auth = {
  register: (data: { email: string; password: string; first_name: string; last_name?: string }) =>
    api.post("/auth/register", data),
  login: async (email: string, password: string) => {
    const form = new URLSearchParams();
    form.set("username", email);
    form.set("password", password);
    const res = await api.post("/auth/jwt/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return res.data.access_token as string;
  },
};

export const users = {
  me: () => api.get<{ user: CurrentUser }>("/get_current_user").then((r) => r.data.user),
  update: (data: Partial<{
    first_name: string;
    last_name: string;
    locale: string;
    phone_number: string;
    password: string;
    notification_settings: Record<string, boolean>;
  }>) => api.patch<CurrentUser>("/users/me", data).then((r) => r.data),
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api
      .post<{ user: CurrentUser }>("/users/me/avatar", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data.user);
  },
};

export const dashboard = {
  summary: () => api.get<DashboardSummary>("/get_dashboard").then((r) => r.data),
};

export const groups = {
  list: (includeArchived = false) =>
    api.get<{ groups: Group[] }>("/get_groups", { params: { include_archived: includeArchived } }).then((r) => r.data.groups),
  get: (id: string) => api.get<{ group: Group }>(`/get_group/${id}`).then((r) => r.data.group),
  create: (data: { name: string; group_type: string; member_emails: string[] }) =>
    api.post<{ group: Group }>("/create_group", data).then((r) => r.data.group),
  update: (id: string, data: Partial<{ name: string; group_type: string; simplify_by_default: boolean }>) =>
    api.post<{ group: Group }>(`/update_group/${id}`, data).then((r) => r.data.group),
  remove: (id: string) => api.post(`/delete_group/${id}`),
  uploadAvatar: (id: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api
      .post<{ group: Group }>(`/groups/${id}/avatar`, form, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data.group);
  },
  archive: (id: string) => api.post<{ success: boolean; errors: Record<string, string[]> }>(`/groups/${id}/archive`).then((r) => r.data),
  unarchive: (id: string) => api.post<{ success: boolean; errors: Record<string, string[]> }>(`/groups/${id}/unarchive`).then((r) => r.data),
  simplifiedDebts: (id: string) =>
    api.get<{ simplified_debts: Debt[] }>(`/get_group/${id}/simplified_debts`).then((r) => r.data.simplified_debts),
  settleDebt: (id: string, data: { from_user_id: string; to_user_id: string; amount: string; currency_code: string }) =>
    api.post<{ success: boolean }>(`/groups/${id}/settle_debt`, data).then((r) => r.data),
};

export const friends = {
  list: () => api.get<{ friends: Friend[] }>("/get_friends").then((r) => r.data.friends),
  get: (id: string) => api.get<{ friend: Friend }>(`/get_friend/${id}`).then((r) => r.data.friend),
  create: (user_email: string) => api.post<{ friend: Friend }>("/create_friend", { user_email }),
};

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
  settleUp: (data: { other_user_id: string; amount: string; currency_code: string; direction: "i_paid" | "they_paid"; group_id?: string }) =>
    api.post<{ expenses: Expense[]; errors: Record<string, string[]> }>("/settle_up", data),
  extractReceipt: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api
      .post<{ available: boolean; amount?: number | null; date?: string | null; title?: string | null }>(
        "/expenses/extract_receipt",
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
      )
      .then((r) => r.data);
  },
  uploadReceipt: (expenseId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api
      .post<{ expense: Expense }>(`/expenses/${expenseId}/receipt`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data.expense);
  },
};

export const comments = {
  list: (expense_id: string) =>
    api.get<{ comments: Comment[] }>("/get_comments", { params: { expense_id } }).then((r) => r.data.comments),
  create: (expense_id: string, content: string) => api.post("/create_comment", { expense_id, content }),
  remove: (id: string) => api.post(`/delete_comment/${id}`),
};

export const exportApi = {
  expensesCsv: async (params: {
    group_id?: string;
    friend_id?: string;
    category_id?: number;
    payer_id?: string;
    dated_after?: string;
    dated_before?: string;
  }) => {
    const res = await api.get("/export/expenses.csv", { params, responseType: "blob" });
    const url = URL.createObjectURL(res.data as Blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "expenses.csv";
    link.click();
    URL.revokeObjectURL(url);
  },
};

export const other = {
  categories: () => api.get<{ categories: Category[] }>("/get_categories").then((r) => r.data.categories),
};

export const notifications = {
  list: () =>
    api
      .get<{ notifications: Notification[]; unread_count: number }>("/get_notifications")
      .then((r) => r.data),
  markRead: () => api.post("/notifications/mark_read"),
};
