'use client';

import { memo, useMemo } from 'react';
import type { PlayerStats } from '@/shared/types';
import { RadialBarChart } from 'recharts/es6/chart/RadialBarChart';
import { RadialBar } from 'recharts/es6/polar/RadialBar';
import { PolarAngleAxis } from 'recharts/es6/polar/PolarAngleAxis';
import { LabelList } from 'recharts/es6/component/LabelList';

// Data shape for a point in the radial chart.
type SuccessRateDataPoint = {
  uid: string;
  name: string;
  'Success Rate': number;
  fill: string;
};

// Props for ScoreRadialChart.
type ScoreRadialChartProps = {
  // True if the component is rendered on the client.
  isClient: boolean;
  // Data for the chart.
  data: SuccessRateDataPoint[];
  // True if mock data is being shown.
  showMockData: boolean;
  // Full player stats for determining empty state.
  players?: PlayerStats[];
};

// A memoized radial bar chart of player success rates.
const ScoreRadialChart = memo<ScoreRadialChartProps>(({ isClient, data, showMockData, players }) => {
  // Memoizes data, showing a placeholder if no players exist.
  const chartDisplayData = useMemo(() => {
    if (showMockData || (players && players.length > 0)) {
      return data;
    }
    return [{ uid: 'placeholder', name: '', 'Success Rate': 0, fill: 'transparent' }];
  }, [showMockData, players, data]);

  // Reverses data so the first player is the outer ring.
  const reversedChartDisplayData = useMemo(() => {
    return [...chartDisplayData].reverse();
  }, [chartDisplayData]);

  // Dynamically adjusts label font size based on player count.
  const { className, style } = useMemo(() => {
    const baseClassName = "font-bold justify-center pointer-events-none fill-foreground dark:fill-background";
    let sizeClassName = '';
    const style: { fontSize?: string } = {};

    switch (data.length) {
      case 1:
        sizeClassName = 'text-base';
        break;
      case 2:
        sizeClassName = 'text-sm';
        break;
      case 3:
        sizeClassName = 'text-xs';
        break;
      case 4:
        style.fontSize = '10px';
        break;
      default:
        if (data.length >= 5) {
          style.fontSize = '8px';
        } else {
          sizeClassName = 'text-xs';
        }
        break;
    }

    return {
      className: `${baseClassName} ${sizeClassName}`.trim(),
      style,
    };
  }, [data.length]);

  return (
    <div className="relative w-full aspect-square max-h-[400px] min-h-[300px] flex items-center justify-center">
      {/* Render chart only on the client to avoid SSR issues. */}
      {isClient && (
        <RadialBarChart
          responsive
          width="100%"
          height="100%"
          innerRadius="75%"
          outerRadius="100%"
          data={reversedChartDisplayData}
          startAngle={90}
          endAngle={-270}
          margin={{ top: 10, bottom: 10, right: 0, left: 0 }}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} scale="auto" reversed={false} />
          <RadialBar background={{ fill: 'hsl(var(--card))' }} dataKey="Success Rate" angleAxisId={0}>
            <LabelList
              position="insideEnd"
              offset={2}
              className={className}
              style={style}
              formatter={(label: unknown) => {
                if (typeof label === 'number') {
                  return `${label}%`;
                }
                return '';
              }}
            />
          </RadialBar>
        </RadialBarChart>
      )}
      {/* Central text label for the chart. */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">Success Rate</p>
        </div>
      </div>
    </div>
  );
});

ScoreRadialChart.displayName = 'ScoreRadialChart';
export { ScoreRadialChart };