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
interface Category {
  id: string;
  name: string;
}

export default function TestMode() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<"A" | "B" | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name")
      .order("name");

    if (!error) setCategories(data || []);
  };

  const loadQuestions = async (categoryId: string) => {
    setLoading(true);

    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .eq("category_id", categoryId);

    if (!data || error) {
      Alert.alert("No questions in this category");
      setLoading(false);
      return;
    }

    setQuestions(data.sort(() => 0.5 - Math.random()));
    setLoading(false);
  };

  const saveTestResult = async (finalScore: number, totalAnswered: number) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.log("NO USER — cannot save");
      return;
    }

    try {
      const percentage =
        totalAnswered > 0 ? Math.round((finalScore / totalAnswered) * 100) : 0;

      // 1. Save to user_activity
      const { error: activityError } = await supabase
        .from("user_activity")
        .insert({
          user_id: user.id,
          type: "test_completed",
          details: `Score: ${finalScore}/${totalAnswered} out of ${questions.length} total questions (${percentage}%)`,
        });

      if (activityError) {
        console.error("Activity Error:", activityError);
        Alert.alert("Error saving activity", activityError.message);
        return;
      }

      // 2. Update user_progress
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
      } else {
        console.log("✅ Progress updated!");
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
    setQuestionsAnswered(questionsAnswered + 1);
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
        // Reached last question
        saveTestResult(score + (isCorrect ? 1 : 0), questionsAnswered + 1);
        setShowResult(true);
      }
    }, 4000);
  };
  const handleFinishEarly = () => {
    Alert.alert(
      "Finish Test",
      `You've answered ${questionsAnswered} out of ${questions.length} questions. Do you want to finish now?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Finish",
          onPress: () => {
            saveTestResult(score, questionsAnswered);
            setShowResult(true);
          },
        },
      ]
    );
  };

  const restartTest = () => {
    setSelectedCategory(null);
    setQuestions([]);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setScore(0);
    setShowResult(false);
    setAnswers([]);
    setIsAnswerSubmitted(false);
    setShowFeedback(false);
    setQuestionsAnswered(0);
  };

  if (!selectedCategory) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <View style={{ alignItems: "center", flex: 1 }}>
            <Text style={styles.headerTitle}>Select Category</Text>
            <Text style={{ fontSize: 14, color: "#8E8E93", marginTop: 4 }}>
              Choose a topic to start your test
            </Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={{
            padding: 20,
            flexGrow: 1,
            justifyContent: "center",
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.categoryGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.categoryCard}
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedCategory(cat);
                  loadQuestions(cat.id);
                }}
              >
                <Text style={styles.categoryIcon}>📚</Text>
                <Text style={styles.categoryName}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

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
          <Text style={styles.headerTitle}>
            {selectedCategory?.name} Results
          </Text>

          <View />
        </View>

        <ScrollView contentContainerStyle={styles.resultContainer}>
          <View style={styles.resultCard}>
            <Ionicons name="trophy" size={64} color="#4CAF50" />
            <Text style={styles.resultMessage}>Test Completed!</Text>

            <View style={styles.resultStatsContainer}>
              <View style={styles.resultStat}>
                <Text style={styles.resultStatLabel}>Total Questions</Text>
                <Text style={styles.resultStatValue}>{questions.length}</Text>
              </View>

              <View style={styles.resultStat}>
                <Text style={styles.resultStatLabel}>Questions Answered</Text>
                <Text style={styles.resultStatValue}>{questionsAnswered}</Text>
              </View>

              <View style={styles.resultStat}>
                <Text style={styles.resultStatLabel}>Your Score</Text>
                <Text style={styles.resultScore}>
                  {score} / {Math.ceil(questionsAnswered / 10) * 10}
                </Text>
              </View>
            </View>
            <Text style={styles.resultPercentage}>
              {questionsAnswered > 0
                ? Math.round(
                    (score / (Math.ceil(questionsAnswered / 10) * 10)) * 100
                  )
                : 0}
              % Correct
            </Text>
          </View>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              saveTestResult(score, questionsAnswered);
              restartTest();
            }}
          >
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
  if (questions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>No questions available</Text>
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
        <Text style={styles.headerTitle}>{selectedCategory.name}</Text>

        <View />
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
        <View style={styles.buttonRow}>
          {questionsAnswered > 0 && (
            <TouchableOpacity
              onPress={handleFinishEarly}
              style={styles.finishButton}
            >
              <Text style={styles.finishButtonText}>Finish Test</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleNextQuestion}
            style={[
              styles.nextButton,
              { flex: questionsAnswered > 0 ? 1 : undefined },
              (!selectedAnswer || isAnswerSubmitted) &&
                styles.nextButtonDisabled,
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
  resultStatsContainer: {
    width: "100%",
    marginTop: 24,
    gap: 16,
  },
  resultStat: {
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5E6D3",
  },
  resultStatLabel: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 4,
  },
  resultStatValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2C2C2E",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  finishButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#3B82F6",
  },
  finishButtonText: {
    color: "#3B82F6",
    fontSize: 16,
    fontWeight: "600",
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
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center", // Changed from "space-between" to "center"
    alignItems: "center",
  },
  categoryCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#dfda61ff",
    alignItems: "center",
    minHeight: 120,
    justifyContent: "center",
    shadowColor: "#D4A574",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C2C2E",
    textAlign: "center",
  },
});
