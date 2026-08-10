// Ported verbatim from frontend/src/lib/api.ts -- same backend, same shapes.

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
