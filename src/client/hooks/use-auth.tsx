'use client';

import {
  useState,
  useEffect,
  createContext,
  useContext,
  useRef,
  useCallback,
} from 'react';
import type { ReactNode, ComponentType } from 'react';
import { navigateTo } from '@devvit/web/client';
import type { User } from '@/shared/types';
import type { AuthDialogProps } from '@/client/components/auth/AuthDialog';
import { GlobalLoadingSpinner } from '@/client/components/common/GlobalLoadingSpinner';
import { useToast } from '@/client/hooks/use-toast';
import { getAuthErrorMessage } from '@/client/lib/auth-errors';
import { useAnalytics } from '@/client/hooks/use-analytics';

// Defines the shape of the authentication context.
interface AuthContextType {
  user: User | null; // The current authenticated user.
  loading: boolean; // Indicates if authentication status is being checked.
  authError: string | null; // Stores any authentication-related error messages.
  hasPaid: boolean; // Indicates if the user has a paid subscription.
  isGooglePolling: boolean; // True if polling for Google auth completion.
  isDiscordPolling: boolean; // True if polling for Discord auth completion.
  fetchUserProfile: () => Promise<void>; // Function to fetch the user's profile.
  cancelGooglePolling: () => void; // Function to cancel Google auth polling.
  cancelDiscordPolling: () => void; // Function to cancel Discord auth polling.
  signInWithGoogle: () => Promise<void>; // Function to initiate Google sign-in.
  signInWithDiscord: () => Promise<void>; // Function to initiate Discord sign-in.
  signInWithReddit: () => Promise<void>; // Function to initiate Reddit sign-in.
  signInWithCustomToken: (
    token: string,
    isNewUser: boolean,
    method: string
  ) => Promise<void>; // Sign in with a custom token from the backend.
  signInWithEmail: (email: string, password: string) => Promise<boolean>; // Function for email and password sign-in.
  signUpWithEmail: (
    name: string,
    email: string,
    password: string
  ) => Promise<boolean>; // Function for email and password sign-up.
  resetPassword: (email: string) => Promise<boolean>; // Function to send a password reset email.
  logout: () => Promise<void>; // Function to sign the user out.
  clearAuthError: () => void; // Function to clear any authentication errors.
  openAuthDialog: () => void; // Function to open the authentication modal.
  addSignOutCleanup: (cleanup: () => void) => void; // Adds a cleanup function to be run on sign-out.
  removeSignOutCleanup: (cleanup: () => void) => void; // Removes a cleanup function.
}

