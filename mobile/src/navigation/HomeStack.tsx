import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "./types";
import { DashboardScreen } from "../screens/home/DashboardScreen";
import { ExpenseDetailScreen } from "../screens/expenses/ExpenseDetailScreen";
import { AddExpenseScreen } from "../screens/expenses/AddExpenseScreen";
import { stackScreenOptions } from "./stackOptions";

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ExpenseDetail" component={ExpenseDetailScreen} options={{ title: "Expense" }} />
      <Stack.Screen
        name="AddExpense"
        component={AddExpenseScreen}
        options={{ presentation: "modal", title: "New Expense" }}
      />
    </Stack.Navigator>
  );
}
