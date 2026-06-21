'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Switch } from '@/client/components/ui/switch';
import { useState, useEffect, memo } from 'react';
import { LoadingSpinner } from '@/client/components/common/LoadingSpinner';

// Defines props for the DarkModeToggleSwitch component.
interface DarkModeToggleSwitchProps {
  // Specifies the visual variant of the switch.
  variant?: 'default' | 'gamepage';
}

// A theme toggle switch for dark and light modes.
const DarkModeToggleSwitch = memo(({ variant = 'default' }: DarkModeToggleSwitchProps) => {
  // Provides the current theme and a function to update it.
  const { setTheme, resolvedTheme } = useTheme();
  // Tracks whether the component is mounted to prevent hydration issues.
  const [isMounted, setIsMounted] = useState(false);

  // Prevents hydration mismatch by setting mounted state after initial render.
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Renders a loading spinner placeholder to prevent layout shifts before mounting.
  if (!isMounted) {
    // Mimics the real component's layout to prevent layout shifts.
    const placeholderStructure = variant === 'gamepage' ? (
      <div className="flex items-center space-x-1.5">
        <Switch id="placeholder-switch-game" />
      </div>
    ) : (
      <label htmlFor="placeholder-switch-default" className="flex items-center space-x-2">
        <Sun className="h-5 w-5" />
        <Switch id="placeholder-switch-default" />
        <Moon className="h-5 w-5" />
      </label>
    );

    return (
      <div className="relative">
        <div style={{ visibility: 'hidden' }} aria-hidden="true">
          {placeholderStructure}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner className={variant === 'gamepage' ? 'h-4 w-4' : 'h-5 w-5'} />
        </div>
      </div>
    );
  }

  // Checks if the current theme is dark.
  const isDarkMode = resolvedTheme === 'dark';

  // Toggles the theme between light and dark.
  const toggleTheme = () => {
    setTheme(isDarkMode ? 'light' : 'dark');
  };

  // Renders the 'gamepage' variant.
  if (variant === 'gamepage') {
    return (
      <div className="flex items-center space-x-1.5">
        <Switch
          id="dark-mode-switch-game"
          checked={isDarkMode}
          onCheckedChange={toggleTheme}
          className="data-[state=unchecked]:bg-muted"
          aria-label="Toggle dark mode"
        >
          {isDarkMode ? (
            <Moon className="h-4 w-4 text-primary" aria-hidden="true" />
          ) : (
            <Sun className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          )}
        </Switch>
      </div>
    );
  }

  // Renders the default variant.
  return (
    <label htmlFor="dark-mode-switch-default" className="flex items-center space-x-2 cursor-pointer">
      <Sun aria-hidden="true" className={`h-5 w-5 ${isDarkMode ? 'text-muted-foreground' : 'text-primary'}`} />
      <Switch
        id="dark-mode-switch-default"
        checked={isDarkMode}
        onCheckedChange={toggleTheme}
        aria-label="Toggle dark mode"
      />
      <Moon aria-hidden="true" className={`h-5 w-5 ${isDarkMode ? 'text-primary' : 'text-muted-foreground'}`} />
    </label>
  );
});

DarkModeToggleSwitch.displayName = 'DarkModeToggleSwitch';

export { DarkModeToggleSwitch };