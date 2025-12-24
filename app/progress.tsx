import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabaseClient";

const { width } = Dimensions.get("window");

interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlocked: boolean;
  color: string;
}

interface ActivityRow {
  id: string;
  type: string;
  details: string | null;
  created_at: string | null;
}

export default function Progress() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [totalSigns, setTotalSigns] = useState<number>(0);
  const [learnedSigns, setLearnedSigns] = useState<number>(0);
  const [favoriteCount, setFavoriteCount] = useState<number>(0);
  const [testsCompleted, setTestsCompleted] = useState<number>(0);
  const [bestScorePercent, setBestScorePercent] = useState<number>(0);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityRow[]>([]);
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(
    new Set()
  );
  useEffect(() => {
    loadProgressData();
  }, []);

  const isoDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const loadProgressData = async () => {
    setLoading(true);

    try {
      // favorites from storage
      const favorites = await AsyncStorage.getItem("favoriteSignsV2");
      const favoriteLocalCount = favorites ? JSON.parse(favorites).length : 0;
      setFavoriteCount(favoriteLocalCount);

      // get user
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (!user) {
        setTotalSigns(0);
        setLearnedSigns(0);
        setTestsCompleted(0);
        setBestScorePercent(0);
        setCurrentStreak(0);
        buildBadges(0, 0, 0, 0, favoriteLocalCount);
        return;
      }

      // 1) total signs from supabase
      const { data: allSigns } = await supabase
        .from("traffic_signs")
        .select("id");

      const total = allSigns?.length ?? 0;
      setTotalSigns(total);

      // 2) learned signs from user_activity
      const { data: learnedRows, error: learnedError } = await supabase
        .from("user_activity")
        .select("details")
        .eq("user_id", user.id)
        .eq("type", "learned_sign");

      if (learnedError) throw learnedError;

      const learnedSet = new Set(
        learnedRows?.map((r) => r.details).filter((d) => d !== null)
      );

      const learnedCount = learnedSet.size;
      setLearnedSigns(learnedCount);

      // 3) tests completed
      const { data: testRows } = await supabase
        .from("user_activity")
        .select("id, details, created_at")
        .eq("user_id", user.id)
        .eq("type", "test_completed")
        .order("created_at", { ascending: false });

      const testsCount = testRows?.length ?? 0;
      setTestsCompleted(testsCount);

      // 4) BEST SCORE
      let bestPercent = 0;
      if (testRows) {
        for (const r of testRows) {
          const m = r.details?.match(/Score:\s*([0-9]+)\s*\/\s*([0-9]+)/i);
          if (m) {
            const score = parseInt(m[1]);
            const totalQ = parseInt(m[2]);
            const percent = Math.round((score / totalQ) * 100);
            if (percent > bestPercent) bestPercent = percent;
          }
        }
      }
      setBestScorePercent(bestPercent);

      // 5) recent activity
      const { data: recentRows } = await supabase
        .from("user_activity")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      setRecentActivity(recentRows || []);

      // 6) streak calculation
      const daysSet = new Set<string>();

      if (recentRows) {
        recentRows.forEach((row) => {
          if (row.created_at) {
            daysSet.add(isoDate(new Date(row.created_at)));
          }
        });
      }

      // fetch more if needed
      if (!recentRows || recentRows.length < 7) {
        const { data: olderRows } = await supabase
          .from("user_activity")
          .select("created_at")
          .eq("user_id", user.id)
          .limit(200);

        olderRows?.forEach((row) => {
          if (row.created_at) {
            daysSet.add(isoDate(new Date(row.created_at)));
          }
        });
      }

      // streak
      let streak = 0;
      let date = new Date();

      for (let i = 0; i < 30; i++) {
        const d = isoDate(date);
        if (daysSet.has(d)) {
          streak += 1;
          date.setDate(date.getDate() - 1);
        } else break;
      }

      setCurrentStreak(streak);

      // 7) 🆕 SAVE TO user_progress TABLE
      await saveProgressToDatabase(
        user.id,
        learnedCount,
        testsCount,
        bestPercent,
        streak,
        favoriteLocalCount
      );

      buildBadges(
        learnedCount,
        testsCount,
        bestPercent,
        streak,
        favoriteLocalCount
      );
    } catch (err) {
      console.log("PROGRESS ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🆕 NEW FUNCTION: Save calculated progress to database
  const saveProgressToDatabase = async (
    userId: string,
    learned: number,
    tests: number,
    bestScore: number,
    streak: number,
    favorites: number
  ) => {
    try {
      const { error } = await supabase.from("user_progress").upsert(
        {
          user_id: userId,
          learned_signs: learned,
          tests_completed: tests,
          best_score: bestScore,
          streak: streak,
          favorites: favorites,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

      if (error) {
        console.log("Error saving to user_progress:", error);
      } else {
        console.log("✅ Progress saved to database!");
      }
    } catch (err) {
      console.log("Error in saveProgressToDatabase:", err);
    }
  };

  const buildBadges = (
    learned: number,
    tests: number,
    bestPercent: number,
    streak: number,
    favoritesLocal: number
  ) => {
    const allBadges: Badge[] = [
      {
        id: "first_sign",
        name: "First Step",
        icon: "🎯",
        description: "Learned your first sign",
        unlocked: learned > 0,
        color: "#10B981",
      },
      {
        id: "five_signs",
        name: "Getting Started",
        icon: "🌟",
        description: "Learned 5 signs",
        unlocked: learned >= 5,
        color: "#3B82F6",
      },
      {
        id: "ten_signs",
        name: "Road Scholar",
        icon: "📚",
        description: "Learned 10 signs",
        unlocked: learned >= 10,
        color: "#A855F7",
      },
      {
        id: "twenty_signs",
        name: "Sign Expert",
        icon: "🎓",
        description: "Learned 20 signs",
        unlocked: learned >= 20,
        color: "#8B5CF6",
      },
      {
        id: "first_test",
        name: "Test Taker",
        icon: "✏️",
        description: "Completed your first test",
        unlocked: tests > 0,
        color: "#F59E0B",
      },
      {
        id: "five_tests",
        name: "Test Master",
        icon: "📝",
        description: "Completed 5 tests",
        unlocked: tests >= 5,
        color: "#F97316",
      },
      {
        id: "perfect_score",
        name: "Perfect Score",
        icon: "💯",
        description: "Scored 100% on a test",
        unlocked: bestPercent === 100,
        color: "#EF4444",
      },
      {
        id: "high_scorer",
        name: "High Scorer",
        icon: "⭐",
        description: "Scored 90% or higher",
        unlocked: bestPercent >= 90,
        color: "#DC2626",
      },
      {
        id: "week_streak",
        name: "Dedicated",
        icon: "🔥",
        description: "7-day learning streak",
        unlocked: streak >= 7,
        color: "#F59E0B",
      },
      {
        id: "month_streak",
        name: "Unstoppable",
        icon: "💪",
        description: "30-day learning streak",
        unlocked: streak >= 30,
        color: "#DC2626",
      },
      {
        id: "favorite_collector",
        name: "Favorites Fan",
        icon: "❤️",
        description: "Added 5 signs to favorites",
        unlocked: favoritesLocal >= 5,
        color: "#EF4444",
      },
      {
        id: "favorite_master",
        name: "Favorite Master",
        icon: "💖",
        description: "Added 10 signs to favorites",
        unlocked: favoritesLocal >= 10,
        color: "#EC4899",
      },
    ];

    setBadges(allBadges);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const progressPercentage = totalSigns
    ? Math.round((learnedSigns / totalSigns) * 100)
    : 0;

  const unlockedBadges = badges.filter((b) => b.unlocked).length;

  const renderActivityLabel = (a: ActivityRow) => {
    if (a.type === "test_completed") {
      return "Completed a test";
    }
    if (a.type === "learned_sign") {
      return "Learned a new sign";
    }
    return a.type.replace(/_/g, " ");
  };

  const toggleActivity = (id: string) => {
    setExpandedActivities((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#2C2C2E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Progress</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* PROGRESS CARD */}
        <View style={styles.overallCard}>
          <View style={styles.progressRow}>
            <View style={styles.circularProgress}>
              <View style={styles.progressCircle}>
                <Text style={styles.progressPercentage}>
                  {progressPercentage}%
                </Text>
              </View>
            </View>

            <View style={styles.progressTextContainer}>
              <Text style={styles.overallTitle}>Overall Progress</Text>
              <Text style={styles.overallSubtitle}>
                {learnedSigns} of {totalSigns} signs learned
              </Text>

              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${progressPercentage}%` },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* STATS */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Your Stats</Text>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, styles.statCardLarge]}>
              <View style={[styles.statIcon, { backgroundColor: "#DBEAFE" }]}>
                <Ionicons name="book" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.statNumber}>{learnedSigns}</Text>
              <Text style={styles.statLabel}>Signs Learned</Text>
            </View>

            <View style={[styles.statCard, styles.statCardLarge]}>
              <View style={[styles.statIcon, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="clipboard" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.statNumber}>{testsCompleted}</Text>
              <Text style={styles.statLabel}>Tests Completed</Text>
            </View>

            <View style={[styles.statCard, styles.statCardSmall]}>
              <View
                style={[styles.statIconSmall, { backgroundColor: "#D1FAE5" }]}
              >
                <Ionicons name="trophy" size={20} color="#10B981" />
              </View>
              <Text style={styles.statNumberSmall}>{bestScorePercent}%</Text>
              <Text style={styles.statLabelSmall}>Best Score</Text>
            </View>

            <View style={[styles.statCard, styles.statCardSmall]}>
              <View
                style={[styles.statIconSmall, { backgroundColor: "#FEE2E2" }]}
              >
                <Ionicons name="flame" size={20} color="#EF4444" />
              </View>
              <Text style={styles.statNumberSmall}>{currentStreak}</Text>
              <Text style={styles.statLabelSmall}>Day Streak</Text>
            </View>

            <View style={[styles.statCard, styles.statCardSmall]}>
              <View
                style={[styles.statIconSmall, { backgroundColor: "#FEE2E2" }]}
              >
                <Ionicons name="heart" size={20} color="#EF4444" />
              </View>
              <Text style={styles.statNumberSmall}>{favoriteCount}</Text>
              <Text style={styles.statLabelSmall}>Favorites</Text>
            </View>

            <View style={[styles.statCard, styles.statCardSmall]}>
              <View
                style={[styles.statIconSmall, { backgroundColor: "#F3E8FF" }]}
              >
                <Ionicons name="ribbon" size={20} color="#A855F7" />
              </View>
              <Text style={styles.statNumberSmall}>{unlockedBadges}</Text>
              <Text style={styles.statLabelSmall}>Badges</Text>
            </View>
          </View>
        </View>

        {/* BADGES */}
        <View style={styles.badgesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            <Text style={styles.badgesCount}>
              {unlockedBadges}/{badges.length}
            </Text>
          </View>

          <View style={styles.badgesGrid}>
            {badges.map((badge) => (
              <View
                key={badge.id}
                style={[
                  styles.badgeCard,
                  !badge.unlocked && styles.badgeCardLocked,
                ]}
              >
                <View
                  style={[
                    styles.badgeIconContainer,
                    {
                      backgroundColor: badge.unlocked
                        ? badge.color + "20"
                        : "#f5f5f5",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeEmoji,
                      !badge.unlocked && styles.badgeEmojiLocked,
                    ]}
                  >
                    {badge.icon}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.badgeName,
                    !badge.unlocked && styles.badgeNameLocked,
                  ]}
                  numberOfLines={1}
                >
                  {badge.name}
                </Text>

                <Text
                  style={[
                    styles.badgeDesc,
                    !badge.unlocked && styles.badgeDescLocked,
                  ]}
                  numberOfLines={2}
                >
                  {badge.description}
                </Text>

                {badge.unlocked && (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color="#10B981"
                    style={{ position: "absolute", top: 6, right: 6 }}
                  />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* RECENT ACTIVITY */}
        <View style={styles.activitySection}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>

          {recentActivity.length === 0 ? (
            <View style={styles.activityItem}>
              <Text style={{ color: "#8E8E93" }}>No activity yet</Text>
            </View>
          ) : (
            recentActivity.map((a) => {
              const isExpanded = expandedActivities.has(a.id);

              return (
                <TouchableOpacity
                  key={a.id}
                  style={styles.activityItem}
                  onPress={() => toggleActivity(a.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.activityIcon,
                      { backgroundColor: "#DBEAFE" },
                    ]}
                  >
                    <Ionicons
                      name={
                        a.type === "test_completed"
                          ? "checkmark"
                          : a.type === "learned_sign"
                          ? "book"
                          : "time"
                      }
                      size={20}
                      color="#3B82F6"
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.activityTitle}>
                      {renderActivityLabel(a)}
                    </Text>
                    <Text style={styles.activityTime}>
                      {a.created_at
                        ? new Date(a.created_at).toLocaleString()
                        : ""}
                    </Text>

                    {isExpanded && a.details && (
                      <View style={styles.activityDetails}>
                        <Text style={styles.activityDetailsText}>
                          {a.details}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.activityRight}>
                    {a.type === "test_completed" && a.details && (
                      <Text style={styles.activityScore}>
                        {a.details
                          .match(/Score:\s*(\d+)\/(\d+)/)?.[0]
                          .replace("Score: ", "") || ""}
                      </Text>
                    )}
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#C7C7CC"
                    />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFBEF" },
  centerContent: { justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F5E6D3",
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#2C2C2E" },

  scrollContent: { paddingBottom: 40 },

  overallCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#D4A574",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  progressRow: { flexDirection: "row", alignItems: "center" },
  circularProgress: { marginRight: 20 },

  progressCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    borderColor: "#10B981",
    backgroundColor: "#D1FAE5",
    justifyContent: "center",
    alignItems: "center",
  },
  progressPercentage: { fontSize: 26, fontWeight: "bold", color: "#10B981" },
  progressTextContainer: { flex: 1 },

  overallTitle: { fontSize: 20, fontWeight: "bold", color: "#2C2C2E" },
  overallSubtitle: { fontSize: 14, color: "#8E8E93", marginBottom: 12 },

  progressBar: {
    height: 8,
    backgroundColor: "#F2F2F7",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", backgroundColor: "#10B981" },

  statsSection: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2C2C2E",
    marginBottom: 12,
  },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 },

  statCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    margin: 6,
    shadowColor: "#D4A574",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },

  statCardLarge: { width: (width - 56) / 2 },
  statCardSmall: { width: (width - 68) / 3 },

  statIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statIconSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },

  statNumber: { fontSize: 22, fontWeight: "bold", color: "#2C2C2E" },
  statNumberSmall: { fontSize: 18, fontWeight: "bold", color: "#2C2C2E" },

  statLabel: { fontSize: 12, color: "#8E8E93", textAlign: "center" },
  statLabelSmall: { fontSize: 11, color: "#8E8E93", textAlign: "center" },

  badgesSection: { paddingHorizontal: 16, marginBottom: 16 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  badgesCount: { fontSize: 14, fontWeight: "600", color: "#10B981" },

  badgesGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 },

  badgeCard: {
    width: (width - 56) / 3,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    margin: 6,
    position: "relative",
    shadowColor: "#D4A574",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  badgeCardLocked: { opacity: 0.6 },

  badgeIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  badgeEmoji: { fontSize: 26 },
  badgeEmojiLocked: { opacity: 0.5 },

  badgeName: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    color: "#2C2C2E",
  },
  badgeNameLocked: { color: "#C7C7CC" },

  badgeDesc: { fontSize: 10, color: "#8E8E93", textAlign: "center" },
  badgeDescLocked: { color: "#C7C7CC" },

  activitySection: { paddingHorizontal: 16, marginBottom: 16 },
  activityList: { gap: 10 },

  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#D4A574",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },

  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  activityDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F2F2F7",
  },
  activityDetailsText: {
    fontSize: 13,
    color: "#8E8E93",
    lineHeight: 18,
  },
  activityTitle: { fontSize: 15, fontWeight: "600", color: "#2C2C2E" },
  activityTime: { fontSize: 12, color: "#C7C7CC" },
  activityScore: { fontSize: 16, fontWeight: "bold", color: "#10B981" },
});
