'use client';

import { useState, useCallback, memo } from 'react';
import { useAuth } from '@/client/hooks/use-auth';
import { Input } from '@/client/components/ui/input';
import { Button } from '@/client/components/ui/button';
import { Label } from '@/client/components/ui/label';
import { DialogTitle, DialogDescription } from '@/client/components/ui/dialog';
import { VisuallyHidden } from '@/client/components/ui/visually-hidden';

// Props for the PasswordResetForm component.
interface PasswordResetFormProps {
  onBack: () => void;
}

// Renders a form for users to reset their password.
const PasswordResetForm = memo(({ onBack }: PasswordResetFormProps) => {
  // Auth state and functions from the useAuth hook.
  const { resetPassword, authError } = useAuth();
  // State for the email input field.
  const [resetEmail, setResetEmail] = useState('');
  // State to track if the reset email has been sent.
  const [passwordResetSent, setPasswordResetSent] = useState(false);

  // Handles submitting the password reset form.
  const handlePasswordReset = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await resetPassword(resetEmail);
    if (success) {
      setPasswordResetSent(true);
    }
  }, [resetPassword, resetEmail]);

  // Shows a confirmation message after the reset email is sent.
  if (passwordResetSent) {
    return (
      <>
        <DialogTitle>Reset email sent <i> (if account exists) </i></DialogTitle>
        <DialogDescription>
        Click the link in the email to reset your password (check Spam)
        </DialogDescription>
        <Button onClick={onBack} className="mt-4 w-full">Back to sign in</Button>
      </>
    );
  }

  // Renders the main password reset form.
  return (
    <>
      {/* Visually hidden title and description for screen reader accessibility. */}
      <DialogTitle>
          <VisuallyHidden>Reset your password</VisuallyHidden>
      </DialogTitle>
      <DialogDescription>
          <VisuallyHidden>Enter your email to reset your password</VisuallyHidden>
      </DialogDescription>
      <form onSubmit={handlePasswordReset} className="-mt-4">
        <div className="grid grid-cols-4 items-center gap-4">
            {/* Email input field for password reset. */}
            <Label htmlFor="reset-email" className="text-center">Email</Label>
            <Input
                id="reset-email"
                name="reset-email"
                type="email"
                autoComplete="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="col-span-3"
            />

            {/* Displays any authentication errors. */}
            {authError && <p className="col-span-4 text-red-500 text-sm text-center py-2">{authError}</p>}

            {/* Action buttons to navigate back or submit the form. */}
            <Button type="button" variant="ghost" onClick={onBack}>Back</Button>
            <Button type="submit" className="col-span-3">Reset password</Button>
        </div>
      </form>
    </>
  );
});

PasswordResetForm.displayName = 'PasswordResetForm';

export { PasswordResetForm };