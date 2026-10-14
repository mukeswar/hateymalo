import React from 'react';
import { Tabs } from 'expo-router';
import { BookOpen, CalendarDays, Compass, Home, UserRound } from 'lucide-react-native';
import { colors, fonts } from '../../theme';

// Five primary destinations; everything else (donate, members, search, admin…)
// is reached from Home or the Account tab and pushed on the root stack.
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.paper },
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11.5 },
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.sand },
        sceneStyle: { backgroundColor: colors.paper },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', headerShown: false, tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="explore"
        options={{ title: 'Explore', tabBarIcon: ({ color, size }) => <Compass color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="events"
        options={{ title: 'Events', tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="blogs"
        options={{ title: 'Stories', tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: 'Account', tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} /> }}
      />
    </Tabs>
  );
}
