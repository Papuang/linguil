// Mock leaderboard data for unauthenticated users.

// Predefined list of colors for leaderboard charts.
export const CHART_COLORS = [
  'hsl(26 80% 67%)',
  'hsl(174 41% 51%)',
  'hsl(43 74% 66%)',
  'hsl(350 65% 65%)',
  'hsl(210 35% 55%)',
  'hsl(161 66% 38%)',
  'hsl(299 21% 45%)',
  'hsl(166 15% 60%)',
  'hsl(95 100% 95%)',
  'hsl(33 20% 31%)',
];

// Mock data for the success rate radial chart.
export const MOCK_SUCCESS_RATE_DATA = [
    { uid: '1', name: 'Player1', 'Success Rate': 88, fill: CHART_COLORS[0] },
    { uid: '2', name: 'Player2', 'Success Rate': 75, fill: CHART_COLORS[1] },
    { uid: '3', name: 'Player3', 'Success Rate': 62, fill: CHART_COLORS[2] },
];

// Mock data for comparison bar charts.
export const MOCK_COMPARISON_DATA = [
    { uid: '1', name: 'Player1', correct: 120, perfect: 15 },
    { uid: '2', name: 'Player2', correct: 95, perfect: 8 },
    { uid: '3', name: 'Player3', correct: 80, perfect: 4 },
];

// Max value in mock comparison data for scaling bar charts.
export const MAX_MOCK_COMPARISON_VALUE = Math.max(...MOCK_COMPARISON_DATA.flatMap(d => [d.correct, d.perfect]));