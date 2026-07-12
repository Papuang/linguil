'use client';

import { useEffect, useCallback, useReducer, useRef } from 'react';
import type { ProcessedDailyData, RawDailyData, DailyScore } from '@/shared/types';
import { useAuth } from '@/client/hooks/use-auth';
import { useToast } from '@/client/hooks/use-toast';
import { getDailyWordDataClient } from '@/client/lib/game/data-service-client';
import { getOfflineQuizData } from '@/client/lib/game/data-service-offline';
import { generateQuestions } from '@/client/lib/game/quiz-questions';
import { telemetry } from '@devvit/analytics/client/reddit';

// Keys for session storage to persist game state across page reloads.
const GAME_MODE_KEY = 'linguil-game-mode'; // Tracks if the user is in 'online' or 'offline' mode.
const OFFLINE_GAME_DATA_KEY = 'linguil-offline-game-data'; // Caches data for the current offline game.
const PENDING_SCORE_KEY = 'linguil-pending-score'; // Stores a completed score if the user was logged out.
const JOURNEY_ACTIVE_KEY = 'linguil-journey-active';

// Defines the structure of the game's state.
interface GameState {
  loading: boolean;
  isOffline: boolean;
  quizFinished: boolean;
  data: ProcessedDailyData | null;
  dailyScore: DailyScore | null;
  audio: {
    player: HTMLAudioElement | null;
    isReady: boolean;
    voices: SpeechSynthesisVoice[];
  };
}

// Defines the possible actions for the game reducer.
type GameAction = 
  | { type: 'START_LOADING' }
  | { type: 'SET_ONLINE_MODE'; payload: { data: ProcessedDailyData, score: DailyScore | null } }
  | { type: 'SET_OFFLINE_MODE'; payload: ProcessedDailyData }
  | { type: 'FINISH_QUIZ'; payload: DailyScore }
  | { type: 'SET_AUDIO_PLAYER'; payload: HTMLAudioElement | null }
  | { type: 'SET_AUDIO_READY'; payload: boolean }
  | { type: 'SET_VOICES'; payload: SpeechSynthesisVoice[] }
  | { type: 'DATA_LOAD_ERROR' }
  | { type: 'RESET_GAME' };

// Initial state for the game reducer.
const initialState: GameState = {
  loading: true,
  isOffline: false,
  quizFinished: false,
  data: null,
  dailyScore: null,
  audio: {
    player: null,
    isReady: false,
    voices: [],
  },
};

// Manages game state based on dispatched actions.
const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'START_LOADING':
      return { ...state, loading: true };
    case 'SET_ONLINE_MODE':
      return {
        ...state,
        loading: false,
        isOffline: false,
        data: action.payload.data,
        dailyScore: action.payload.score,
        quizFinished: !!action.payload.score,
      };
    case 'SET_OFFLINE_MODE':
      return {
        ...state,
        loading: false,
        isOffline: true,
        data: action.payload,
        dailyScore: null,
        quizFinished: false,
      };
    case 'FINISH_QUIZ':
      return { ...state, quizFinished: true, dailyScore: action.payload };
    case 'SET_AUDIO_PLAYER':
      return { ...state, audio: { ...state.audio, player: action.payload } };
    case 'SET_AUDIO_READY':
      return { ...state, audio: { ...state.audio, isReady: action.payload } };
    case 'SET_VOICES':
      return { ...state, audio: { ...state.audio, voices: action.payload } };
    case 'DATA_LOAD_ERROR':
      return { ...state, loading: false };
    case 'RESET_GAME':
      return initialState;
    default:
      return state;
  }
};

