'use client';

import { memo } from 'react';

// Data shape for a player in the bar chart.
type ComparisonDataPoint = {
  uid: string;
  name: string;
  correct: number;
  perfect: number;
};

// Props for ScoreBarChart.
type ScoreBarChartProps = {
  // Data for the comparison bars.
  data: ComparisonDataPoint[];
  // Map from player UID to their chart color.
  colorMap: Map<string, string>;
  // Max value for scaling the bars.
  maxValue: number;
  // True if mock data is being shown.
  showMockData: boolean;
};

// Fallback color for players without an assigned color.
const FALLBACK_COLOR = '#808080'; // Neutral gray

// Renders horizontal bar charts comparing player stats.
const ScoreBarChart = memo<ScoreBarChartProps>(({ data, colorMap, maxValue, showMockData }) => {
  // Calculates bar width as a percentage of the max value.
  const calculateWidth = (value: number) => (maxValue > 0 ? `${(value / maxValue) * 100}%` : '0%');

  return (
    <div>
      {/* Chart titles for the two compared categories. */}
      <div className="relative h-8 mb-2 text-center">
        <div className="absolute w-1/2 left-0 text-lg font-bold text-foreground pr-2">Correct Answers</div>
        <div className="absolute w-1/2 right-0 text-lg font-bold text-foreground pl-2">Perfect Scores</div>
      </div>
      <div className="space-y-2">
        {data.length > 0
          ? data.map((player) => (
            <div key={player.uid} className="flex items-center w-full" style={{ height: '50px' }}>
              {/* Left-side bar for 'Correct Answers'. */}
              <div className="w-1/2 flex justify-end items-center pr-1 h-full">
                <div
                  className="rounded-l-md h-full flex items-center justify-center text-primary-foreground font-bold"
                  style={{
                    width: calculateWidth(player.correct),
                    backgroundColor: colorMap.get(player.uid) ?? FALLBACK_COLOR,
                  }}
                >
                  {player.correct > 0 && player.correct}
                </div>
              </div>
              {/* Center divider. */}
              <div className="w-px h-full bg-border" />
              {/* Right-side bar for 'Perfect Scores'. */}
              <div className="w-1/2 flex justify-start items-center pl-1 h-full">
                <div
                  className="rounded-r-md h-full flex items-center justify-center text-primary-foreground font-bold"
                  style={{
                    width: calculateWidth(player.perfect),
                    backgroundColor: colorMap.get(player.uid) ?? FALLBACK_COLOR,
                  }}
                >
                  {player.perfect > 0 && player.perfect}
                </div>
              </div>
            </div>
          ))
          : !showMockData && (
            // Empty placeholder to maintain layout with no data.
            <div className="flex items-center w-full" style={{ height: '50px' }}>
              <div className="w-1/2 pr-1 h-full" />
              <div className="w-px h-full bg-border" />
              <div className="w-1/2 pl-1 h-full" />
            </div>
          )
        }
      </div>
    </div>
  );
});

ScoreBarChart.displayName = 'ScoreBarChart';

export { ScoreBarChart };