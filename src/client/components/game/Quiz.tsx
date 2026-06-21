'use client';

import type { Question } from '@/shared/types/index';
import { useState, useCallback, memo, useEffect, useRef, lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { LoadingSpinner } from '@/client/components/common/LoadingSpinner';
import { useAuth } from '@/client/hooks/use-auth';

// Dynamically import `QuestionCard` to prevent SSR.
const DynamicQuestionCard = lazy(() => 
  import('@/client/components/game/QuestionCard').then(mod => ({ default: mod.QuestionCard }))
);

// Props for Quiz.
type QuizProps = {
  // Unique quiz ID for state persistence.
  quizId: string | null;
  // Array of quiz questions.
  initialQuestions: Question[];
  // Callback on quiz finish.
  onFinish: (score: number, results: boolean[]) => void;
  // Word display component.
  wordDisplay: ReactNode;
  // Game mode toggle component.
  gameModeToggleSwitch: ReactNode;
  // Dark mode toggle component.
  darkModeToggleSwitch: ReactNode;
  // Callback on first answer.
  onFirstAnswer?: () => void;
};

// Game state for session storage.
type GameState = {
  currentQuestionIndex: number;
  score: number;
  selectedAnswer: string | null;
  answerStatus: 'correct' | 'incorrect' | null;
  questionResults: boolean[];
};

// Manages quiz state, flow, and scoring.
const Quiz = memo<QuizProps>(({ 
  quizId, 
  initialQuestions, 
  onFinish, 
  wordDisplay,
  gameModeToggleSwitch,
  darkModeToggleSwitch,
  onFirstAnswer,
}) => {
  // Current question index.
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  // User's selected answer.
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  // Answer status: 'correct', 'incorrect', or null.
  const [answerStatus, setAnswerStatus] = useState<'correct' | 'incorrect' | null>(null);
  // User's score.
  const [score, setScore] = useState(0);
  // Tracks correctness of each answer.
  const [questionResults, setQuestionResults] = useState<boolean[]>([]);
  // True if quiz is completed.
  const [quizCompleted, setQuizCompleted] = useState(false);
  // Ref to prevent re-loading state.
  const hasLoadedState = useRef(false);
  // Session storage key.
  const quizStateKey = quizId ? `linguil-quiz-state-${quizId}` : null;
  // Controls exit animation.
  const [isExiting, setIsExiting] = useState(false);
  // Auth hook for sign-out cleanup.
  const { addSignOutCleanup, removeSignOutCleanup } = useAuth();
  // Ref to question card for focusing.
  const questionCardRef = useRef<HTMLDivElement>(null);

  // Focus question heading on new questions.
  useEffect(() => {
    if (questionCardRef.current) {
      const heading = questionCardRef.current.querySelector('#question-heading');
      if (heading instanceof HTMLElement) {
        heading.focus();
      }
    }
  }, [currentQuestionIndex]);

  // Cleanup session storage on sign-out.
  useEffect(() => {
    if (!quizStateKey) return;
    const cleanup = () => {
      sessionStorage.removeItem(quizStateKey);
    };
    addSignOutCleanup(cleanup);
    return () => removeSignOutCleanup(cleanup);
  }, [quizStateKey, addSignOutCleanup, removeSignOutCleanup]);

  // Load quiz state from session storage.
  useEffect(() => {
    if (initialQuestions.length > 0 && !hasLoadedState.current && quizStateKey) {
      try {
        const savedStateJSON = sessionStorage.getItem(quizStateKey);
        if (savedStateJSON) {
          const savedState: GameState = JSON.parse(savedStateJSON);
          if (savedState && typeof savedState.currentQuestionIndex === 'number' && savedState.currentQuestionIndex < initialQuestions.length) {
            setCurrentQuestionIndex(savedState.currentQuestionIndex);
            setScore(savedState.score || 0);
            setSelectedAnswer(savedState.selectedAnswer || null);
            setAnswerStatus(savedState.answerStatus || null);
            setQuestionResults(savedState.questionResults || []);
          }
        }
      } catch {
        // On failure, remove the invalid item.
        if (quizStateKey) {
          sessionStorage.removeItem(quizStateKey);
        }
      } finally {
        hasLoadedState.current = true;
      }
    }
  }, [initialQuestions.length, quizStateKey]);

  // Handle quiz completion.
  useEffect(() => {
    if (quizCompleted) {
      onFinish(score, questionResults);
      if (quizStateKey) {
        sessionStorage.removeItem(quizStateKey);
      }
    }
  }, [quizCompleted, score, onFinish, quizStateKey, questionResults]);

  // Handle answer selection.
  const handleAnswerSelect = useCallback((answer: string) => {
    if (answerStatus) return; // Prevent changing answer after submission.

    if (currentQuestionIndex === 0 && onFirstAnswer) {
      onFirstAnswer();
    }

    const isCorrect = initialQuestions[currentQuestionIndex].correctAnswer === answer;
    const newScore = isCorrect ? score + 1 : score;
    const newAnswerStatus = isCorrect ? 'correct' : 'incorrect';
    const newQuestionResults = [...questionResults, isCorrect];

    setSelectedAnswer(answer);
    setScore(newScore);
    setAnswerStatus(newAnswerStatus);
    setQuestionResults(newQuestionResults);

    // Save state to session storage.
    if (quizStateKey) {
      const gameState: GameState = {
        currentQuestionIndex,
        score: newScore,
        selectedAnswer: answer,
        answerStatus: newAnswerStatus,
        questionResults: newQuestionResults,
      };
      sessionStorage.setItem(quizStateKey, JSON.stringify(gameState));
    }
  }, [answerStatus, currentQuestionIndex, initialQuestions, onFirstAnswer, quizStateKey, score, questionResults]);

  // Trigger exit animation for next question.
  const handleNextQuestion = useCallback(() => {
    if (answerStatus) {
        setIsExiting(true);
    }
  }, [answerStatus]);

  // Logic after exit animation.
  const handleAnimationEnd = () => {
    if (isExiting) {
      const isLastQuestion = currentQuestionIndex === initialQuestions.length - 1;
      if (!isLastQuestion) {
        const nextQuestionIndex = currentQuestionIndex + 1;
        setCurrentQuestionIndex(nextQuestionIndex);
        setSelectedAnswer(null);
        setAnswerStatus(null);

        // Save state for the next question.
        if (quizStateKey) {
          const gameState: GameState = {
            currentQuestionIndex: nextQuestionIndex,
            score: score,
            selectedAnswer: null,
            answerStatus: null,
            questionResults: questionResults,
          };
          sessionStorage.setItem(quizStateKey, JSON.stringify(gameState));
        }
      } else {
        // If it's the last question, complete the quiz.
        setQuizCompleted(true);
      }
      setIsExiting(false); // Reset the exiting state.
    }
  };

  // Spinner if questions are not ready.
  if (!initialQuestions || initialQuestions.length === 0) {
    return (
      <div className="flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const currentQuestion = initialQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === initialQuestions.length - 1;
  // Animation class for slide effect.
  const animationClass = isExiting ? 'animate-slide-out-to-left' : 'animate-slide-in-from-right';

  return (
    <div 
      // Key forces re-render for animation.
      key={currentQuestionIndex}
      ref={questionCardRef}
      className={`w-full ${animationClass}`}
      onAnimationEnd={handleAnimationEnd}
    >
      <Suspense fallback={<div className="flex items-center justify-center"><LoadingSpinner /></div>}>
        <DynamicQuestionCard
          question={currentQuestion}
          onAnswerSelect={handleAnswerSelect}
          selectedAnswer={selectedAnswer}
          answerStatus={answerStatus}
          onNextQuestion={handleNextQuestion}
          isLastQuestion={isLastQuestion}
          wordDisplay={wordDisplay}
          gameModeToggleSwitch={gameModeToggleSwitch}
          darkModeToggleSwitch={darkModeToggleSwitch}
        />
      </Suspense>
    </div>
  );
});

Quiz.displayName = 'Quiz';

export { Quiz };