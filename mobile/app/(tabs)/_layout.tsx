import * as Haptics from "expo-haptics";
import { Tabs } from "expo-router";

import { Icon, IconName } from "@/components/design/Icon";
import { useTheme } from "@/lib/design/theme";

/// Tab bar mirroring the design canvas — Home / Boost / Discover /
/// Activity. Send is no longer a tab; it's a quick action accessible
/// from the Home pill row (matches the auto-earn model where you
/// rarely send compared to receive + earn).
export default function TabLayout() {
  const t = useTheme();

  const renderIcon = (name: IconName) =>
    function TabIcon({ color, focused }: { color: string; focused: boolean }) {
      return <Icon name={name} size={22} stroke={focused ? 2.2 : 1.7} color={color} />;
    };

  return (
    <Tabs
      screenListeners={{
        tabPress: () => Haptics.selectionAsync(),
      }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.green,
        tabBarInactiveTintColor: t.fg3,
        tabBarLabelStyle: {
          fontFamily: t.sans,
          fontSize: 10,
          fontWeight: "600",
          letterSpacing: 0.2,
          textTransform: "uppercase",
        },
        tabBarStyle: {
          backgroundColor: t.bg1,
          borderTopColor: t.border,
          height: 84,
          paddingTop: 8,
          paddingBottom: 24,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarIcon: renderIcon("home") }}
      />
      <Tabs.Screen
        name="boost"
        options={{ title: "Boost", tabBarIcon: renderIcon("flame") }}
      />
      <Tabs.Screen
        name="discover"
        options={{ title: "Discover", tabBarIcon: renderIcon("compass") }}
      />
      <Tabs.Screen
        name="activity"
        options={{ title: "Activity", tabBarIcon: renderIcon("clock") }}
      />
      {/* Existing tabs that no longer appear in the bar — keep them as
          navigable routes (links into them still work) but hide the tab. */}
      <Tabs.Screen
        name="savings"
        options={{ href: null, title: "Savings" }}
      />
      <Tabs.Screen
        name="send"
        options={{ href: null, title: "Send" }}
      />
    </Tabs>
  );
}
