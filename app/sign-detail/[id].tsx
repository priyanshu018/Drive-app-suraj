import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";
import YoutubePlayer from "react-native-youtube-iframe";
import { supabase } from "../../lib/supabaseClient";

export default function SignDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [sign, setSign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [playing, setPlaying] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);

  useEffect(() => {
    fetchSign();
    checkIfFavorite();
  }, [id]);

  const fetchSign = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("traffic_signs")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        setSign({
          ...data,
          nameEnglish: data.name_english,
          nameHindi: data.name_hindi,
          hindiMeaning: data.hindi_meaning,
          realLifeExample: data.real_life_example,
        });
        await markSignLearned(data.id);
      }
    } catch (error) {
      console.error("Error fetching sign:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkIfFavorite = async () => {
    try {
      const favorites = await AsyncStorage.getItem("favoriteSignsV2");
      if (favorites) {
        const favArray = JSON.parse(favorites);
        setIsFavorite(favArray.includes(id));
      }
    } catch (error) {
      console.log("Error checking favorites:", error);
    }
  };

  const toggleFavorite = async () => {
    try {
      const favorites = await AsyncStorage.getItem("favoriteSignsV2");
      let favArray = favorites ? JSON.parse(favorites) : [];

      if (isFavorite) {
        favArray = favArray.filter((fav: string) => fav !== id);
      } else {
        favArray.push(id);
      }

      await AsyncStorage.setItem("favoriteSignsV2", JSON.stringify(favArray));
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.log("Error toggling favorite:", error);
    }
  };

  // ✅ FIXED: Simple approach - only save to user_activity
  const markSignLearned = async (signId: string) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return;

    await supabase.from("user_activity").insert({
      user_id: auth.user.id,
      type: "learned_sign",
      details: signId,
    });
  };

  const playPronunciation = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    Speech.speak(sign?.nameEnglish || "", {
      language: "en-IN",
      onDone: () => {
        Speech.speak(sign?.nameHindi || "", {
          language: "hi-IN",
        });
      },
    });
  };

  const getYouTubeId = (url: string | null) => {
    if (!url) return null;

    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
      /youtube\.com\/embed\/([^?&\s]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  };

  const handlePlayVideo = () => {
    setShowOverlay(false);
    setPlaying(true);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#2C2C2E" />
      </View>
    );
  }

  if (!sign) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#2C2C2E" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
          <Text style={styles.errorText}>Sign not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#2C2C2E" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={toggleFavorite}
          style={styles.favoriteButton}
        >
          <Ionicons
            name={isFavorite ? "heart" : "heart-outline"}
            size={24}
            color={isFavorite ? "#EF4444" : "#2C2C2E"}
          />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.iconSection}>
          <View
            style={[styles.iconCircle, { backgroundColor: sign.color + "20" }]}
          >
            {sign.icon_url ? (
              <Image
                source={{ uri: sign.icon_url }}
                style={styles.iconImage}
                resizeMode="contain"
              />
            ) : (
              <Ionicons name="image-outline" size={80} color="#C7C7CC" />
            )}
          </View>

          <View style={[styles.shapeBadge, { backgroundColor: sign.color }]}>
            <Text style={styles.shapeText}>{sign.shape}</Text>
          </View>
        </View>

        <View style={styles.namesSection}>
          <View style={styles.nameCard}>
            <Text style={styles.nameLabel}>English</Text>
            <Text style={styles.nameEnglish}>{sign.nameEnglish}</Text>
          </View>

          <View style={styles.nameCard}>
            <Text style={styles.nameLabel}>हिंदी (Hindi)</Text>
            <Text style={styles.nameHindi}>{sign.nameHindi}</Text>
          </View>

          <TouchableOpacity
            style={styles.pronounceButton}
            onPress={playPronunciation}
            activeOpacity={0.7}
          >
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <Ionicons name="volume-high" size={24} color="white" />
            </Animated.View>
            <Text style={styles.pronounceText}>Play Pronunciation</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle" size={20} color="#10B981" />
            <Text style={styles.sectionTitle}>Meaning</Text>
          </View>
          <View style={styles.meaningCard}>
            <Text style={styles.meaningLabel}>🇬🇧 English:</Text>
            <Text style={styles.meaningText}>{sign.meaning}</Text>
          </View>
          <View style={styles.meaningCard}>
            <Text style={styles.meaningLabel}>🇮🇳 Hindi:</Text>
            <Text style={styles.meaningText}>{sign.hindiMeaning}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bulb" size={20} color="#F59E0B" />
            <Text style={styles.sectionTitle}>What to Do?</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.explanationText}>{sign.explanation}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={20} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Where You'll See It</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.exampleText}>{sign.realLifeExample}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="film" size={20} color="#EF4444" />
            <Text style={styles.sectionTitle}>Video Explanation</Text>
          </View>

          {sign?.video_url ? (
            <View style={styles.videoWrapper}>
              <View style={styles.videoContainer}>
                <YoutubePlayer
                  height={220}
                  play={playing}
                  videoId={getYouTubeId(sign.video_url) || ""}
                  onChangeState={(state: string) => {
                    if (state === "ended") {
                      setPlaying(false);
                      setShowOverlay(true);
                    }
                    if (state === "playing") {
                      setShowOverlay(false);
                    }
                  }}
                  initialPlayerParams={{
                    modestbranding: true,
                    rel: false,
                    showClosedCaptions: false,
                  }}
                />
              </View>

              {showOverlay && (
                <TouchableOpacity
                  style={styles.videoOverlay}
                  onPress={handlePlayVideo}
                  activeOpacity={0.9}
                >
                  <View style={styles.playButtonContainer}>
                    <Ionicons name="play-circle" size={80} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.videoPlaceholder}>
              <Ionicons name="play-circle" size={64} color="#C7C7CC" />
              <Text style={styles.videoText}>No Video Available</Text>
              <Text style={styles.videoSubtext}>
                Admin hasn't added a video yet
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFBEF",
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F5E6D3",
  },
  backButton: {
    padding: 8,
  },
  favoriteButton: {
    padding: 8,
  },
  iconSection: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: "#FFFFFF",
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  iconImage: {
    width: 120,
    height: 120,
  },
  shapeBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  shapeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "white",
    letterSpacing: 1,
  },
  namesSection: {
    padding: 20,
  },
  nameCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#D4A574",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  nameLabel: {
    fontSize: 12,
    color: "#8E8E93",
    marginBottom: 4,
    fontWeight: "600",
  },
  nameEnglish: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2C2C2E",
  },
  nameHindi: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2C2C2E",
  },
  pronounceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2C2C2E",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: "#D4A574",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  pronounceText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFBEF",
    marginLeft: 8,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2C2C2E",
    marginLeft: 8,
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#D4A574",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  meaningCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#D4A574",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  meaningLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8E8E93",
    marginBottom: 6,
  },
  meaningText: {
    fontSize: 15,
    color: "#2C2C2E",
    lineHeight: 22,
  },
  explanationText: {
    fontSize: 15,
    color: "#2C2C2E",
    lineHeight: 24,
  },
  exampleText: {
    fontSize: 15,
    color: "#2C2C2E",
    lineHeight: 24,
  },
  videoWrapper: {
    position: "relative",
  },
  videoContainer: {
    backgroundColor: "#000",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#D4A574",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  videoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 1)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  playButtonContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  videoPlaceholder: {
    backgroundColor: "#FFFFFF",
    padding: 48,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#D4A574",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  videoText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#8E8E93",
    marginTop: 16,
  },
  videoSubtext: {
    fontSize: 14,
    color: "#C7C7CC",
    marginTop: 8,
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 18,
    color: "#8E8E93",
    marginTop: 16,
  },
});
