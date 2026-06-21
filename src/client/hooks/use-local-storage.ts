'use client';

import { useState, useEffect } from 'react';

// Custom hook for using local storage with SSR safety.
function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  // Initialize state with the initial value to prevent hydration mismatch.
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // This effect runs only on the client after mounting.
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key); // Access local storage only on the client.
      if (item) {
        setStoredValue(JSON.parse(item)); // If a value exists, update state.
      }
    } catch {
      // If an error occurs (e.g., parsing), keep the initial value.
    }
  }, [key]);

  // Creates a function to set the value in state and local storage.
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value; // Allow value to be a function.
      setStoredValue(valueToStore); // Update the component's state.
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore)); // Persist to local storage.
      }
    } catch {
      // Let the app continue without crashing if an error occurs.
    }
  };

  return [storedValue, setValue]; // Return the stored value and setter function.
}

export default useLocalStorage;