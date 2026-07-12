'use client';

import { useAuth } from '@/client/hooks/use-auth';
import { Button } from '@/client/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/client/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/client/components/ui/dropdown-menu';
import { LogOut } from 'lucide-react';
import { LoadingSpinner } from '@/client/components/common/LoadingSpinner';

// Renders a sign-in button or a user avatar with a dropdown, based on auth state.
const AuthButton = () => {
  // Retrieve auth state and functions from the useAuth hook.
  const { user, loading, logout, signInWithReddit } = useAuth();

  // Display a spinner while authentication status is loading.
  if (loading) {
    return (
      <div className="h-10 w-10 flex items-center justify-center">
        <LoadingSpinner className="h-5 w-5" />
      </div>
    );
  }

  // If the user is authenticated, show their avatar and a dropdown menu.
  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-10 w-10 rounded-full bg-transparent hover:bg-transparent focus:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            aria-label="Open user menu"
          >
            <Avatar className="h-10 w-10">
              {/* Display user's photo or a fallback initial. */}
              <AvatarImage src={user.photoURL ?? undefined} alt={user.displayName ?? ''} />
              <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" forceMount>
          {/* The sign-out button within the dropdown. */}
          <DropdownMenuItem onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // If unauthenticated, show a button to open the sign-in dialog.
  return <Button onClick={signInWithReddit}>Sign in</Button>;
};

AuthButton.displayName = 'AuthButton';

export { AuthButton };