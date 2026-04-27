// app/(app)/(tabs)/_layout.tsx

import { useAppStore } from "@/src/store/appStore";
import { C, F, W } from "@/src/utils/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform, StyleSheet } from "react-native";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface TabConfig {
  name: string;
  title: string;
  icon: IconName;
  activeIcon: IconName;
}

const TABS: TabConfig[] = [
  {
    name: "index",
    title: "Dashboard",
    icon: "view-dashboard-outline",
    activeIcon: "view-dashboard",
  },
  {
    name: "receive",
    title: "Receive",
    icon: "package-variant-closed", // solid package
    activeIcon: "package-variant",
  },
  {
    name: "withdraw",
    title: "Withdraw Stocks",
    icon: "package-variant-minus",
    activeIcon: "package-variant",
  },
  {
    name: "inventory",
    title: "Inventory",
    icon: "clipboard-text-outline",
    activeIcon: "clipboard-text",
  },
  {
    name: "more",
    title: "More",
    icon: "dots-horizontal-circle-outline",
    activeIcon: "dots-horizontal-circle",
  },
];

export default function TabsLayout() {
  const offlineQueue = useAppStore((s) => s.offlineQueue ?? []);
  const pendingCount = offlineQueue.filter((r) => !r.synced).length;

  const loginRequired = useAppStore(
    (s) => s.apiSettings?.loginRequired ?? true,
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.bar,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textTertiary,
        tabBarLabelStyle: styles.label,
      }}>
      {TABS.map((tab) => {
        // 🔥 Hide these when login is NOT required
        const hidden =
          !loginRequired &&
          (tab.name === "index" ||
            tab.name === "receive" ||
            tab.name === "inventory");

        return (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              href: hidden ? null : undefined,
              tabBarIcon: ({ focused, color, size }) => {
                const iconName = focused ? tab.activeIcon : tab.icon;
                return (
                  <MaterialCommunityIcons
                    name={iconName}
                    size={size}
                    color={color}
                  />
                );
              },
              tabBarBadge:
                tab.name === "more" && pendingCount > 0
                  ? pendingCount
                  : undefined,
              tabBarBadgeStyle: styles.badge,
            }}
          />
        );
      })}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: C.bgCard,
    borderTopColor: C.border,
    borderTopWidth: 1,
    height: Platform.OS === "ios" ? 88 : 64,
    paddingBottom: Platform.OS === "ios" ? 28 : 10,
    paddingTop: 8,
  },
  label: {
    fontSize: F.xs,
    fontWeight: W.medium,
  },
  badge: {
    backgroundColor: C.accentOrange,
    fontSize: 10,
    fontWeight: W.bold,
  },
});
