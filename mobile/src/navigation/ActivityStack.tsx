import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { ActivityStackParamList } from "./types";
import { AllExpensesScreen } from "../screens/activity/AllExpensesScreen";
import { NotificationsScreen } from "../screens/activity/NotificationsScreen";
import { ExpenseDetailScreen } from "../screens/expenses/ExpenseDetailScreen";
import { stackScreenOptions } from "./stackOptions";

const Stack = createNativeStackNavigator<ActivityStackParamList>();

export function ActivityStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="AllExpenses" component={AllExpensesScreen} options={{ title: "Activity" }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: "Notifications" }} />
      <Stack.Screen name="ExpenseDetail" component={ExpenseDetailScreen} options={{ title: "Expense" }} />
    </Stack.Navigator>
  );
}
