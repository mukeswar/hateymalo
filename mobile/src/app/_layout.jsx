import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Eczar_600SemiBold, Eczar_700Bold } from '@expo-google-fonts/eczar';
import { Mukta_400Regular, Mukta_500Medium, Mukta_600SemiBold, Mukta_700Bold } from '@expo-google-fonts/mukta';
import { AuthProvider } from '../context/AuthContext';
import { SettingsProvider } from '../context/SettingsContext';
import { ToastProvider } from '../context/ToastContext';
import { stackScreenOptions } from '../lib/navigation';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Eczar_600SemiBold,
    Eczar_700Bold,
    Mukta_400Regular,
    Mukta_500Medium,
    Mukta_600SemiBold,
    Mukta_700Bold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SettingsProvider>
          <ToastProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={stackScreenOptions}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="admin" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ title: 'Sign in', presentation: 'modal' }} />
              <Stack.Screen name="register" options={{ title: 'Join Hateymalo', presentation: 'modal' }} />
              <Stack.Screen name="post/[id]" options={{ title: 'Post' }} />
              <Stack.Screen name="event/[id]" options={{ title: 'Event' }} />
              <Stack.Screen name="blog/[id]" options={{ title: 'Story' }} />
              <Stack.Screen name="profile/[id]" options={{ title: 'Profile' }} />
              <Stack.Screen name="create-post" options={{ title: 'Create a post' }} />
              <Stack.Screen name="create-blog" options={{ title: 'Write a story' }} />
              <Stack.Screen name="donate" options={{ title: 'Donate' }} />
              <Stack.Screen name="search" options={{ title: 'Search' }} />
              <Stack.Screen name="members" options={{ title: 'Members' }} />
              <Stack.Screen name="categories" options={{ title: 'Categories' }} />
              <Stack.Screen name="organizations" options={{ title: 'Organizations' }} />
              <Stack.Screen name="about" options={{ title: 'About' }} />
              <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
              <Stack.Screen name="dashboard" options={{ title: 'My dashboard' }} />
              <Stack.Screen name="sponsor/index" options={{ title: 'Sponsor a campaign' }} />
              <Stack.Screen name="sponsor/[id]" options={{ title: 'Sponsorship' }} />
              <Stack.Screen name="sponsor/portal/index" options={{ title: 'Sponsor portal' }} />
              <Stack.Screen name="sponsor/portal/deal/[id]" options={{ title: 'Sponsorship deal' }} />
              <Stack.Screen name="sponsor/portal/account/[id]" options={{ title: 'Sponsor account' }} />
              <Stack.Screen name="sponsor/organize/[id]" options={{ title: 'Organise campaign' }} />
              <Stack.Screen name="sponsor/ads/index" options={{ title: 'Advertising' }} />
              <Stack.Screen name="sponsor/ads/new" options={{ title: 'New ad campaign' }} />
              <Stack.Screen name="sponsor/ads/[id]" options={{ title: 'Ad campaign' }} />
              <Stack.Screen name="+not-found" options={{ title: 'Not found' }} />
            </Stack>
          </ToastProvider>
        </SettingsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
