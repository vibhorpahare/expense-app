import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { AccountStackParamList } from "./types";
import { AccountScreen } from "../screens/account/AccountScreen";
import { stackScreenOptions } from "./stackOptions";

const Stack = createNativeStackNavigator<AccountStackParamList>();

export function AccountStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="Account" component={AccountScreen} options={{ title: "Account" }} />
    </Stack.Navigator>
  );
}
