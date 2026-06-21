// Represents a single vocabulary word and its associated metadata.
export type Word = {
  transliteration: string; // The word written in the Roman alphabet.
  nativeScript: string; // The word written in its original script.
  family: string; // The language family the word belongs to.
  language: string; // The specific language of the word.
  translation: string; // The English translation of the word.
  langCode: string; // The ISO 639-1 language code.
};

// Contains statistical information about a specific language.
export type LanguageStats = {
  family: string; // The language family.
  language: string; // The specific language.
  totalSpeakers: string; // The estimated total number of speakers.
  countryWithMostSpeakers: string; // The country with the highest number of speakers.
  speakersInCountry: string; // The number of speakers in that country.
};

// Defines the structure of a single quiz question.
export type Question = {
  type: 'family' | 'language' | 'translation'; // The category of the question.
  prompt: string; // The question text presented to the user.
  options: string[]; // An array of possible answers.
  correctAnswer: string; // The correct answer from the options.
};

// Holds arrays of incorrect options (distractors) for generating quiz questions.
export type Distractors = {
  family: string[];
  language: string[];
  translation: string[];
};

// Represents the unprocessed daily quiz data as fetched from its source.
export type RawDailyData = {
  word: Word;
  audioUrl: string | null;
  distractors: Distractors;
  languageStats: LanguageStats;
  date: string;
};

// Defines the structure of the daily data after processing.
export type ProcessedDailyData = {
  questions: Question[];
  languageStats: LanguageStats;
  word: Word;
  audioUrl: string | null;
  date: string;
};

// Represents a user's profile, including their stats and friends.
export type PlayerStats = {
  uid: string;
  displayName: string;
  photoURL: string | null;
  friendCode: string;
  friends: string[];
  scores: {
    totalCorrect: number;
    totalAnswered: number;
    perfectScores: number;
  };
};

// Stores the score and total questions for a user's daily quiz session.
export type DailyScore = {
  score: number;
  totalQuestions: number;
  questionResults: boolean[];
};

// Defines a user type that is safe for the Devvit environment.
export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}