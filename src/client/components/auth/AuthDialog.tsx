'use client';

import { useState, useEffect, memo, useRef, lazy, Suspense } from 'react';
import { useAuth } from '@/client/hooks/use-auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/client/components/ui/dialog';
import { VisuallyHidden } from '@/client/components/ui/visually-hidden';
import { LoadingSpinner } from '@/client/components/common/LoadingSpinner';

// A spinner to indicate loading of authentication views.
const ViewLoading = ({ className }: { className: string }) => (
  <div className={className}>
    <div className="h-full flex justify-center items-center">
      <LoadingSpinner />
    </div>
  </div>
);

// Use React.lazy for dynamic imports in a Devvit-compatible way.
const AuthMethodSelector = lazy(() => import('./AuthMethodSelector').then(mod => ({ default: mod.AuthMethodSelector })));
const EmailAuthForm = lazy(() => import('./EmailAuthForm').then(mod => ({ default: mod.EmailAuthForm })));
const PasswordResetForm = lazy(() => import('./PasswordResetForm').then(mod => ({ default: mod.PasswordResetForm })));

// Defines the authentication views.
type AuthView = 'selector' | 'email' | 'reset';

// Defines props for the AuthDialog component.
export type AuthDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// The main authentication dialog, memoized for performance.
const AuthDialog = memo(({ open, onOpenChange }: AuthDialogProps) => {
  const { clearAuthError, isGooglePolling, cancelGooglePolling } = useAuth();
  const [view, setView] = useState<AuthView>('selector');
  const dialogContentRef = useRef<HTMLDivElement>(null);

  // Reset view and clear auth errors on dialog close.
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setView('selector');
        clearAuthError();
      }, 150); // Delay for exit animation.
      return () => clearTimeout(timer);
    }
  }, [open, clearAuthError]);

  // Focus the first interactive element when the dialog opens.
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        const container = dialogContentRef.current;
        if (container) {
          const focusable = container.querySelector(
            'button, [href], input, select, textarea'
          ) as HTMLElement | null;
          if (focusable) {
            focusable.focus();
          }
        }
      }, 150); // Delay for entry animation.
      return () => clearTimeout(timer);
    }
  }, [open, view]);

  // Render the current authentication view.
  const renderContent = () => {
    if (isGooglePolling) {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center h-[220px]">
          <LoadingSpinner />
          <p className="mt-4 font-semibold text-lg text-gray-800">Awaiting sign-in...</p>
          <p className="text-sm text-gray-600 mt-2">Complete Google sign-in in browser</p>
          <button onClick={cancelGooglePolling} className="mt-4 text-xs text-blue-500 hover:underline">
            Cancel
          </button>
        </div>
      );
    }

    switch (view) {
      case 'email':
        return (
          <Suspense fallback={<ViewLoading className="h-[328px]" />}>
            <EmailAuthForm onShowPasswordReset={() => setView('reset')} />
          </Suspense>
        );
      case 'reset':
        return (
          <Suspense fallback={<ViewLoading className="h-[164px]" />}>
            <PasswordResetForm onBack={() => setView('selector')} />
          </Suspense>
        );
      case 'selector':
      default:
        return (
          <Suspense fallback={<ViewLoading className="h-[152px]" />}>
            <AuthMethodSelector onSelectEmail={() => requestAnimationFrame(() => setView('email'))} />
          </Suspense>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={dialogContentRef}
        hideCloseButton
        className="w-[calc(100%-2rem)] max-w-[425px] p-4 sm:p-6 bg-white rounded-lg shadow-md"
      >
        {/* Hidden title and description for screen readers. */}
        <VisuallyHidden>
          <DialogTitle>Sign in or sign up</DialogTitle>
          <DialogDescription>User authentication dialog</DialogDescription>
        </VisuallyHidden>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
});

AuthDialog.displayName = 'AuthDialog';

export { AuthDialog };