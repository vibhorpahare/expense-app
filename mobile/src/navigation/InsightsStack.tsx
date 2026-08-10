import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { InsightsStackParamList } from "./types";
import { InsightsScreen } from "../screens/insights/InsightsScreen";
import { GroupDetailScreen } from "../screens/groups/GroupDetailScreen";
import { stackScreenOptions } from "./stackOptions";

const Stack = createNativeStackNavigator<InsightsStackParamList>();

export function InsightsStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="Insights" component={InsightsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} options={{ title: "Group" }} />
    </Stack.Navigator>
  );
}
