'use client';

import { memo, lazy, Suspense } from 'react';
import { CardHeader, CardTitle } from '@/client/components/ui/card';

// Dynamically import `ColorPicker` with a loading placeholder.
const ColorPicker = lazy(() => import('@/client/components/leaderboard/ColorPicker').then(mod => ({ default: mod.ColorPicker })));

// Props for LeaderboardHeader.
type LeaderboardHeaderProps = {
  // Selected color for the user's chart.
  chartColor?: string;
  // Callback on chart color change.
  onChartColorChange?: (color: string) => void;
};

// Header for the leaderboard with title and optional color picker.
const LeaderboardHeader = memo<LeaderboardHeaderProps>(({ chartColor, onChartColorChange }) => (
  <CardHeader className="relative items-center pt-14 pb-2 sm:pt-6">
    {/* Render ColorPicker if color and handler are provided. */}
    {chartColor && onChartColorChange && (
      <Suspense fallback={ <div className="absolute left-4 top-4 sm:left-6 sm:top-6 flex items-center gap-2">
          <p className="hidden sm:block text-sm text-muted-foreground dark:text-foreground">Colour:</p>
          <div className="w-8 h-8 rounded-md bg-muted" />
        </div>}>
        <ColorPicker selectedColor={chartColor} onColorChange={onChartColorChange} />
      </Suspense>
    )}
    <CardTitle>Leaderboard</CardTitle>
  </CardHeader>
));

LeaderboardHeader.displayName = 'LeaderboardHeader';

export { LeaderboardHeader };