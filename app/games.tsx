import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Image,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getRandomSigns, TrafficSign } from "../lib/trafficSignService";
type GameMode = "menu" | "match" | "guess" | "speed" | "trueFalse" | "sequence";

interface MatchPair {
  id: string;
  iconUrl: string | null;
  meaning: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export default function Games() {
  const router = useRouter();
  const [gameMode, setGameMode] = useState<GameMode>("menu");
  const [loading, setLoading] = useState(false);

  // Match Game States
  const [matchPairs, setMatchPairs] = useState<MatchPair[]>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [matchScore, setMatchScore] = useState(0);

  // Guess Game States
  const [guessSign, setGuessSign] = useState<TrafficSign | null>(null);
  const [guessOptions, setGuessOptions] = useState<string[]>([]);
  const [guessScore, setGuessScore] = useState(0);
  const [guessRound, setGuessRound] = useState(0);

  // Speed Challenge States
  const [speedSign, setSpeedSign] = useState<TrafficSign | null>(null);
  const [speedOptions, setSpeedOptions] = useState<string[]>([]);
  const [speedScore, setSpeedScore] = useState(0);
  const [speedRound, setSpeedRound] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [speedGameActive, setSpeedGameActive] = useState(false);

  // True/False Game States
  const [tfSign, setTfSign] = useState<TrafficSign | null>(null);
  const [tfDescription, setTfDescription] = useState("");
  const [tfIsCorrect, setTfIsCorrect] = useState(true);
  const [tfScore, setTfScore] = useState(0);
  const [tfRound, setTfRound] = useState(0);

  // Sequence Game States
  const [sequenceToShow, setSequenceToShow] = useState<TrafficSign[]>([]);
  const [sequenceUserInput, setSequenceUserInput] = useState<TrafficSign[]>([]);
  const [sequenceOptions, setSequenceOptions] = useState<TrafficSign[]>([]);
  const [sequenceLevel, setSequenceLevel] = useState(1);
  const [sequenceScore, setSequenceScore] = useState(0);
  const [showingSequence, setShowingSequence] = useState(false);
  const [currentSequenceIndex, setCurrentSequenceIndex] = useState(0);
  const [sequencePhase, setSequencePhase] = useState<"show" | "input">("show");

  // Animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Timer for Speed Challenge
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (speedGameActive && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (speedGameActive && timeLeft === 0) {
      handleSpeedTimeout();
    }
    return () => clearTimeout(timer);
  }, [timeLeft, speedGameActive]);

