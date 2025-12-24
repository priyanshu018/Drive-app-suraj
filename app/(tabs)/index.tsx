import { useEffect, useState } from "react";
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabaseClient";

export default function TabIndex() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState("");

  // Consent state
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);

  // Dynamic Stats
  const [learnedSigns, setLearnedSigns] = useState(0);
  const [dayStreak, setDayStreak] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Check AsyncStorage first
      const loginStatus = await AsyncStorage.getItem("isLoggedIn");

      if (loginStatus !== "true") {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      // Check Supabase session
      const { data } = await supabase.auth.getSession();

      if (!data?.session?.user) {
        // Session expired - clear AsyncStorage and redirect
        await AsyncStorage.removeItem("isLoggedIn");
        await AsyncStorage.removeItem("userEmail");
        await AsyncStorage.removeItem("userId");
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      // Both checks passed - user is authenticated
      setIsAuthenticated(true);
      await getUserInfo();

      // Check consent status
      const hasConsent = await checkConsentStatus(data.session.user.id);

      if (!hasConsent) {
        setShowConsentModal(true);
        setLoading(false);
      } else {
        await loadStats();
        setLoading(false);
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setIsAuthenticated(false);
      setLoading(false);
    }
  };

  const checkConsentStatus = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("user_consent")
        .select("consent_given")
        .eq("user_id", userId)
        .single();

      if (error) {
        // If no record exists, user hasn't consented yet
        if (error.code === "PGRST116") {
          return false;
        }
        console.error("Error checking consent:", error);
        return false;
      }

      return data?.consent_given === true;
    } catch (error) {
      console.error("Consent check error:", error);
      return false;
    }
  };

  const handleAcceptConsent = async () => {
    setConsentLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (!user) {
        console.error("No user found");
        setConsentLoading(false);
        return;
      }

      // Insert or update consent
      const { error } = await supabase.from("user_consent").upsert({
        user_id: user.id,
        consent_given: true,
        consent_version: "1.0",
        accepted_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Error saving consent:", error);
        alert("Failed to save consent. Please try again.");
        setConsentLoading(false);
        return;
      }

      // Consent saved successfully
      setShowConsentModal(false);
      await loadStats();
      setConsentLoading(false);
    } catch (error) {
      console.error("Accept consent error:", error);
      alert("An error occurred. Please try again.");
      setConsentLoading(false);
    }
  };

  const getUserInfo = async () => {
    const name = await AsyncStorage.getItem("userName");
    const email = await AsyncStorage.getItem("userEmail");
    setUserName(name || email?.split("@")[0] || "Driver");
  };

  const loadStats = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return;

      const today = new Date().toISOString().split("T")[0];

      const { data: todayActivity } = await supabase
        .from("user_activity")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "learned_sign")
        .gte("created_at", today + "T00:00:00")
        .lte("created_at", today + "T23:59:59");

      const todaySigns = new Set(
        todayActivity?.map((r) => r.details).filter((x) => x !== null)
      );
      setLearnedSigns(todaySigns.size);

      const { data: progress } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (progress) {
        setDayStreak(progress.streak || 0);
        setBestScore(progress.best_score || 0);
      }
    } catch (error) {
      console.log(error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C2C2E" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/auth/login" />;
  }

  const sections = [
    {
      id: 1,
      title: "Learn Signs",
      subtitle: "Study traffic signs",
      icon: "school-outline",
      color: "#4CAF50",
      progress: "All signs included",
      route: "/learn-signs",
    },
    {
      id: 2,
      title: "Practice Test",
      subtitle: "Take mock exams",
      icon: "clipboard-outline",
      color: "#2196F3",
      progress: "10 question quiz",
      route: "/test-mode",
    },
    {
      id: 3,
      title: "Fun Games",
      subtitle: "Learn through play",
      icon: "game-controller-outline",
      color: "#FF9800",
      progress: "Match & Guess",
      route: "/games",
    },
    {
      id: 4,
      title: "My Progress",
      subtitle: "Track your learning",
      icon: "analytics-outline",
      color: "#9C27B0",
      progress: "Stats & Badges",
      route: "/progress",
    },
  ];

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <Ionicons name="trophy-outline" size={24} color="#FFD700" />
            <Text style={styles.goalTitle}>Today's Goal</Text>
          </View>

          <Text style={styles.goalText}>Learn 5 new traffic signs</Text>

          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min((learnedSigns / 5) * 100, 100)}%` },
              ]}
            />
          </View>

          <Text style={styles.progressText}>
            {Math.min(learnedSigns, 5)} of 5 completed
          </Text>
        </View>

        <View style={styles.sectionsContainer}>
          {sections.map((section) => (
            <TouchableOpacity
              key={section.id}
              style={styles.sectionCard}
              activeOpacity={0.7}
              onPress={() => router.push(section.route as any)}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: section.color + "20" },
                ]}
              >
                <Ionicons
                  name={section.icon as any}
                  size={28}
                  color={section.color}
                />
              </View>

              <View style={styles.sectionContent}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
                <Text style={styles.sectionProgress}>{section.progress}</Text>
              </View>

              <View style={styles.arrowContainer}>
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.quickStats}>
          <Text style={styles.quickStatsTitle}>Quick Stats</Text>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.statNumber}>{learnedSigns}</Text>
              <Text style={styles.statLabel}>Today's Signs</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="flame" size={24} color="#FF5722" />
              <Text style={styles.statNumber}>{dayStreak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="star" size={24} color="#FFD700" />
              <Text style={styles.statNumber}>{bestScore}%</Text>
              <Text style={styles.statLabel}>Best Score</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Consent Modal */}
      <Modal
        visible={showConsentModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalBody}>
              <Text style={styles.modalText}>
                This app is developed only for learning and educational
                purposes. It helps users understand Japanese traffic signs and
                road rules in a simplified manner. This app is not an official
                authority and should not be used for real-time driving or legal
                decisions. Always follow official Japanese traffic laws and
                instructions.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.acceptButton}
              onPress={handleAcceptConsent}
              disabled={consentLoading}
              activeOpacity={0.8}
            >
              {consentLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.acceptButtonText}>Accept</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFBEF",
  },
  contentContainer: {
    paddingTop: 60,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFBEF",
  },
  goalCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 10,
    color: "#2C2C2E",
  },
  goalText: {
    fontSize: 15,
    color: "#8E8E93",
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#F2F2F7",
    borderRadius: 4,
    marginBottom: 10,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    color: "#8E8E93",
    fontWeight: "500",
  },
  sectionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  sectionContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C2C2E",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 4,
  },
  sectionProgress: {
    fontSize: 12,
    color: "#C7C7CC",
  },
  arrowContainer: {
    marginLeft: 8,
  },
  quickStats: {
    paddingHorizontal: 20,
  },
  quickStatsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2C2C2E",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    paddingVertical: 20,
    borderRadius: 16,
    elevation: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2C2C2E",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 4,
  },
  // Modal Styles - Matching App Theme
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(44, 44, 46, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#FFFBEF",
    borderRadius: 24,
    padding: 32,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#2C2C2E",
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 15,
    color: "#8E8E93",
    marginBottom: 24,
    textAlign: "center",
  },
  modalBody: {
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  modalText: {
    fontSize: 12,
    color: "#2C2C2E",
    lineHeight: 22,
    textAlign: "center",
  },
  acceptButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: "#4CAF50",
    gap: 8,
    elevation: 2,
  },
  acceptButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
