import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { GroupsStackParamList } from "./types";
import { GroupsScreen } from "../screens/groups/GroupsScreen";
import { FriendsScreen } from "../screens/friends/FriendsScreen";
import { GroupDetailScreen } from "../screens/groups/GroupDetailScreen";
import { GroupSettingsScreen } from "../screens/groups/GroupSettingsScreen";
import { ExpenseDetailScreen } from "../screens/expenses/ExpenseDetailScreen";
import { AddExpenseScreen } from "../screens/expenses/AddExpenseScreen";
import { stackScreenOptions } from "./stackOptions";

const Stack = createNativeStackNavigator<GroupsStackParamList>();

export function GroupsStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="Groups" component={GroupsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Friends" component={FriendsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} options={{ title: "Group" }} />
      <Stack.Screen name="GroupSettings" component={GroupSettingsScreen} options={{ title: "Settings" }} />
      <Stack.Screen name="ExpenseDetail" component={ExpenseDetailScreen} options={{ title: "Expense" }} />
      <Stack.Screen
        name="AddExpense"
        component={AddExpenseScreen}
        options={{ presentation: "modal", title: "New Expense" }}
      />
    </Stack.Navigator>
  );
}
