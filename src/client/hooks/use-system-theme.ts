'use client';

import { useState, useEffect } from 'react';

// Detects the system's preferred color scheme (light or dark) and respond to changes.
export const useSystemTheme = () => {
  // Initialize state with a default value. This will be updated on the client.
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // This effect runs only on the client after mounting.
    if (typeof window === 'undefined') {
      return;
    }

    // Create a media query to check for the user's preference for a dark color scheme.
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // Update the theme state based on the media query's match status.
    const handleThemeChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setTheme(e.matches ? 'dark' : 'light');
    };

    // Set the initial theme based on the current state of the media query.
    handleThemeChange(mediaQuery);

    // Listen for changes.
    mediaQuery.addEventListener('change', handleThemeChange);

    // Clean up the listener when the component unmounts to prevent memory leaks.
    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange);
    };
  }, []); // The empty dependency array ensures this effect runs only once on mount.

  return { theme };
};