// Creates the authentication context.
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook factory to create the OAuth sign-in flow.
const useCreateOAuthFlow = (provider: 'google' | 'discord', {
  clearAuthError,
  handleAuthError,
  signInWithCustomToken,
  cancelPolling,
  setIsPolling,
  pollingIntervalRef
}: any) =>
  useCallback(async (): Promise<void> => {
    clearAuthError();
    setIsPolling(true);

    try {
      const sessionId = crypto.randomUUID();
      // 1. Register the session in the backend.
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', sessionId }),
      });

      // 2. Get the unique auth URL from the backend.
      const startRes = await fetch(
        `/api/auth/${provider}/start?sessionId=${sessionId}`
      );
      if (!startRes.ok) throw new Error('Failed to get auth URL');
      const { authUrl } = await startRes.json();

      // 3. Redirect the user to the provider's auth page.
      navigateTo(authUrl);

      const startTime = Date.now();
      const TIMEOUT_DURATION = 5 * 60 * 1000; // 5 minutes

      // 4. Start polling for completion.
      const intervalId = window.setInterval(async () => {
        if (Date.now() - startTime > TIMEOUT_DURATION) {
          cancelPolling(provider);
          handleAuthError(`Login with ${provider} timed out.`);
          return;
        }

        const res = await fetch(`/api/auth/session?sessionId=${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          // 5. When the session is complete, the backend provides the custom token.
          if (data.status === 'completed' && data.customToken) {
            cancelPolling(provider);
            // 6. Sign in with the custom token to establish the session.
            await signInWithCustomToken(
              data.customToken,
              data.isNewUser || false, // The backend determines if the user is new.
              provider
            );
          }
        }
      }, 2500); // Poll every 2.5 seconds.

      // Store the interval ID in the correct ref.
      pollingIntervalRef.current = intervalId;

    } catch (error) {
      handleAuthError(error);
      cancelPolling(provider);
    }
  }, [
    provider,
    clearAuthError,
    handleAuthError,
    signInWithCustomToken,
    cancelPolling,
    setIsPolling,
    pollingIntervalRef,
  ]);

// Provides authentication context to the application for Devvit.
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // State for the current user.
  const [user, setUser] = useState<User | null>(null);
  // State for loading status.
  const [loading, setLoading] = useState(true);
  // State for authentication errors.
  const [authError, setAuthError] = useState<string | null>(null);
  // State for the user's payment status.
  const [hasPaid, setHasPaid] = useState(false);
  // State to control the visibility of the authentication dialog.
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  // State to hold the dynamically imported AuthDialog component.
  const [AuthDialog, setAuthDialog] = useState<ComponentType<AuthDialogProps> | null>(
    null
  );
  // Ref to store cleanup functions to be run on sign-out.
  const signOutCleanup = useRef<Array<() => void>>([]);
  // Custom hook for displaying toasts.
  const { toast } = useToast();
  const { logEvent } = useAnalytics();
  const [isGooglePolling, setIsGooglePolling] = useState(false);
  const [isDiscordPolling, setIsDiscordPolling] = useState(false);
  // Use separate refs for each provider to prevent race conditions.
  const googlePollingIntervalRef = useRef<number | null>(null);
  const discordPollingIntervalRef = useRef<number | null>(null);

  const [redditUser, setRedditUser] = useState<{ username: string } | null>(null);
  const hasAttemptedRedditAutoSignIn = useRef(false);

  // Cancels a specific provider's authentication polling.
  const cancelPolling = useCallback((provider: 'google' | 'discord') => {
    if (provider === 'google') {
      setIsGooglePolling(false);
      if (googlePollingIntervalRef.current) {
        window.clearInterval(googlePollingIntervalRef.current);
        googlePollingIntervalRef.current = null;
      }
    } else {
      setIsDiscordPolling(false);
      if (discordPollingIntervalRef.current) {
        window.clearInterval(discordPollingIntervalRef.current);
        discordPollingIntervalRef.current = null;
      }
    }
  }, []);

  const cancelGooglePolling = useCallback(() => cancelPolling('google'), [cancelPolling]);
  const cancelDiscordPolling = useCallback(() => cancelPolling('discord'), [cancelPolling]);

  // Handles and formats authentication errors.
  const handleAuthError = useCallback(
    (error: unknown): void => {
      const message = getAuthErrorMessage(error);
      setAuthError(message);
      // Ensure any active polling is stopped on error.
      cancelGooglePolling();
      cancelDiscordPolling();
    },
    [cancelGooglePolling, cancelDiscordPolling]
  );

  // Clears the authentication error state.
  const clearAuthError = useCallback(() => setAuthError(null), []);

  // Adds a cleanup function to the signOutCleanup ref.
  const addSignOutCleanup = useCallback((func: () => void) => {
    signOutCleanup.current.push(func);
  }, []);

  // Removes a specific cleanup function.
  const removeSignOutCleanup = useCallback((func: () => void) => {
    signOutCleanup.current = signOutCleanup.current.filter((fn) => fn !== func);
  }, []);

  // Fetches the current user's profile from the backend. This is the single source of truth for auth state.
  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await fetch('/api/user/me');
      if (response.ok) {
        const data = await response.json();
        // If the backend returns a user, set it. Otherwise, we're logged out.
        if (data && data.user) {
          setUser(data.user as User);
          setHasPaid(data.hasPaid);
        } else {
          setUser(null);
          setHasPaid(false);
        }
      } else {
        // A non-ok response (e.g., 401) also means the user is logged out.
        setUser(null);
        setHasPaid(false);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      setAuthError('Failed to connect to user service.');
    }
  }, []);

  // Signs in the user by exchanging a custom token for a session cookie.
  const signInWithCustomToken = useCallback(
    async (token: string, isNewUser: boolean, method: string): Promise<void> => {
      setLoading(true);
      clearAuthError();
      try {
        // The backend exchanges the short-lived custom token for a session cookie.
        const exchangeRes = await fetch('/api/auth/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (!exchangeRes.ok) {
          const exchangeData = await exchangeRes.json();
          throw { code: exchangeData.code || 'TOKEN_EXCHANGE_FAILED' };
        }

        // The cookie is now set. Fetch the user profile to sync the client state.
        await fetchUserProfile();

        // Log the successful authentication event.
        logEvent(isNewUser ? 'sign_up' : 'login', { method });

        setIsAuthDialogOpen(false);
      } catch (error) {
        handleAuthError(error);
      } finally {
        setLoading(false);
      }
    },
    [clearAuthError, handleAuthError, logEvent, fetchUserProfile]
  );
  
  // On initial mount, check if the user is already logged in via session cookie.
  useEffect(() => {
    const fetchInitialUser = async () => {
      setLoading(true);
      await fetchUserProfile();
      setLoading(false);
      setAuthError(null);
      setIsAuthDialogOpen(false);
    };
    fetchInitialUser();
  }, [fetchUserProfile]);

  useEffect(() => {
    fetch('/api/auth/reddit')
      .then((res) => res.json())
      .then((data) => {
        if (data.loggedIn && data.username) {
          setRedditUser({ username: data.username });
        } else {
          setRedditUser(null);
        }
      })
      .catch(() => setRedditUser(null));
  }, []);

  // Listens for real-time changes to the user's payment status by polling.
  useEffect(() => {
    if (!user?.uid) return;

    let isSubscribed = true;
    // Set up an interval to periodically check the user's profile.
    const pollInterval = window.setInterval(async () => {
      try {
        const response = await fetch('/api/user/me');
        if (response.ok && isSubscribed) {
          const data = await response.json();
          // Sync local `hasPaid` state if it differs from the server.
          if (hasPaid !== data.hasPaid) {
            setHasPaid(data.hasPaid);
          }
        }
      } catch (error) {
        // Silently log polling errors to avoid disrupting the user.
        console.error('Failed to poll user profile:', error);
      }
    }, 30000); // Poll every 30 seconds.

    const cleanup = () => {
      isSubscribed = false;
      window.clearInterval(pollInterval);
    };
    // Add the cleanup function to the sign-out cleanup.
    addSignOutCleanup(cleanup);
    // Cleanup the listener on component unmount or when the user changes.
    return () => {
      cleanup();
      removeSignOutCleanup(cleanup);
    };
  }, [user, hasPaid, addSignOutCleanup, removeSignOutCleanup]);

    const signInWithReddit = useCallback(async (): Promise<void> => {
        clearAuthError();
        setLoading(true);
        try {
        // Call the backend proxy to initiate Reddit sign-in.
        const response = await fetch('/api/auth/reddit', {
            method: 'POST',
        });
        
        const data = await response.json();

        if (!response.ok) {
            // The proxy should return a structured error.
            throw new Error(data.error || 'Reddit sign-in failed.');
        }

        if (!data.token) {
            throw new Error('No custom token received from Reddit sign-in.');
        }

        // Use the custom token to establish the app session.
        await signInWithCustomToken(data.token, data.isNewUser || false, 'reddit');
        setIsAuthDialogOpen(false); // Close dialog on success.

        } catch (error) {
        handleAuthError(error);
        } finally {
        setLoading(false);
        }
    }, [clearAuthError, handleAuthError, signInWithCustomToken]);

    useEffect(() => {
        if (!loading && !user && redditUser && !hasAttemptedRedditAutoSignIn.current) {
        hasAttemptedRedditAutoSignIn.current = true;
        signInWithReddit();
        }
    }, [loading, user, redditUser, signInWithReddit]);

  // Specific sign-in functions for each OAuth provider.
  const signInWithGoogle = useCreateOAuthFlow('google', {
    clearAuthError,
    handleAuthError,
    signInWithCustomToken,
    cancelPolling,
    setIsPolling: setIsGooglePolling,
    pollingIntervalRef: googlePollingIntervalRef,
  });
  const signInWithDiscord = useCreateOAuthFlow('discord', {
    clearAuthError,
    handleAuthError,
    signInWithCustomToken,
    cancelPolling,
    setIsPolling: setIsDiscordPolling,
    pollingIntervalRef: discordPollingIntervalRef,
  });

  // Handles sign-in with email and password.
  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      clearAuthError();
      if (!email || !password) {
        setAuthError('Missing email or password');
        return false;
      }
      setLoading(true);
      try {
        // Use the backend proxy to securely sign the user in.
        const response = await fetch('/api/auth/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (!response.ok) {
          const data = await response.json();
          throw { code: data.code || 'SIGN_IN_FAILED' };
        }
        
        // After successful proxy call, the session is set. Fetch the user profile.
        await fetchUserProfile();
        logEvent('login', { method: 'email' });
        setIsAuthDialogOpen(false);
        return true;
      } catch (error) {
        handleAuthError(error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [clearAuthError, handleAuthError, logEvent, fetchUserProfile]
  );

  // Handles new user sign-up with email and password.
  const signUpWithEmail = useCallback(
    async (name: string, email: string, password: string): Promise<boolean> => {
      clearAuthError();
      if (!name.trim() || !email || !password) {
        setAuthError('Missing name, email or password');
        return false;
      }
      setLoading(true);
      try {
        // 1. Call the backend to create the user account.
        const createRes = await fetch('/api/create-user-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        const createData = await createRes.json();
        if (!createRes.ok) {
          throw new Error(
            createData.error?.message || 'Failed to create user account.'
          );
        }

        // The backend is expected to return a custom token for the new user.
        if (!createData.token) {
          throw new Error('No custom token received after sign up.');
        }

        // 2. Use the custom token to immediately sign the new user in.
        await signInWithCustomToken(createData.token, true, 'email');
        return true;
      } catch (error) {
        handleAuthError(error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [clearAuthError, handleAuthError, signInWithCustomToken]
  );

  // Handles password reset requests.
  const resetPassword = useCallback(
    async (email: string): Promise<boolean> => {
      clearAuthError();
      if (!email) {
        setAuthError('Email is required');
        return false;
      }
      try {
        // Use the backend proxy to securely request a password reset.
        const res = await fetch('/api/auth/password-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Password reset failed');
        }
        toast({
          title: 'Password reset email sent',
          description: 'Check your inbox for a reset link',
        });
        return true;
      } catch (error) {
        handleAuthError(error);
        return false;
      }
    },
    [clearAuthError, handleAuthError, toast]
  );

  // Handles user sign-out.
  const logout = useCallback(async (): Promise<void> => {
    try {
      // Call the backend endpoint to clear the session cookie.
      await fetch('/api/auth/logout', { method: 'POST' });
      logEvent('logout', {});
    } catch (error) {
      console.error('Sign out failed:', error);
      toast({
        title: 'Sign-out failed',
        description: 'An error occurred while signing out',
        variant: 'destructive',
      });
    } finally {
      // Run all registered cleanup functions.
      signOutCleanup.current.forEach((cleanup) => cleanup());
      signOutCleanup.current = [];
      // After logging out on the server, fetch the profile again to clear the local state.
      await fetchUserProfile();
    }
  }, [logEvent, toast, fetchUserProfile]);

  // Dynamically loads and opens the authentication dialog.
  const openAuthDialog = useCallback(() => {
    if (AuthDialog) {
      setIsAuthDialogOpen(true);
    } else {
      // Lazy-load the dialog component to improve initial page load.
      import('@/client/components/auth/AuthDialog').then((module) => {
        setAuthDialog(() => module.AuthDialog);
        setIsAuthDialogOpen(true);
      });
    }
  }, [AuthDialog]);

  // The value provided to the AuthContext.
  const value = {
    user,
    loading,
    authError,
    hasPaid,
    isGooglePolling,
    isDiscordPolling,
    cancelGooglePolling,
    cancelDiscordPolling,
    signInWithGoogle,
    signInWithDiscord,
    signInWithReddit,
    signInWithCustomToken,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    logout,
    clearAuthError,
    openAuthDialog,
    addSignOutCleanup,
    removeSignOutCleanup,
    fetchUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Show a global spinner while loading. */}
      {loading ? <GlobalLoadingSpinner /> : children}
      {/* Dynamically render the AuthDialog when needed. */}
      {AuthDialog && (
        <AuthDialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen} />
      )}
    </AuthContext.Provider>
  );
};

// Custom hook to easily consume the AuthContext.
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Throw an error if useAuth is used outside of an AuthProvider.
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};