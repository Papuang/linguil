'use client';

import type { Question, LanguageStats, Word } from '@/types';
import type { CachedData } from './offline-data-service';

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
  // Create a unique set of available items first.
  const availableItems = [...new Set(array.filter(item => !excludeSet.has(item)))];
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
      const { processAndCacheData } = await import('./offline-data-service');
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

  // Gather all necessary metadata for the chosen word.
  const familyRecord = data.familiesMap.get(randomWord.language);
  const langCodeRecord = data.langCodesMap.get(randomWord.language);
  const langStatsRecord = data.langStatsMap.get(randomWord.language);
  const languageRegion = data.regionsByLanguage.get(randomWord.language);

  // Safeguard against corrupt or inconsistent CSV data.
  if (!familyRecord || !langCodeRecord) {
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

  // Question 1: Language family.
  const sameRegionFamilies = languageRegion ? data.familiesByRegion.get(languageRegion) || [] : [];
  const familyDistractorPool = [
    ...new Set(sameRegionFamilies.filter(f => f !== correctFamily)),
    ...new Set(data.allFamilies.filter(f => f !== correctFamily))
  ];
  const familyDistractors = getUniqueRandomItems(familyDistractorPool, 3, [], seed + 1);
  const familyOptions = [correctFamily, ...familyDistractors];
  const question1: Question = {
    type: 'family',
    prompt: 'Which language family is this word from?',
    correctAnswer: correctFamily,
    options: deterministicShuffle(familyOptions, seed + 2),
  };

  // Question 2: Language.
  const ambiguousLangs = data.ambiguousWordsMap.get(correctTranslation)?.get(randomWord.transliteration) || [];
  const sameFamilyLangs = data.languagesByFamilyMap.get(correctFamily) || [];
  const sameRegionLanguages = languageRegion ? data.languagesByRegion.get(languageRegion) || [] : [];

  const sameFamilyDistractors = sameFamilyLangs.filter(lang => !ambiguousLangs.includes(lang) && lang !== correctLanguage);
  const sameRegionDistractors = sameRegionLanguages.filter(lang => !ambiguousLangs.includes(lang) && lang !== correctLanguage);
  const otherFamilyDistractors = data.allLanguages.filter(lang => !sameFamilyLangs.includes(lang) && !ambiguousLangs.includes(lang) && lang !== correctLanguage);

  const priorityPool = deterministicShuffle(
    [...new Set(sameFamilyDistractors.concat(sameRegionDistractors))],
    seed + 3
  );
  const otherPool = deterministicShuffle([...new Set(otherFamilyDistractors)], seed + 3.1);
  const combinedPool = [...new Set([...priorityPool, ...otherPool])];
  const langDistractors = combinedPool.slice(0, 3);

  const languageOptions = [correctLanguage, ...langDistractors];
  const question2: Question = {
    type: 'language',
    prompt: `Which ${correctFamily} language is this word from?`,
    correctAnswer: correctLanguage,
    options: deterministicShuffle(languageOptions, seed + 5),
  };

  // Question 3: English translation.
  const translationOptions = [correctTranslation, ...getUniqueRandomItems(data.allTranslations, 3, [correctTranslation], seed + 6)];
  const question3: Question = {
    type: 'translation',
    prompt: 'What is the English translation of this word?',
    correctAnswer: correctTranslation,
    options: deterministicShuffle(translationOptions, seed + 7),
  };

  // Compile the final language statistics object.
  const languageStats = langStatsRecord ? { 
    family: correctFamily,
    language: langStatsRecord.language,
    totalSpeakers: langStatsRecord.totalSpeakers,
    countryWithMostSpeakers: langStatsRecord.highestNumberSpeakers,
    speakersInCountry: langStatsRecord.countrySpeakers,
  } : null;

  return { questions: [question1, question2, question3], languageStats, scoreMessages: data.scoreMessages, seed, word: fullWord };
};