// Custom hook to manage all game logic and state for the Devvit client.
export const useGame = (initialDailyWord: RawDailyData | null = null) => {
  const { toast } = useToast();
  const { user, loading: authLoading, hasPaid, addSignOutCleanup, removeSignOutCleanup } = useAuth();
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const appReadyFired = useRef(false);

  // Shows an error toast.
  const showErrorToast = useCallback((title: string, description: string) => {
    toast({ title, description, variant: 'destructive' });
  }, [toast]);

  // Retrieves a pending score from session storage. This is used if a user completes a game while logged out.
  const getPendingScore = useCallback((): (DailyScore & { wordIdentifier: string }) | null => {
    const pendingScoreJSON = sessionStorage.getItem(PENDING_SCORE_KEY);
    if (!pendingScoreJSON) return null;
    try { 
      return JSON.parse(pendingScoreJSON); 
    } catch {
      // If parsing fails, remove the invalid item.
      sessionStorage.removeItem(PENDING_SCORE_KEY);
      return null;
    }
  }, []);

  // Saves a user's score to the backend via an API call.
  const saveScoreToServer = useCallback(async (scoreData: DailyScore & { wordIdentifier: string }) => {
    try {
        const res = await fetch('/api/game/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(scoreData),
        });
        if (!res.ok) throw new Error('Server responded with an error during score save.');
    } catch (error) {
        console.error("Save score failed:", error);
        showErrorToast("Save Failed", "Could not save your score.");
        // Re-throw the error to be caught by the caller.
        throw error;
    }
  }, [showErrorToast]);

  // Fetches the user's score for a specific day from the backend.
  const getUserDailyScore = useCallback(async (wordIdentifier: string) => {
    if (!user) return null;
    try {
      const response = await fetch(`/api/game/score?wordIdentifier=${wordIdentifier}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error("Failed to fetch daily score from backend", error);
    }
    return null;
  }, [user]);

  // Loads data for the daily online game.
  const loadDailyData = useCallback(async () => {
    dispatch({ type: 'START_LOADING' });
    try {
      // Fetches the raw daily word data from the client-side data service.
      const dailyWordData = initialDailyWord || await getDailyWordDataClient();
      if (!dailyWordData) throw new Error("Daily word data is unavailable");

      const { word, audioUrl, distractors, languageStats, date } = dailyWordData;
      // Generates the quiz questions based on the word and its distractors.
      const questions = generateQuestions(word, distractors);
      const processedData = { date, languageStats, questions, word, audioUrl };

      let finalScore: DailyScore | null = null;

      if (user) {
        // If a user is logged in, check for a pending score to submit.
        const pendingScore = getPendingScore();
        if (pendingScore?.wordIdentifier === date) {
          try {
            await saveScoreToServer(pendingScore);
            finalScore = { score: pendingScore.score, totalQuestions: pendingScore.totalQuestions, questionResults: pendingScore.questionResults };
            sessionStorage.removeItem(PENDING_SCORE_KEY);
          } catch {
            // If saving fails, fetch the existing score.
            finalScore = await getUserDailyScore(date);
          }
        } else {
          // If no pending score, fetch the user's score for the day.
          finalScore = await getUserDailyScore(date);
        }
      }

      dispatch({ type: 'SET_ONLINE_MODE', payload: { data: processedData, score: finalScore } });
      if (!appReadyFired.current) {
        try {
          const { receipt } = await telemetry.appReady();
          console.log('App ready receipt:', receipt);
          appReadyFired.current = true;
        } catch (e) {
          console.error('Failed to send appReady event:', e);
        }
      }
    } catch (err) {
      console.error("Error loading daily data:", err);
      showErrorToast("Error loading game", "Failed to load game data");
      dispatch({ type: 'DATA_LOAD_ERROR' });
      if (sessionStorage.getItem(JOURNEY_ACTIVE_KEY) === 'true') {
        try {
          await telemetry.endJourney({ complete: false });
          sessionStorage.removeItem(JOURNEY_ACTIVE_KEY);
        } catch (e) {
          console.error('Failed to end journey on error:', e);
        }
      }
    }
  }, [initialDailyWord, getUserDailyScore, user, showErrorToast, getPendingScore, saveScoreToServer]);

  // Loads data for an offline game.
  const loadOfflineGame = useCallback(async (isNew: boolean = false) => {
    dispatch({ type: 'START_LOADING' });
    try {
      let dataToLoad: ProcessedDailyData | null = null;

      // Try to load from session storage unless starting a new game.
      if (!isNew) {
        const savedData = sessionStorage.getItem(OFFLINE_GAME_DATA_KEY);
        if (savedData) {
          try { 
            dataToLoad = JSON.parse(savedData); 
          } catch {
            sessionStorage.removeItem(OFFLINE_GAME_DATA_KEY);
          }
        }
      }

      // If no data was loaded, fetch fresh data for a new offline game.
      if (!dataToLoad) {
        const offlineData = await getOfflineQuizData();
        if (offlineData && offlineData.word && offlineData.languageStats) {
          const { questions, languageStats, word } = offlineData;
          dataToLoad = { questions, languageStats, word, audioUrl: null, date: new Date().toISOString() };
          sessionStorage.setItem(OFFLINE_GAME_DATA_KEY, JSON.stringify(dataToLoad));
        } else {
          throw new Error("Failed to get offline quiz data");
        }
      }
      dispatch({ type: 'SET_OFFLINE_MODE', payload: dataToLoad });
      if (!appReadyFired.current) {
        try {
          const { receipt } = await telemetry.appReady();
          console.log('App ready receipt:', receipt);
          appReadyFired.current = true;
        } catch (e) {
          console.error('Failed to send appReady event:', e);
        }
      }
    } catch (error) {
      console.error('Offline game loading error:', error);
      showErrorToast("Error loading offline game", "Could not prepare the offline game.");
      dispatch({ type: 'DATA_LOAD_ERROR' });
      if (sessionStorage.getItem(JOURNEY_ACTIVE_KEY) === 'true') {
        try {
          await telemetry.endJourney({ complete: false });
          sessionStorage.removeItem(JOURNEY_ACTIVE_KEY);
        } catch (e) {
          console.error('Failed to end journey on error:', e);
        }
      }
    }
  }, [showErrorToast]);

  // Determines which game mode to load based on auth status and session storage.
  useEffect(() => {
    if (authLoading) return; // Wait for authentication to resolve.
    const savedMode = sessionStorage.getItem(GAME_MODE_KEY);
    if (savedMode === 'offline' && hasPaid) {
      loadOfflineGame();
    } else {
      loadDailyData();
    }
  }, [authLoading, hasPaid, loadDailyData, loadOfflineGame]);

  // Registers a cleanup function to reset game state on user sign-out.
  useEffect(() => {
    const reset = () => {
      sessionStorage.removeItem(GAME_MODE_KEY);
      sessionStorage.removeItem(OFFLINE_GAME_DATA_KEY);
      sessionStorage.removeItem(PENDING_SCORE_KEY);
      sessionStorage.removeItem(JOURNEY_ACTIVE_KEY);
      dispatch({ type: 'RESET_GAME' });
    };
    addSignOutCleanup(reset);
    return () => removeSignOutCleanup(reset);
  }, [addSignOutCleanup, removeSignOutCleanup]);

  // Schedules a page refresh at midnight UTC for the daily game.
  useEffect(() => {
    if (state.isOffline || !state.data?.date) return;
    const midnight = new Date(state.data.date);
    midnight.setUTCHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - Date.now();
    if (msUntilMidnight <= 0) return;
    // Set a timer to re-fetch data for the new day.
    const timer = setTimeout(() => loadDailyData(), msUntilMidnight);
    return () => clearTimeout(timer);
  }, [state.data?.date, state.isOffline, loadDailyData]);

  // Sets up the audio player or speech synthesis.
  useEffect(() => {
    dispatch({ type: 'SET_AUDIO_PLAYER', payload: null });
    dispatch({ type: 'SET_AUDIO_READY', payload: false });
    
    if (!state.data) return;

    if (state.data.audioUrl) {
      // Use audio if available.
      let audioSrc = state.data.audioUrl;
      
      // Proxy audio through the backend for Devvit.
      try {
          const url = new URL(audioSrc);
          const decodedPath = decodeURIComponent(url.pathname);
          // Extract the path to use with our proxy, e.g., /api/audio/YYYY-MM-DD/FILE.mp3
          const match = decodedPath.match(/audio\/.*$/);
          if (match) {
              audioSrc = `/api/${match[0]}`;
          }
      } catch (error) {
          console.error('Failed to construct proxy audio URL:', error);
          // If proxying fails, try to use the original URL.
      }

      const player = new Audio(audioSrc);
      player.onerror = () => showErrorToast("Audio Error", "Could not load audio file.");
      dispatch({ type: 'SET_AUDIO_PLAYER', payload: player });
      dispatch({ type: 'SET_AUDIO_READY', payload: true });

    } else {
      // Fallback to in-browser text-to-speech if no audio URL is provided.
      const handleVoicesChanged = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          dispatch({ type: 'SET_VOICES', payload: voices });
          dispatch({ type: 'SET_AUDIO_READY', payload: true });
        }
      };
      window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
      handleVoicesChanged(); // Call it once to get voices that might already be loaded.
      return () => { window.speechSynthesis.onvoiceschanged = null; };
    }
  }, [state.data, showErrorToast]);

  // Plays the audio for the current word.
  const handlePlayAudio = useCallback(() => {
    if (!state.audio.isReady || !state.data) return;

    if (state.audio.player) {
      state.audio.player.play().catch(() => showErrorToast("Audio error", "Failed to play audio"));
    } else {
      // Use speech synthesis as a fallback if no audio is available.
      try {
        const { word } = state.data;
        const voice = state.audio.voices.find(v => v.lang.startsWith(word.langCode));
        const textToSpeak = voice ? word.nativeScript : word.transliteration;
        if (!textToSpeak) throw new Error("No text available for speech");

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.voice = voice || state.audio.voices.find(v => v.lang.startsWith('en')) || state.audio.voices[0];
        if (utterance.voice) utterance.lang = utterance.voice.lang;
        window.speechSynthesis.speak(utterance);
      } catch {
        showErrorToast("Audio error", "Failed to play audio");
      }
    }
  }, [state.audio, state.data, showErrorToast]);

  // Handles quiz completion.
  const handleQuizFinish = useCallback(async (finalScore: number, questionResults: boolean[]) => {
    if (!state.data?.date) return;
    const totalQuestions = state.data.questions.length;

    const scoreData: DailyScore = { score: finalScore, totalQuestions, questionResults };
    dispatch({ type: 'FINISH_QUIZ', payload: scoreData });

    if (sessionStorage.getItem(JOURNEY_ACTIVE_KEY) === 'true') {
      try {
        await telemetry.endJourney({ complete: true, game: { win: finalScore === totalQuestions, score: finalScore } });
        sessionStorage.removeItem(JOURNEY_ACTIVE_KEY);
      } catch (e) {
        console.error('Failed to end journey on finish:', e);
      }
    }

    if (state.isOffline) return; // Do not save scores for offline games.

    const scoreDataForSaving = { ...scoreData, wordIdentifier: state.data.date };

    if (user) {
      // If the user is logged in, save the score to the server.
      try {
        await saveScoreToServer(scoreDataForSaving);
      } catch {
        // Error is handled by saveScoreToServer.
      }
    } else {
      // If logged out, store score in session storage to save later.
      sessionStorage.setItem(PENDING_SCORE_KEY, JSON.stringify(scoreDataForSaving));
    } 
  }, [user, state.data, state.isOffline, saveScoreToServer]);

  // Switches the game between online (daily) and offline (practice) modes.
  const handleModeToggle = (isOffline: boolean) => {
    sessionStorage.removeItem(OFFLINE_GAME_DATA_KEY);
    if (isOffline) {
      sessionStorage.setItem(GAME_MODE_KEY, 'offline');
      loadOfflineGame(true);
    } else {
      sessionStorage.setItem(GAME_MODE_KEY, 'online');
      loadDailyData();
    }
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!state.quizFinished && sessionStorage.getItem(JOURNEY_ACTIVE_KEY) === 'true') {
        telemetry.endJourney({ complete: false });
        sessionStorage.removeItem(JOURNEY_ACTIVE_KEY);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [state.quizFinished]);

  // Returns game state and handler functions.
  return {
    loading: authLoading || state.loading,
    data: state.data,
    dailyScore: state.dailyScore,
    quizFinished: state.quizFinished,
    isOfflineGame: state.isOffline,
    handleQuizFinish,
    handleModeToggle,
    startNewOfflineGame: () => handleModeToggle(true),
    hasPaid,
    isAudioReady: state.audio.isReady,
    handlePlayAudio,
  };
};