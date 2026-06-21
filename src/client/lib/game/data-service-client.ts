'use client';

import type { RawDailyData } from '@/shared/types';

// Fetches daily word data from the app's backend API.
export const getDailyWordDataClient = async (): Promise<RawDailyData | null> => {
  try {
    // Fetch securely through the backend API.
    const response = await fetch('/api/daily-word');
    if (response.ok) {
      return await response.json() as RawDailyData;
    }
    console.error("Failed to fetch daily word: Response not OK");
    return null;
  } catch (error) {
    console.error("Failed to fetch daily word:", error);
    return null; 
  }
};