  // Pulse animation for Speed Challenge timer
  useEffect(() => {
    if (speedGameActive && timeLeft <= 5) {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [timeLeft, speedGameActive]);

  const getFeedback = (score: number, total: number): string => {
    const percentage = (score / total) * 100;
    if (percentage === 100) return "Perfect! Outstanding! 🌟";
    if (percentage >= 80) return "Excellent work! 🎉";
    if (percentage >= 60) return "Good job! Keep practicing! 👍";
    if (percentage >= 40) return "Not bad! You can do better! 💪";
    return "Keep learning! Practice makes perfect! 📚";
  };

  // ==================== MATCH GAME ====================
  const startMatchGame = async () => {
    setLoading(true);
    try {
      const signs = await getRandomSigns(6);

      if (signs.length < 6) {
        Alert.alert("Error", "Not enough signs available in the database.");
        setLoading(false);
        return;
      }

      const pairs: MatchPair[] = [];

      signs.forEach((sign) => {
        pairs.push({
          id: `${sign.id}-icon`,
          iconUrl: sign.icon_url,
          meaning: "",
          isFlipped: false,
          isMatched: false,
        });
        pairs.push({
          id: `${sign.id}-meaning`,
          iconUrl: null,
          meaning: sign.name_english,
          isFlipped: false,
          isMatched: false,
        });
      });

      const shuffled = pairs.sort(() => Math.random() - 0.5);
      setMatchPairs(shuffled);
      setSelectedCards([]);
      setMoves(0);
      setMatches(0);
      setMatchScore(0);
      setGameMode("match");
    } catch (error) {
      Alert.alert("Error", "Failed to load game. Please try again.");
      console.error(error);
    }
    setLoading(false);
  };

  const handleCardPress = (index: number) => {
    if (
      selectedCards.length >= 2 ||
      matchPairs[index].isFlipped ||
      matchPairs[index].isMatched
    ) {
      return;
    }

    const newPairs = [...matchPairs];
    newPairs[index].isFlipped = true;
    setMatchPairs(newPairs);

    const newSelected = [...selectedCards, index];
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      setMoves(moves + 1);
      checkMatch(newSelected[0], newSelected[1]);
    }
  };

  const checkMatch = (index1: number, index2: number) => {
    const card1 = matchPairs[index1];
    const card2 = matchPairs[index2];

    const id1 = card1.id.split("-")[0];
    const id2 = card2.id.split("-")[0];

    setTimeout(() => {
      const newPairs = [...matchPairs];

      if (id1 === id2) {
        newPairs[index1].isMatched = true;
        newPairs[index2].isMatched = true;
        setMatches(matches + 1);
        setMatchScore(matchScore + 10);

        if (matches + 1 === 6) {
          setTimeout(() => {
            Alert.alert(
              "🎉 Congratulations!",
              `You completed the game in ${moves + 1} moves!\nScore: ${
                matchScore + 10
              } points\n${getFeedback(6, 6)}`,
              [
                { text: "Play Again", onPress: startMatchGame },
                { text: "Main Menu", onPress: () => setGameMode("menu") },
              ]
            );
          }, 500);
        }
      } else {
        newPairs[index1].isFlipped = false;
        newPairs[index2].isFlipped = false;
      }

      setMatchPairs(newPairs);
      setSelectedCards([]);
    }, 1000);
  };

  // ==================== GUESS GAME ====================
  const startGuessGame = async () => {
    setLoading(true);
    setGuessScore(0);
    setGuessRound(0);
    await loadNextGuessRound();
    setGameMode("guess");
    setLoading(false);
  };

  const loadNextGuessRound = async () => {
    try {
      const signs = await getRandomSigns(4);

      if (signs.length < 4) {
        Alert.alert("Error", "Not enough signs available.");
        return;
      }

      const correctSign = signs[0];
      const options = signs
        .map((s) => s.name_english)
        .sort(() => Math.random() - 0.5);

      setGuessSign(correctSign);
      setGuessOptions(options);
    } catch (error) {
      console.error("Error loading guess round:", error);
    }
  };

  const handleGuess = (answer: string) => {
    if (!guessSign) return;

    const isCorrect = answer === guessSign.name_english;

    if (isCorrect) {
      setGuessScore(guessScore + 1);
      Alert.alert("✅ Correct!", `That's ${guessSign.name_english}!`, [
        { text: "Next", onPress: nextGuessRound },
      ]);
    } else {
      Alert.alert(
        "❌ Wrong!",
        `The correct answer is: ${guessSign.name_english}`,
        [{ text: "Next", onPress: nextGuessRound }]
      );
    }
  };

  const nextGuessRound = async () => {
    if (guessRound + 1 >= 10) {
      Alert.alert(
        "🎮 Game Over!",
        `Your score: ${guessScore}/10\n${getFeedback(guessScore, 10)}`,
        [
          { text: "Play Again", onPress: startGuessGame },
          { text: "Main Menu", onPress: () => setGameMode("menu") },
        ]
      );
      return;
    }

    setGuessRound(guessRound + 1);
    await loadNextGuessRound();
  };

  // ==================== SPEED CHALLENGE ====================
  const startSpeedGame = async () => {
    setLoading(true);
    setSpeedScore(0);
    setSpeedRound(0);
    setSpeedGameActive(true);
    await loadNextSpeedRound();
    setGameMode("speed");
    setLoading(false);
  };

  const loadNextSpeedRound = async () => {
    try {
      const signs = await getRandomSigns(4);

      if (signs.length < 4) {
        Alert.alert("Error", "Not enough signs available.");
        return;
      }

      const correctSign = signs[0];
      const options = signs
        .map((s) => s.name_english)
        .sort(() => Math.random() - 0.5);

      setSpeedSign(correctSign);
      setSpeedOptions(options);
      setTimeLeft(15);
    } catch (error) {
      console.error("Error loading speed round:", error);
    }
  };

  const handleSpeedAnswer = async (answer: string) => {
    if (!speedSign) return;

    const isCorrect = answer === speedSign.name_english;

    if (isCorrect) {
      setSpeedScore(speedScore + 1);
    }

    if (speedRound + 1 >= 10) {
      setSpeedGameActive(false);
      const finalScore = speedScore + (isCorrect ? 1 : 0);
      Alert.alert(
        "⚡ Speed Challenge Complete!",
        `Your score: ${finalScore}/10\n${getFeedback(finalScore, 10)}`,
        [
          { text: "Play Again", onPress: startSpeedGame },
          { text: "Main Menu", onPress: () => setGameMode("menu") },
        ]
      );
      return;
    }

    setSpeedRound(speedRound + 1);
    await loadNextSpeedRound();
  };

  const handleSpeedTimeout = () => {
    setSpeedGameActive(false);
    Alert.alert(
      "⏰ Time's Up!",
      `Your score: ${speedScore}/10\n${getFeedback(speedScore, 10)}`,
      [
        { text: "Play Again", onPress: startSpeedGame },
        { text: "Main Menu", onPress: () => setGameMode("menu") },
      ]
    );
  };

  // ==================== TRUE/FALSE GAME ====================
  const startTrueFalseGame = async () => {
    setLoading(true);
    setTfScore(0);
    setTfRound(0);
    await loadNextTrueFalseRound();
    setGameMode("trueFalse");
    setLoading(false);
  };

  const loadNextTrueFalseRound = async () => {
    try {
      const signs = await getRandomSigns(2);

      if (signs.length < 2) {
        Alert.alert("Error", "Not enough signs available.");
        return;
      }

      const correctSign = signs[0];
      const wrongSign = signs[1];

      // Randomly decide if we show correct or incorrect description
      const showCorrect = Math.random() > 0.5;

      setTfSign(correctSign);
      setTfDescription(
        showCorrect ? correctSign.name_english : wrongSign.name_english
      );
      setTfIsCorrect(showCorrect);
    } catch (error) {
      console.error("Error loading true/false round:", error);
    }
  };

  const handleTrueFalseAnswer = async (answer: boolean) => {
    const isCorrect = answer === tfIsCorrect;

    if (isCorrect) {
      setTfScore(tfScore + 1);
      Alert.alert("✅ Correct!", "Well done!", [
        { text: "Next", onPress: nextTrueFalseRound },
      ]);
    } else {
      Alert.alert(
        "❌ Wrong!",
        tfIsCorrect
          ? "The description was correct!"
          : "The description was incorrect!",
        [{ text: "Next", onPress: nextTrueFalseRound }]
      );
    }
  };

  const nextTrueFalseRound = async () => {
    if (tfRound + 1 >= 10) {
      Alert.alert(
        "🎯 Game Over!",
        `Your score: ${tfScore}/10\n${getFeedback(tfScore, 10)}`,
        [
          { text: "Play Again", onPress: startTrueFalseGame },
          { text: "Main Menu", onPress: () => setGameMode("menu") },
        ]
      );
      return;
    }

    setTfRound(tfRound + 1);
    await loadNextTrueFalseRound();
  };

  // ==================== SEQUENCE GAME ====================
  const startSequenceGame = async () => {
    setLoading(true);
    setSequenceScore(0);
    setSequenceLevel(1);
    await loadNextSequenceLevel();
    setLoading(false);
  };

  const loadNextSequenceLevel = async () => {
    try {
      const sequenceLength = Math.min(2 + sequenceLevel, 6); // Start at 3, max 6
      const totalSigns = sequenceLength + 2; // Extra signs for options

      const signs = await getRandomSigns(totalSigns);

      if (signs.length < totalSigns) {
        Alert.alert("Error", "Not enough signs available.");
        return;
      }

      const sequence = signs.slice(0, sequenceLength);
      const allOptions = signs.slice(0, totalSigns);

      setSequenceToShow(sequence);
      setSequenceOptions(allOptions.sort(() => Math.random() - 0.5));
      setSequenceUserInput([]);
      setCurrentSequenceIndex(0);
      setSequencePhase("show");
      setShowingSequence(true);
      setGameMode("sequence");

      // Show sequence one by one
      showSequenceAnimation(sequence);
    } catch (error) {
      console.error("Error loading sequence level:", error);
    }
  };

  const showSequenceAnimation = (sequence: TrafficSign[]) => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < sequence.length) {
        setCurrentSequenceIndex(index);
        index++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setShowingSequence(false);
          setSequencePhase("input");
        }, 500);
      }
    }, 1500); // Show each sign for 1.5 seconds
  };

  const handleSequenceSignPress = (sign: TrafficSign) => {
    if (sequencePhase !== "input") return;

    const newInput = [...sequenceUserInput, sign];
    setSequenceUserInput(newInput);

    // Check if current selection is correct
    const currentIndex = newInput.length - 1;
    if (sign.id !== sequenceToShow[currentIndex].id) {
      // Wrong answer
      Alert.alert(
        "❌ Wrong Sequence!",
        `The correct sequence was: ${sequenceToShow
          .map((s) => s.name_english)
          .join(" → ")}`,
        [
          { text: "Try Again", onPress: loadNextSequenceLevel },
          { text: "Main Menu", onPress: () => setGameMode("menu") },
        ]
      );
      return;
    }

    // Check if sequence is complete
    if (newInput.length === sequenceToShow.length) {
      setSequenceScore(sequenceScore + sequenceLevel * 10);
      Alert.alert(
        "✅ Correct Sequence!",
        `Level ${sequenceLevel} complete! +${sequenceLevel * 10} points`,
        [
          {
            text: "Next Level",
            onPress: () => {
              setSequenceLevel(sequenceLevel + 1);
              loadNextSequenceLevel();
            },
          },
          { text: "Main Menu", onPress: () => setGameMode("menu") },
        ]
      );
    }
  };

  // ==================== RENDER FUNCTIONS ====================
  const renderSignIcon = (iconUrl: string | null, size: number = 60) => {
    if (!iconUrl) {
      return <Ionicons name="help-circle" size={size} color="#999" />;
    }

    return (
      <Image
        source={{ uri: iconUrl }}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    );
  };

  // ==================== LOADING STATE ====================
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FF9800" />
        <Text style={styles.loadingText}>Loading game...</Text>
      </View>
    );
  }

  // ==================== MATCH GAME UI ====================
  if (gameMode === "match") {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setGameMode("menu")}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Match the Signs</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.gameStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Moves</Text>
            <Text style={styles.statValue}>{moves}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Matches</Text>
            <Text style={styles.statValue}>{matches}/6</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Score</Text>
            <Text style={styles.statValue}>{matchScore}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.matchGrid}>
          {matchPairs.map((pair, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.matchCard,
                pair.isFlipped && styles.matchCardFlipped,
                pair.isMatched && styles.matchCardMatched,
              ]}
              onPress={() => handleCardPress(index)}
              activeOpacity={0.8}
              disabled={pair.isFlipped || pair.isMatched}
            >
              {pair.isFlipped || pair.isMatched ? (
                pair.iconUrl ? (
                  renderSignIcon(pair.iconUrl, 40)
                ) : (
                  <Text style={styles.matchCardText} numberOfLines={2}>
                    {pair.meaning}
                  </Text>
                )
              ) : (
                <Ionicons name="help" size={32} color="#fff" />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  // ==================== GUESS GAME UI ====================
  if (gameMode === "guess") {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setGameMode("menu")}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Guess the Sign</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.gameStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Round</Text>
            <Text style={styles.statValue}>{guessRound + 1}/10</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Score</Text>
            <Text style={styles.statValue}>{guessScore}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.guessContainer}>
          {guessSign && (
            <>
              <View style={styles.guessSignContainer}>
                <View style={styles.guessSignCircle}>
                  {renderSignIcon(guessSign.icon_url, 80)}
                </View>
                <Text style={styles.guessQuestion}>What is this sign?</Text>
              </View>

              <View style={styles.guessOptions}>
                {guessOptions.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.guessButton}
                    onPress={() => handleGuess(option)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.guessButtonText}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  // ==================== SPEED CHALLENGE UI ====================
  if (gameMode === "speed") {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              setSpeedGameActive(false);
              setGameMode("menu");
            }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Speed Challenge</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.gameStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Round</Text>
            <Text style={styles.statValue}>{speedRound + 1}/10</Text>
          </View>
          <View style={styles.statItem}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Text
                style={[
                  styles.statLabel,
                  timeLeft <= 5 && { color: "#f44336" },
                ]}
              >
                Time
              </Text>
              <Text
                style={[
                  styles.statValue,
                  timeLeft <= 5 && { color: "#f44336" },
                ]}
              >
                {timeLeft}s
              </Text>
            </Animated.View>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Score</Text>
            <Text style={styles.statValue}>{speedScore}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.guessContainer}>
          {speedSign && (
            <>
              <View style={styles.guessSignContainer}>
                <View style={styles.speedSignCircle}>
                  {renderSignIcon(speedSign.icon_url, 80)}
                </View>
                <Text style={styles.guessQuestion}>Quick! What is this?</Text>
              </View>

              <View style={styles.guessOptions}>
                {speedOptions.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.speedButton}
                    onPress={() => handleSpeedAnswer(option)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.guessButtonText}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  // ==================== TRUE/FALSE GAME UI ====================
  if (gameMode === "trueFalse") {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setGameMode("menu")}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>True or False</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.gameStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Round</Text>
            <Text style={styles.statValue}>{tfRound + 1}/10</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Score</Text>
            <Text style={styles.statValue}>{tfScore}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.tfContainer}>
          {tfSign && (
            <>
              <View style={styles.tfSignContainer}>
                <View style={styles.tfSignCircle}>
                  {renderSignIcon(tfSign.icon_url, 100)}
                </View>
                <Text style={styles.tfQuestion}>Is this sign:</Text>
                <Text style={styles.tfDescription}>{tfDescription}?</Text>
              </View>

              <View style={styles.tfButtons}>
                <TouchableOpacity
                  style={[styles.tfButton, styles.tfButtonTrue]}
                  onPress={() => handleTrueFalseAnswer(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-circle" size={40} color="#fff" />
                  <Text style={styles.tfButtonText}>TRUE</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tfButton, styles.tfButtonFalse]}
                  onPress={() => handleTrueFalseAnswer(false)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close-circle" size={40} color="#fff" />
                  <Text style={styles.tfButtonText}>FALSE</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  // ==================== SEQUENCE GAME UI ====================
  if (gameMode === "sequence") {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setGameMode("menu")}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sign Sequence</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.gameStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Level</Text>
            <Text style={styles.statValue}>{sequenceLevel}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Score</Text>
            <Text style={styles.statValue}>{sequenceScore}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.sequenceContainer}>
          {showingSequence ? (
            <View style={styles.sequenceShowContainer}>
              <Text style={styles.sequenceInstruction}>
                Watch the sequence carefully!
              </Text>
              <View style={styles.sequenceSignDisplay}>
                {renderSignIcon(
                  sequenceToShow[currentSequenceIndex]?.icon_url,
                  120
                )}
              </View>
              <Text style={styles.sequenceCounter}>
                {currentSequenceIndex + 1} / {sequenceToShow.length}
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.sequenceInputHeader}>
                <Text style={styles.sequenceInstruction}>
                  Tap the signs in order!
                </Text>
                <View style={styles.sequenceProgress}>
                  {sequenceToShow.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.sequenceProgressDot,
                        index < sequenceUserInput.length &&
                          styles.sequenceProgressDotFilled,
                      ]}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.sequenceUserInputDisplay}>
                {sequenceUserInput.map((sign, index) => (
                  <View key={index} style={styles.sequenceUserSign}>
                    {renderSignIcon(sign.icon_url, 40)}
                  </View>
                ))}
              </View>

              <View style={styles.sequenceOptionsGrid}>
                {sequenceOptions.map((sign, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.sequenceOption}
                    onPress={() => handleSequenceSignPress(sign)}
                    activeOpacity={0.7}
                  >
                    {renderSignIcon(sign.icon_url, 50)}
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  // ==================== MAIN MENU UI ====================
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fun Games</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.menuContainer}>
        <View style={styles.menuHeader}>
          <Ionicons name="game-controller" size={64} color="#FF9800" />
          <Text style={styles.menuTitle}>Learn Through Play!</Text>
          <Text style={styles.menuSubtitle}>
            Choose a game and start learning traffic signs
          </Text>
        </View>

        <View style={styles.gameCards}>
          <TouchableOpacity
            style={styles.gameCard}
            onPress={startMatchGame}
            activeOpacity={0.8}
          >
            <View style={[styles.gameCardIcon, { backgroundColor: "#E3F2FD" }]}>
              <Ionicons name="grid" size={40} color="#2196F3" />
            </View>
            <Text style={styles.gameCardTitle}>Match the Signs</Text>
            <Text style={styles.gameCardDesc}>
              Match traffic signs with their meanings
            </Text>
            <View style={styles.gameCardFooter}>
              <Ionicons name="people" size={16} color="#666" />
              <Text style={styles.gameCardFooterText}>Memory Game</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gameCard}
            onPress={startGuessGame}
            activeOpacity={0.8}
          >
            <View style={[styles.gameCardIcon, { backgroundColor: "#FFF3E0" }]}>
              <Ionicons name="help-circle" size={40} color="#FF9800" />
            </View>
            <Text style={styles.gameCardTitle}>Guess the Sign</Text>
            <Text style={styles.gameCardDesc}>
              Identify signs quickly and score points
            </Text>
            <View style={styles.gameCardFooter}>
              <Ionicons name="flash" size={16} color="#666" />
              <Text style={styles.gameCardFooterText}>Quick Quiz</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gameCard}
            onPress={startSpeedGame}
            activeOpacity={0.8}
          >
            <View style={[styles.gameCardIcon, { backgroundColor: "#FFEBEE" }]}>
              <Ionicons name="flash" size={40} color="#f44336" />
            </View>
            <Text style={styles.gameCardTitle}>Speed Challenge</Text>
            <Text style={styles.gameCardDesc}>
              Race against time! 15 seconds per sign
            </Text>
            <View style={styles.gameCardFooter}>
              <Ionicons name="time" size={16} color="#666" />
              <Text style={styles.gameCardFooterText}>Timed Mode</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gameCard}
            onPress={startTrueFalseGame}
            activeOpacity={0.8}
          >
            <View style={[styles.gameCardIcon, { backgroundColor: "#E8F5E9" }]}>
              <Ionicons
                name="checkmark-done-circle"
                size={40}
                color="#4CAF50"
              />
            </View>
            <Text style={styles.gameCardTitle}>True or False</Text>
            <Text style={styles.gameCardDesc}>
              Quick decisions! Is the description correct?
            </Text>
            <View style={styles.gameCardFooter}>
              <Ionicons name="flash" size={16} color="#666" />
              <Text style={styles.gameCardFooterText}>Quick Fire</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gameCard}
            onPress={startSequenceGame}
            activeOpacity={0.8}
          >
            <View style={[styles.gameCardIcon, { backgroundColor: "#F3E5F5" }]}>
              <Ionicons name="repeat" size={40} color="#9C27B0" />
            </View>
            <Text style={styles.gameCardTitle}>Sign Sequence</Text>
            <Text style={styles.gameCardDesc}>
              Watch and repeat the sequence of signs
            </Text>
            <View style={styles.gameCardFooter}>
              <Ionicons name="eye" size={16} color="#666" />
              <Text style={styles.gameCardFooterText}>Memory Test</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFBEF", // Warm off-white background
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#8E8E93", // Medium gray
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F5E6D3", // Warm beige border
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2C2C2E", // Dark gray
  },
  menuContainer: {
    padding: 20,
  },
  menuHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  menuTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2C2C2E",
    marginTop: 16,
  },
  menuSubtitle: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    marginTop: 8,
  },
  gameCards: {
    gap: 16,
  },
  gameCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#D4A574", // Light brown shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  gameCardIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  gameCardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2C2C2E",
    textAlign: "center",
    marginBottom: 8,
  },
  gameCardDesc: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  gameCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F5E6D3",
  },
  gameCardFooterText: {
    fontSize: 13,
    color: "#8E8E93",
    marginLeft: 6,
    fontWeight: "500",
  },
  gameStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5E6D3",
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    color: "#8E8E93",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2C2C2E",
  },
  matchGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    justifyContent: "center",
  },
  matchCard: {
    width: "30%",
    aspectRatio: 1,
    margin: "1.5%",
    backgroundColor: "#3B82F6", // Blue
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#D4A574",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  matchCardFlipped: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#3B82F6",
  },
  matchCardMatched: {
    backgroundColor: "#10B981", // Green
    borderColor: "#10B981",
  },
  matchCardText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2C2C2E",
    textAlign: "center",
    paddingHorizontal: 4,
  },
  guessContainer: {
    padding: 20,
    alignItems: "center",
  },
  guessSignContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  guessSignCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#DBEAFE", // Light blue
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#D4A574",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  speedSignCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#FEE2E2", // Light red
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#D4A574",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  guessQuestion: {
    fontSize: 20,
    fontWeight: "600",
    color: "#2C2C2E",
  },
  guessOptions: {
    width: "100%",
    gap: 12,
  },
  guessButton: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#F5E6D3",
    shadowColor: "#D4A574",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  speedButton: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#EF4444", // Red
    shadowColor: "#D4A574",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  guessButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C2C2E",
    textAlign: "center",
  },
  tfContainer: {
    padding: 20,
    alignItems: "center",
  },
  tfSignContainer: {
    alignItems: "center",
    marginBottom: 60,
  },
  tfSignCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#F3E8FF", // Light purple
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
    shadowColor: "#D4A574",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tfQuestion: {
    fontSize: 18,
    fontWeight: "500",
    color: "#8E8E93",
    marginBottom: 12,
  },
  tfDescription: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2C2C2E",
    textAlign: "center",
  },
  tfButtons: {
    flexDirection: "row",
    gap: 16,
    width: "100%",
  },
  tfButton: {
    flex: 1,
    paddingVertical: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#D4A574",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tfButtonTrue: {
    backgroundColor: "#10B981", // Green
  },
  tfButtonFalse: {
    backgroundColor: "#EF4444", // Red
  },
  tfButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 8,
  },
  sequenceContainer: {
    padding: 20,
    alignItems: "center",
  },
  sequenceShowContainer: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 400,
  },
  sequenceInstruction: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2C2C2E",
    marginBottom: 32,
    textAlign: "center",
  },
  sequenceSignDisplay: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#F3E8FF", // Light purple
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#D4A574",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sequenceCounter: {
    fontSize: 16,
    fontWeight: "500",
    color: "#8E8E93",
  },
  sequenceInputHeader: {
    alignItems: "center",
    marginBottom: 24,
    width: "100%",
  },
  sequenceProgress: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  sequenceProgressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#F2F2F7", // Light gray
  },
  sequenceProgressDotFilled: {
    backgroundColor: "#A855F7", // Purple
  },
  sequenceUserInputDisplay: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 32,
    minHeight: 60,
    justifyContent: "center",
  },
  sequenceUserSign: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: "#D1FAE5", // Light green
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#10B981", // Green
  },
  sequenceOptionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
    width: "100%",
  },
  sequenceOption: {
    width: "30%",
    aspectRatio: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#D4A574",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 2,
    borderColor: "#F5E6D3",
  },
});
