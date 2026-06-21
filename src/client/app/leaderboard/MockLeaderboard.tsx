'use client';

import { lazy, Suspense } from 'react';
import { AuthButton } from '@/client/components/auth/AuthButton';
import { LoadingSpinner } from '@/client/components/common/LoadingSpinner';

// Dynamically import the Leaderboard to keep the initial load light.
// The Leaderboard itself will handle showing mock data when no players are passed.
const Leaderboard = lazy(() => import('@/client/components/leaderboard/Leaderboard').then(mod => ({ default: mod.Leaderboard })));

// Renders a lightweight, non-interactive leaderboard preview for logged-out users.
const MockLeaderboard = () => {
    return (
        <div className="relative">
            {/* An overlay with a sign-in button, prompting the user to log in. */}
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-lg">
                <p className="sr-only">Sign in to see your personal leaderboard</p>
                <AuthButton />
            </div>

            {/* The underlying Leaderboard is made non-interactive with the `inert` attribute. */}
            <div {...{ inert: true }}>
                <Suspense fallback={<div className="min-h-[550px] flex justify-center items-center"><LoadingSpinner /></div>}>
                    <Leaderboard />
                </Suspense>
            </div>

            {/* A placeholder to prevent layout shift where the AddFriendCard would be. */}
            <div className="min-h-[260px] lg:min-h-[180px]" />
        </div>
    );
};

export default MockLeaderboard;