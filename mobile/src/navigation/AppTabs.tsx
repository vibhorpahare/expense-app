import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { AppTabParamList } from "./types";
import { HomeStack } from "./HomeStack";
import { ActivityStack } from "./ActivityStack";
import { InsightsStack } from "./InsightsStack";
import { GroupsStack } from "./GroupsStack";
import { AccountStack } from "./AccountStack";
import { BottomNav } from "../components/ui/BottomNav";

const Tab = createBottomTabNavigator<AppTabParamList>();

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomNav {...props} />}
    >
      <Tab.Screen name="HomeTab" component={HomeStack} />
      <Tab.Screen name="ActivityTab" component={ActivityStack} />
      <Tab.Screen name="InsightsTab" component={InsightsStack} />
      <Tab.Screen name="GroupsTab" component={GroupsStack} />
      <Tab.Screen name="AccountTab" component={AccountStack} />
    </Tab.Navigator>
  );
}
