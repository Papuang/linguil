'use client';

import type { Question, LanguageStats, Word } from '@/shared/types';
import type { CachedData } from '@/client/lib/game/offline-data-service';

type ScoreMessages = Record<number, string>;
const LOCAL_STORAGE_KEY = 'offlineGameData';

// Caches the results of expensive, pure functions.
const memoize = <T extends (...args: any[]) => any>(fn: T): T => {
  const cache = new Map<string, ReturnType<T>>();
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key)!;
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
};

// Creates a deterministic, seeded random number generator.
const createSeededRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
};

// Shuffles an array deterministically based on a seed.
const _deterministicShuffle = <T>(array: T[], seed: number): T[] => {
  const random = createSeededRandom(seed);
  const shuffled = [...array];
  let currentIndex = shuffled.length;
  while (currentIndex !== 0) {
    const randomIndex = Math.floor(random() * currentIndex);
    currentIndex--;
    [shuffled[currentIndex], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[currentIndex]];
  }
  return shuffled;
};
// Creates a memoized version of the deterministic shuffle function.
const deterministicShuffle = memoize(_deterministicShuffle);

// Gets a specified number of unique random items from an array.
const getUniqueRandomItems = <T>(
  array: T[],
  count: number,
  exclude: T[] = [],
  seed: number
): T[] => {
  const excludeSet = new Set(exclude);
  const availableItems = array.filter(item => !excludeSet.has(item));
  const shuffled = deterministicShuffle(availableItems, seed);
  return shuffled.slice(0, count);
};

// Serializes a Map into a JSON-compatible object.
const replacer = (key: any, value: any) => {
  if (value instanceof Map) {
    return { __type: 'Map', value: Array.from(value.entries()) };
  }
  return value;
};

// Deserializes a JSON object back into a Map.
const reviver = (key: any, value: any) => {
  if (typeof value === 'object' && value !== null && value.__type === 'Map') {
    return new Map(value.value);
  }
  return value;
};

let cachedData: CachedData | null = null;
let dataLoadingPromise: Promise<CachedData> | null = null;

// Loads, processes, and caches all data required for the offline quiz.
const loadAndProcessData = (): Promise<CachedData> => {
  if (cachedData) return Promise.resolve(cachedData);

  try {
    const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedData) {
      cachedData = JSON.parse(storedData, reviver);
      if (cachedData) return Promise.resolve(cachedData);
    }
  } catch {
    // Silently fail if localStorage is corrupt or inaccessible.
  }

  if (dataLoadingPromise) return dataLoadingPromise;

  dataLoadingPromise = (async (): Promise<CachedData> => {
    try {
      // Dynamically import the data processing module.
      const { processAndCacheData } = await import('@/client/lib/game/offline-data-service');
      const processed = await processAndCacheData();

      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(processed, replacer));
      } catch {
        // Silently fail if localStorage is full or unavailable.
      }

      cachedData = processed;
      return processed;
    } catch {
      throw new Error('Failed to start offline mode');
    }
  })();

  return dataLoadingPromise;
};

const MAX_RETRIES = 3;

// Generates a full quiz dataset for an offline game session.
export const getOfflineQuizData = async (retries = MAX_RETRIES): Promise<{ 
  questions: Question[], 
  languageStats: LanguageStats | null, 
  scoreMessages: ScoreMessages, 
  seed: number, 
  word?: Word 
}> => {
  const data = await loadAndProcessData();
  const seed = Math.floor(Math.random() * 1000000000);

  const wordCount = data.words.length; // Select a random word to base the quiz on.
  if (wordCount === 0) {
      return { questions: [], languageStats: null, scoreMessages: {}, seed };
  }
  const randomWord = data.words[Math.floor(Math.random() * wordCount)]!;

  const familyRecord = data.familiesMap.get(randomWord.language); // Gather all necessary metadata for the chosen word.
  const langCodeRecord = data.langCodesMap.get(randomWord.language);
  const langStatsRecord = data.langStatsMap.get(randomWord.language);

  if (!familyRecord || !langCodeRecord) { // Safeguard against corrupt or inconsistent CSV data.
    if (retries > 0) {
      return getOfflineQuizData(retries - 1); // Retry generation on data inconsistency.
    } else {
      return { questions: [], languageStats: null, scoreMessages: {}, seed };
    }
  }

  const { family: correctFamily, language: correctLanguage } = familyRecord;
  const { langCode: correctLangCode } = langCodeRecord;
  const { translation: correctTranslation } = randomWord;

  const fullWord: Word = {
    family: correctFamily,
    language: correctLanguage,
    translation: correctTranslation,
    nativeScript: randomWord.nativeScript,
    transliteration: randomWord.transliteration,
    langCode: correctLangCode,
  };

  const familyOptions = [correctFamily, ...getUniqueRandomItems(data.allFamilies, 3, [correctFamily], seed + 1)]; // Generate Question 1: Language Family.
  const question1: Question = {
    type: 'family',
    prompt: 'Which language family is this word from?',
    correctAnswer: correctFamily,
    options: deterministicShuffle(familyOptions, seed + 2),
  };

  const ambiguousLangs = data.ambiguousWordsMap.get(correctTranslation)?.get(randomWord.transliteration) || []; // Generate Question 2: Specific Language.
  const languagesInFamily = data.languagesByFamilyMap.get(correctFamily) || [];
  const languageOptions = [correctLanguage];
  const excludeFromFamily = [...new Set([correctLanguage, ...ambiguousLangs])];
  languageOptions.push(...getUniqueRandomItems(languagesInFamily, 3, excludeFromFamily, seed + 3));

  if (languageOptions.length < 4) { // Ensure we always have 4 options, pulling from other languages if necessary.
    const excludeGeneral = [...new Set([...languageOptions, ...ambiguousLangs])];
    const needed = 4 - languageOptions.length;
    languageOptions.push(...getUniqueRandomItems(data.allLanguages, needed, excludeGeneral, seed + 4));
  }
  const question2: Question = {
    type: 'language',
    prompt: `Which ${correctFamily} language is this word from?`,
    correctAnswer: correctLanguage,
    options: deterministicShuffle(languageOptions.slice(0, 4), seed + 5),
  };

  const translationOptions = [correctTranslation, ...getUniqueRandomItems(data.allTranslations, 3, [correctTranslation], seed + 6)]; // Generate Question 3: English Translation.
  const question3: Question = {
    type: 'translation',
    prompt: 'What is the English translation of this word?',
    correctAnswer: correctTranslation,
    options: deterministicShuffle(translationOptions, seed + 7),
  };

  const languageStats = langStatsRecord ? { // Compile the final language statistics object.
    family: correctFamily,
    language: langStatsRecord.language,
    totalSpeakers: langStatsRecord.totalSpeakers,
    countryWithMostSpeakers: langStatsRecord.highestNumberSpeakers,
    speakersInCountry: langStatsRecord.countrySpeakers,
  } : null;

  return { questions: [question1, question2, question3], languageStats, scoreMessages: data.scoreMessages, seed, word: fullWord };
};