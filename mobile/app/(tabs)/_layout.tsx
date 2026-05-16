import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Tabs } from "expo-router";

import { colors, typography } from "@/lib/utils/theme";

export default function TabLayout() {
  return (
    <Tabs
      screenListeners={{
        tabPress: () => Haptics.selectionAsync()
      }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand.primary,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarLabelStyle: {
          ...typography.bodyMd,
          fontSize: 11
        },
        tabBarStyle: {
          backgroundColor: colors.bg.secondary,
          borderTopColor: colors.border.subtle,
          height: 68,
          paddingBottom: 10,
          paddingTop: 8
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons color={color} name="home" size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="savings"
        options={{
          title: "Savings",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons color={color} name="chart-line" size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="send"
        options={{
          title: "Send",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons color={color} name="send" size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: "Activity",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons color={color} name="history" size={size} />
          )
        }}
      />
    </Tabs>
  );
}
