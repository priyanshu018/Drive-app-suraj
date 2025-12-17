import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import "react-native-url-polyfill/auto";
import "react-native-get-random-values";

import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import Toast from "react-native-toast-message";

import { useColorScheme } from "@/hooks/use-color-scheme";

import { View, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// NEW ADS IMPORT
import {
  InterstitialAd,
  AdEventType,
  BannerAd,
  BannerAdSize,
} from "react-native-google-mobile-ads";

// YOUR AD UNIT IDS
const INTERSTITIAL_ID = "ca-app-pub-8359808785913350/3085767296";
const BANNER_ID = "ca-app-pub-8359808785913350/2189997338";

// Create interstitial instance
const interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_ID, {
  requestNonPersonalizedAdsOnly: false,
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [hasNavigated, setHasNavigated] = useState(false);

  // Check login status on app start
  useEffect(() => {
    checkLoginStatus();
  }, []);

  // Handle navigation based on auth state - only once
  useEffect(() => {
    if (isLoggedIn === null || hasNavigated) return;

    const inAuthGroup = segments[0] === "auth";

    if (isLoggedIn && inAuthGroup) {
      router.replace("/(tabs)");
      setHasNavigated(true);
    } else if (!isLoggedIn && !inAuthGroup) {
      router.replace("/auth/login");
      setHasNavigated(true);
    }
  }, [isLoggedIn]);

  const checkLoginStatus = async () => {
    try {
      const loggedIn = await AsyncStorage.getItem("isLoggedIn");
      setIsLoggedIn(loggedIn === "true");
    } catch (error) {
      console.error("Error checking login status:", error);
      setIsLoggedIn(false);
    }
  };

  // Show full-screen interstitial ad when app starts
  useEffect(() => {
    const unsubscribe = interstitial.addAdEventListener(
      AdEventType.LOADED,
      () => {
        interstitial.show();
      }
    );

    interstitial.load();

    return unsubscribe;
  }, []);

  // Don't render anything until we know auth state
  if (isLoggedIn === null) {
    return null;
  }

  // Check if we're in the tabs section
  const isInTabs = segments[0] === "(tabs)";

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <View style={styles.container}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="auth" />
          <Stack.Screen name="(tabs)" />
          {isInTabs && (
            <BannerAd unitId={BANNER_ID} size={BannerAdSize.BANNER} />
          )}
        </Stack>
        <StatusBar style="auto" />
        <Toast />
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
