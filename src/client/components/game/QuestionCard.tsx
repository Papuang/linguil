'use client';

import type { Question } from '@/shared/types';
import { Button } from '@/client/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/client/components/ui/card';
import { cn } from '@/client/lib/utils';
import { useMemo, memo } from 'react';
import type { ReactNode } from 'react';

// Props for AnswerOptionButton.
type AnswerOptionButtonProps = {
  // The text content of the option.
  option: string;
  // Whether this option is selected.
  isSelected: boolean;
  // Whether this option is the correct answer.
  isCorrect: boolean;
  // The answer's status after submission.
  answerStatus: 'correct' | 'incorrect' | null;
  // Callback executed when the option is selected.
  onSelect: (option: string) => void;
};

// A memoized button for a single answer option.
const AnswerOptionButton = memo<AnswerOptionButtonProps>(({ 
  option, 
  isSelected, 
  isCorrect, 
  answerStatus, 
  onSelect, 
}) => (
  <Button
    size="lg"
    className={cn(
      'h-auto justify-center p-4 text-left whitespace-normal',
      'transition-all duration-300 transform hover:scale-105',
      // Style for the correct answer.
      answerStatus && isCorrect && 'bg-correct/20 border-correct text-correct-foreground hover:bg-correct/30',
      // Style for a selected, incorrect answer.
      answerStatus && isSelected && !isCorrect && 'bg-destructive/20 border-destructive text-destructive-foreground hover:bg-destructive/30',
      // Style for other options after submission.
      answerStatus && !isSelected && !isCorrect && 'opacity-70'
    )}
    onClick={() => onSelect(option)}
    disabled={!!answerStatus}
  >
    {option}
  </Button>
));
AnswerOptionButton.displayName = 'AnswerOptionButton';

// Props for the QuestionCard component.
type QuestionCardProps = {
  // The question object.
  question: Question;
  // Callback when an answer is selected.
  onAnswerSelect: (answer: string) => void;
  // The user's selected answer.
  selectedAnswer: string | null;
  // The status of the submitted answer.
  answerStatus: 'correct' | 'incorrect' | null;
  // Callback to go to the next question.
  onNextQuestion: () => void;
  // Whether it is the last question.
  isLastQuestion: boolean;
  // The word display component.
  wordDisplay: ReactNode;
  // The game mode toggle switch.
  gameModeToggleSwitch: ReactNode;
  // The dark mode toggle switch.
  darkModeToggleSwitch: ReactNode;
};

// Displays a single question with options and feedback.
const QuestionCard = memo<QuestionCardProps>(({ 
  question, 
  onAnswerSelect, 
  selectedAnswer, 
  answerStatus, 
  onNextQuestion, 
  isLastQuestion, 
  wordDisplay,
  gameModeToggleSwitch,
  darkModeToggleSwitch,
}) => {
  // Memoizes the result text to prevent re-calculation.
  const resultText = useMemo(() => {
    if (!answerStatus) return null;
    if (answerStatus === 'correct') {
      return <p className="text-green-600 font-bold animate-fade-in-up text-sm sm:text-base">Correct!</p>;
    }
    return <p className="text-destructive font-bold animate-fade-in-up text-sm sm:text-base">The correct answer is {question.correctAnswer}</p>;
  }, [answerStatus, question.correctAnswer]);

  return (
    <Card className="shadow-lg animate-fade-in-up w-full">
      <CardHeader className="text-center pb-2">
        <CardTitle as="h2" id="question-heading" tabIndex={-1} className="font-headline text-2xl focus:outline-none">
          {question.prompt}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="mt-2">
          {wordDisplay}
        </div>
        <div className="flex items-center justify-between min-h-6 mb-4 gap-2">
          {/* Dark mode toggle slot. */}
          <div>
            {darkModeToggleSwitch}
          </div>
          {/* Displays the answer's correctness. */}
          <div className="text-center shrink min-w-0">
            {resultText}
          </div>
          {/* Game mode toggle slot. */}
          <div>
            {gameModeToggleSwitch}
          </div>
        </div>

        {/* Renders the grid of answer options. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {question.options.map((option) => (
            <AnswerOptionButton
              key={option}
              option={option}
              isSelected={selectedAnswer === option}
              isCorrect={question.correctAnswer === option}
              answerStatus={answerStatus}
              onSelect={onAnswerSelect}
            />
          ))}
        </div>

        {/* Shows the 'Next' or 'Finish' button after answering. */}
        <div className="text-center flex flex-col justify-center items-center">
          {answerStatus && (
            <Button
              onClick={onNextQuestion}
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 animate-fade-in-up"
            >
              {isLastQuestion ? 'Finish' : 'Next'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

QuestionCard.displayName = 'QuestionCard';

export { QuestionCard };