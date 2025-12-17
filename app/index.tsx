import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";

export default function Index() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const loggedIn = await AsyncStorage.getItem("isLoggedIn");
      console.log("🔍 Checking login status:", loggedIn);
      setIsLoggedIn(loggedIn === "true");
    } catch (error) {
      console.error("Error checking login status:", error);
      setIsLoggedIn(false);
    }
  };

  // Show loading while checking
  if (isLoggedIn === null) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#FFFBEF",
        }}
      >
        <ActivityIndicator size="large" color="#2C2C2E" />
      </View>
    );
  }

  // ADD THESE DEBUG LOGS
  console.log("🚀 Redirecting... isLoggedIn:", isLoggedIn);

  // Redirect based on login status
  if (isLoggedIn) {
    console.log("✅ Redirecting to /(tabs)");
    return <Redirect href="/(tabs)" />;
  } else {
    console.log("❌ Redirecting to /auth/login");
    return <Redirect href="/auth/login" />;
  }
}
