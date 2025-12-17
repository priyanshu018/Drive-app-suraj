import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Video, ResizeMode } from "expo-av";
import { supabase } from "../lib/supabaseClient";

interface Question {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  correct_answer: string;
  explanation?: string | null;
  media_type?: string | null;
  media_url?: string | null;
}

export default function TestMode() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<"A" | "B" | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // -------------------------------------------------------------
  // LOAD QUESTIONS FROM SUPABASE
  // -------------------------------------------------------------
  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    const { data, error } = await supabase.from("questions").select("*");

    if (error) {
      Alert.alert("Error", "Failed to load questions.");
      console.error("Error loading questions:", error);
      return;
    }

    if (!data || data.length < 10) {
      Alert.alert(
        "Not enough questions",
        "You need at least 10 questions in the database."
      );
      return;
    }

    // Shuffle and select 10 random questions
    const shuffled = data.sort(() => 0.5 - Math.random());
    const selected10 = shuffled.slice(0, 10);

    setQuestions(selected10);
    setLoading(false);
  };

  const saveTestResult = async (score: number) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.log("NO USER — cannot save");
      return;
    }

    try {
      // 1. Save to user_activity
      const { error: activityError } = await supabase
        .from("user_activity")
        .insert({
          user_id: user.id,
          type: "test_completed",
          details: `Score: ${score}/10`,
        });

      if (activityError) {
        console.error("Activity Error:", activityError);
        Alert.alert("Error saving activity", activityError.message);
        return;
      }

      // 2. Update user_progress in real-time
      const percentage = Math.round((score / questions.length) * 100);

      // Get current progress
      const { data: currentProgress } = await supabase
        .from("user_progress")
        .select("tests_completed, best_score")
        .eq("user_id", user.id)
        .single();

      const newTestsCompleted = (currentProgress?.tests_completed || 0) + 1;
      const newBestScore = Math.max(
        currentProgress?.best_score || 0,
        percentage
      );

      // Upsert progress
      const { error: progressError } = await supabase
        .from("user_progress")
        .upsert(
          {
            user_id: user.id,
            tests_completed: newTestsCompleted,
            best_score: newBestScore,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (progressError) {
        console.error("Progress Error:", progressError);
        console.log("Failed to update user_progress:", progressError.message);
      } else {
        console.log("✅ Progress updated in real-time!");
      }
    } catch (error) {
      console.error("Error in saveTestResult:", error);
    }
  };

  // -------------------------------------------------------------
  // TEST LOGIC
  // -------------------------------------------------------------
  const handleAnswerSelect = (answer: "A" | "B") => {
    if (!isAnswerSubmitted) {
      setSelectedAnswer(answer);
    }
  };

  const handleNextQuestion = () => {
    if (!selectedAnswer) {
      Alert.alert("Please select an answer.");
      return;
    }

    const currentQ = questions[currentQuestion];
    const isCorrect = selectedAnswer === currentQ.correct_answer;

    setAnswers([...answers, isCorrect]);
    setIsAnswerSubmitted(true);
    setShowFeedback(true);

    if (isCorrect) {
      setScore(score + 1);
    }

    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
        setIsAnswerSubmitted(false);
        setShowFeedback(false);
      } else {
        saveTestResult(score + (isCorrect ? 1 : 0));
        setShowResult(true);
      }
    }, 4000);
  };

  const restartTest = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setScore(0);
    setShowResult(false);
    setAnswers([]);
    setIsAnswerSubmitted(false);
    setShowFeedback(false);
    loadQuestions();
  };

  // -------------------------------------------------------------
  // UI RENDERING
  // -------------------------------------------------------------

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading questions...</Text>
      </View>
    );
  }

  if (showResult) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Test Results</Text>
          <View />
        </View>

        <ScrollView contentContainerStyle={styles.resultContainer}>
          <View style={styles.resultCard}>
            <Ionicons name="trophy" size={64} color="#4CAF50" />
            <Text style={styles.resultMessage}>Your Score</Text>
            <Text style={styles.resultScore}>
              {score} / {questions.length}
            </Text>
            <Text style={styles.resultPercentage}>{percentage}% Correct</Text>
          </View>

          <TouchableOpacity style={styles.retryButton} onPress={restartTest}>
            <Ionicons name="refresh" size={20} color="white" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => router.back()}
          >
            <Ionicons name="home" size={20} color="#2196F3" />
            <Text style={styles.homeButtonText}>Go Home</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // TO THIS:
  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  // Create options array with only A and B
  const options = [
    { letter: "A" as const, text: question.option_a },
    { letter: "B" as const, text: question.option_b },
  ];
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Practice Test</Text>
        <Text style={styles.scoreText}> </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          Question {currentQuestion + 1} of {questions.length}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.questionContainer}>
        {/* Question */}
        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{question.question}</Text>

          {/* Media Display */}
          {question.media_url && (
            <View style={styles.mediaContainer}>
              {question.media_type === "video" ? (
                <Video
                  source={{ uri: question.media_url }}
                  style={styles.videoPlayer}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay={false}
                />
              ) : (
                <Image
                  source={{ uri: question.media_url }}
                  style={styles.questionImage}
                  resizeMode="contain"
                />
              )}
            </View>
          )}
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {options.map((option) => {
            const isCorrect = option.letter === question.correct_answer;
            const isSelected = option.letter === selectedAnswer;

            const buttonStyle = [
              styles.optionButton,
              isSelected && !showFeedback && styles.optionButtonSelected,
              showFeedback && isCorrect && styles.optionButtonCorrect,
              showFeedback &&
                isSelected &&
                !isCorrect &&
                styles.optionButtonWrong,
            ];

            const circleStyle = [
              styles.optionCircle,
              isSelected && !showFeedback && styles.optionCircleSelected,
              showFeedback && isCorrect && styles.optionCircleCorrect,
              showFeedback &&
                isSelected &&
                !isCorrect &&
                styles.optionCircleWrong,
            ];

            return (
              <TouchableOpacity
                key={option.letter}
                style={buttonStyle}
                onPress={() => handleAnswerSelect(option.letter)}
                disabled={isAnswerSubmitted}
              >
                <View style={circleStyle}>
                  {showFeedback && isCorrect && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                  {showFeedback && isSelected && !isCorrect && (
                    <Ionicons name="close" size={16} color="white" />
                  )}
                </View>

                <Text style={styles.optionText}>{option.text}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {/* ✅ ADD EXPLANATION DISPLAY */}
        {showFeedback && question.explanation && (
          <View style={styles.explanationCard}>
            <View style={styles.explanationHeader}>
              <Ionicons name="information-circle" size={20} color="#3B82F6" />
              <Text style={styles.explanationTitle}>Explanation</Text>
            </View>
            <Text style={styles.explanationText}>{question.explanation}</Text>
          </View>
        )}
      </ScrollView>

      {/* Next button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          onPress={handleNextQuestion}
          style={[
            styles.nextButton,
            (!selectedAnswer || isAnswerSubmitted) && styles.nextButtonDisabled,
          ]}
          disabled={!selectedAnswer || isAnswerSubmitted}
        >
          <Text style={styles.nextButtonText}>
            {currentQuestion === questions.length - 1
              ? "Finish Test"
              : "Next Question"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFBEF",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFBEF",
  },
  loadingText: {
    fontSize: 16,
    color: "#8E8E93",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F5E6D3",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2C2C2E",
  },
  scoreText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3B82F6",
  },

  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#F2F2F7",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#10B981",
  },
  progressText: {
    textAlign: "center",
    color: "#8E8E93",
    marginTop: 8,
  },

  questionContainer: {
    padding: 20,
  },

  questionCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#D4A574",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  questionText: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    color: "#2C2C2E",
    marginBottom: 16,
  },

  // NEW: Media styles
  mediaContainer: {
    marginTop: 12,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F5F5F5",
  },
  questionImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  videoPlayer: {
    width: "100%",
    height: 200,
    backgroundColor: "#000",
  },

  optionsContainer: {
    gap: 12,
  },

  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#F5E6D3",
    shadowColor: "#D4A574",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  optionButtonSelected: {
    borderColor: "#3B82F6",
    backgroundColor: "#DBEAFE",
  },
  optionButtonCorrect: {
    borderColor: "#10B981",
    backgroundColor: "#D1FAE5",
  },
  optionButtonWrong: {
    borderColor: "#EF4444",
    backgroundColor: "#FEE2E2",
  },

  optionCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#C7C7CC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  optionCircleSelected: {
    borderColor: "#3B82F6",
  },
  optionCircleCorrect: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  optionCircleWrong: {
    backgroundColor: "#EF4444",
    borderColor: "#EF4444",
  },

  optionText: {
    flex: 1,
    fontSize: 15,
    color: "#2C2C2E",
    lineHeight: 22,
  },

  bottomContainer: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F5E6D3",
  },
  nextButton: {
    backgroundColor: "#3B82F6",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#D4A574",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  nextButtonDisabled: {
    backgroundColor: "#C7C7CC",
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  resultContainer: {
    padding: 20,
  },
  resultCard: {
    backgroundColor: "#FFFFFF",
    padding: 40,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#10B981",
    marginBottom: 20,
    shadowColor: "#D4A574",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  resultMessage: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    color: "#2C2C2E",
  },
  resultScore: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#2C2C2E",
  },
  resultPercentage: {
    fontSize: 16,
    color: "#8E8E93",
    marginTop: 8,
  },

  retryButton: {
    flexDirection: "row",
    justifyContent: "center",
    backgroundColor: "#3B82F6",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#D4A574",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },

  homeButton: {
    flexDirection: "row",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#3B82F6",
    backgroundColor: "#FFFFFF",
    shadowColor: "#D4A574",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  homeButtonText: {
    color: "#3B82F6",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },

  // ✅ ADD THESE EXPLANATION STYLES
  explanationCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#3B82F6",
    shadowColor: "#D4A574",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  explanationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3B82F6",
    marginLeft: 6,
  },
  explanationText: {
    fontSize: 14,
    color: "#2C2C2E",
    lineHeight: 20,
  },
});
