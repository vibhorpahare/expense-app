import type { NavigatorScreenParams } from "@react-navigation/native";

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type HomeStackParamList = {
  Dashboard: undefined;
  ExpenseDetail: { expenseId: string };
  AddExpense: { groupId?: string; friendId?: string } | undefined;
};

export type ActivityStackParamList = {
  AllExpenses: undefined;
  Notifications: undefined;
  ExpenseDetail: { expenseId: string };
};

export type InsightsStackParamList = {
  Insights: undefined;
  GroupDetail: { groupId: string };
};

export type GroupsStackParamList = {
  Groups: undefined;
  Friends: undefined;
  GroupDetail: { groupId: string };
  GroupSettings: { groupId: string };
  ExpenseDetail: { expenseId: string };
  AddExpense: { groupId?: string; friendId?: string } | undefined;
};

export type AccountStackParamList = {
  Account: undefined;
};

export type AppTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  ActivityTab: NavigatorScreenParams<ActivityStackParamList>;
  InsightsTab: NavigatorScreenParams<InsightsStackParamList>;
  GroupsTab: NavigatorScreenParams<GroupsStackParamList>;
  AccountTab: NavigatorScreenParams<AccountStackParamList>;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<AppTabParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
