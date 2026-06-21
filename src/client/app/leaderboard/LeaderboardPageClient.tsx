'use client';

import { useState, lazy, Suspense, useMemo } from 'react';
import { useAuth } from '@/client/hooks/use-auth';
import { AuthButton} from '@/client/components/auth/AuthButton';
import { useToast } from '@/client/hooks/use-toast';
import useLocalStorage from '@/client/hooks/use-local-storage';
import { LoadingSpinner } from '@/client/components/common/LoadingSpinner';
import { useLeaderboard } from '@/client/hooks/use-leaderboard';
import { DarkModeToggleSwitch } from '@/client/components/common/DarkModeToggleSwitch';
import type { PlayerStats } from '@/shared/types';
import MockLeaderboard from './MockLeaderboard';

// Dynamically import the Leaderboard component to reduce bundle size, with a loading spinner as a fallback.
const Leaderboard = lazy(() => import('@/client/components/leaderboard/Leaderboard').then(mod => ({ default: mod.Leaderboard })));

// Dynamically import the AddFriendCard component, also with a loading fallback.
const AddFriendCard = lazy(() => import('@/client/components/leaderboard/AddFriendCard').then(mod => ({ default: mod.AddFriendCard })));

// Define an array of colors for the chart.
const CHART_COLORS = [
    'hsl(26 80% 67%)', // Warm Orange
    'hsl(174 41% 51%)', // Teal
    'hsl(43 74% 66%)', // Yellow-Orange
    'hsl(350 65% 65%)', // Pinkish-Red
    'hsl(210 35% 55%)', // Blue
];

// This component renders the client-side logic for the leaderboard page.
const AuthenticatedView = () => {
  const { user } = useAuth();
  // Get the toast function for displaying notifications.
  const { toast } = useToast();
  // Use local storage to persist the selected chart color.
  const [chartColor, setChartColor] = useLocalStorage<string>('chartColor', CHART_COLORS[0]);
  // State to manage the friend's UID input field.
  const [friendUid, setFriendUid] = useState('');

  // Get leaderboard data and functions from the useLeaderboard hook.
  const { players, handleAddFriend, handleRemoveFriend, handleUpdateName } = useLeaderboard();
  const currentPlayer = useMemo(() => players.find(p => p.uid === user?.uid), [players, user]);

  // Function to copy the user's UID to the clipboard.
  const handleCopy = () => {
    if (user) {
        navigator.clipboard.writeText(user.uid);
        toast({
            title: 'ID copied',
            description: 'Your ID has been copied to your clipboard',
        });
    }
  };

  return (
    <>
        <div className="relative">
            {/* Show DarkModeToggleSwitch if the user is authenticated. */}
            {user && (
                <div className="absolute top-6 right-6 z-20">
                    <DarkModeToggleSwitch variant="gamepage" />
                </div>
            )}
            {/* The Leaderboard is rendered with the user's actual data. */}
            <Suspense fallback={<div className="min-h-[550px] flex justify-center items-center"><LoadingSpinner /></div>}>
                <Leaderboard 
                    players={players as PlayerStats[]} 
                    chartColor={chartColor} 
                    onChartColorChange={setChartColor}
                    onRemoveFriend={handleRemoveFriend}
                    onUpdateName={handleUpdateName}
                    currentUserId={user?.uid}
                />
            </Suspense>
        </div>

        {/* Show the AddFriendCard if the user is authenticated. */}
        {currentPlayer ? (
            <Suspense fallback={<div className="min-h-[260px] lg:min-h-[180px] flex justify-center items-center"><LoadingSpinner /></div>}>
                <AddFriendCard
                    friendUid={friendUid}
                    onFriendUidChange={setFriendUid}
                    onAddFriend={async (uid: string) => {
                        await handleAddFriend(uid);
                        setFriendUid('');
                    }}
                    onCopy={handleCopy}
                    user={currentPlayer}
                />
            </Suspense>
        ) : null}
    </>
  )
}

// This component renders the client-side logic for the leaderboard page.
const LeaderboardPageClient = () => {
  // Get user authentication status and data from the useAuth hook.
  const { user, loading } = useAuth();

  // Show a loading spinner while checking the authentication status.
  if (loading) {
    return <div className="min-h-screen flex justify-center items-center"><LoadingSpinner /></div>;
  }

  // Render the leaderboard page layout.
  return (
    <div className="w-full text-center pb-24 px-4 pt-2 md:pt-4">
        <div className="min-h-[550px] flex flex-col justify-center">
            <div className="w-full flex justify-end mb-4 h-10">
            {/* Show the AuthButton if the user is authenticated. */}
            {user && (
                <div className="relative z-20">
                    <AuthButton />
                </div>
            )}
            </div>

            {user ? <AuthenticatedView/> : <MockLeaderboard />}
        </div>
    </div>
  );
}

export default LeaderboardPageClient;