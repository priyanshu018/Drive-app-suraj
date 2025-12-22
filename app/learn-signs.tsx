import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabaseClient";

export interface TrafficSign {
  id: string;
  name_english: string;
  name_hindi: string;
  meaning: string;
  hindi_meaning: string;
  explanation: string;
  real_life_example: string;
  color: string;
  shape: string;
  video_url: string | null;
  icon_urls: string[];
  sort_order?: number;
}

export default function LearnSigns() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");

  const [signs, setSigns] = useState<TrafficSign[]>([]);
  const [loading, setLoading] = useState(true);

  const markSignLearned = async (signId: string) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return;

    const today = new Date().toISOString().split("T")[0];

    // Check if already logged today
    const { data: existing } = await supabase
      .from("user_activity")
      .select("*")
      .eq("user_id", auth.user.id)
      .eq("type", "learned_sign")
      .eq("details", signId)
      .gte("created_at", today + "T00:00:00")
      .lte("created_at", today + "T23:59:59")
      .single();

    // Only insert if not already logged today
    if (!existing) {
      await supabase.from("user_activity").insert({
        user_id: auth.user.id,
        type: "learned_sign",
        details: signId, // Just the sign ID, not "Viewed sign..."
      });
    }
  };

  // Load from Supabase on mount
  useEffect(() => {
    loadSigns();
  }, []);

  const loadSigns = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("traffic_signs")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching signs:", error);
    else
      setSigns(
        (data ?? []).map((s) => ({
          ...s,
          icon_urls: s.icon_urls ?? [],
        })) as TrafficSign[]
      );

    setLoading(false);
  };

  // Filtering logic
  const filteredSigns = signs.filter((sign) => {
    const matchesSearch =
      sign.name_english.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sign.name_hindi.includes(searchQuery) ||
      sign.meaning.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "mandatory":
        return "#2196F3";
      case "prohibition":
        return "#FF0000";
      case "warning":
        return "#FF9800";
      case "informatory":
        return "#4CAF50";
      default:
        return "#666";
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "mandatory":
        return "Mandatory";
      case "prohibition":
        return "Prohibited";
      case "warning":
        return "Warning";
      case "informatory":
        return "Info";
      default:
        return "";
    }
  };

  const renderSignCard = ({ item }: { item: TrafficSign }) => {
    const primaryImage = item.icon_urls?.[0] ?? null;
    const bgColor = item.color?.startsWith("#")
      ? item.color + "15"
      : "#00000010";

    return (
      <TouchableOpacity
        style={styles.signCard}
        onPress={async () => {
          await markSignLearned(item.id);
          router.push(`/sign-detail/${item.id}`);
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.signIconContainer, { backgroundColor: bgColor }]}>
          {primaryImage ? (
            <Image
              source={{ uri: primaryImage }}
              style={{ width: 48, height: 48 }}
              resizeMode="contain"
            />
          ) : (
            <Ionicons name="help-circle" size={48} color="#999" />
          )}
        </View>

        <Text style={styles.signNameEnglish} numberOfLines={1}>
          {item.name_english}
        </Text>

        <Text style={styles.signNameHindi} numberOfLines={1}>
          {item.name_hindi}
        </Text>

        <View
          style={[
            styles.categoryBadge,
            { backgroundColor: getCategoryColor(item.shape) },
          ]}
        >
          <Text style={styles.categoryText}>
            {getCategoryLabel(item.shape)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#FF9800" />
        <Text style={{ textAlign: "center", marginTop: 16, color: "#666" }}>
          Loading signs...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Learn Traffic Signs</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#999"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search signs..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Signs Grid */}
      <FlatList
        data={filteredSigns}
        renderItem={renderSignCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        initialNumToRender={12}
        windowSize={5}
        removeClippedSubviews
        contentContainerStyle={styles.gridContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No signs found</Text>
            <Text style={styles.emptySubtext}>
              Try a different search or filter
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: "#333",
  },
  categoryScroll: {
    marginTop: 16,
  },
  categoryContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "white",
    marginRight: 8,
    elevation: 1,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  categoryChipTextActive: {
    color: "white",
  },
  resultsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  resultsText: {
    fontSize: 14,
    color: "#666",
  },
  gridContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  signCard: {
    flex: 1,
    backgroundColor: "#F2EADF",
    borderRadius: 16,
    padding: 16,
    margin: 4,
    alignItems: "center",
    elevation: 2,
    minHeight: 180,
  },
  signIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  signNameEnglish: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 4,
  },
  signNameHindi: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "600",
    color: "white",
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
  },
});
