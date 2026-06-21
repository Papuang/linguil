import LeaderboardPageClient from '@/client/app/leaderboard/LeaderboardPageClient';
import { AnalyticsTracker } from '@/client/components/common/AnalyticsTracker';

// Renders the leaderboard page, delegating client-side logic and data fetching.
export default function LeaderboardPage() {
  return (
    <>
      <LeaderboardPageClient />
      <AnalyticsTracker />
    </>
  );
}