'use client';

import { useState, useCallback, memo, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@/components/ui/visually-hidden';

// Defines props for the EmailAuthForm component.
interface EmailAuthFormProps {
  onShowPasswordReset: () => void;
}

// A form for email/password sign-in and sign-up.
const EmailAuthForm = memo(({ onShowPasswordReset }: EmailAuthFormProps) => {
  // Get auth functions and error state from the useAuth hook.
  const { signInWithEmail, signUpWithEmail, authError } = useAuth();
  // State for form inputs.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Re-enable form if an error occurs.
  useEffect(() => {
    if (authError) {
      setIsSubmitting(false);
    }
  }, [authError]);

  // Handles the sign-in form submission.
  const handleSignIn = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    signInWithEmail(email, password);
  }, [signInWithEmail, email, password]);

  // Handles the sign-up form submission.
  const handleSignUp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    signUpWithEmail(name, email, password);
  }, [signUpWithEmail, name, email, password]);


  return (
    <>
        {/* Hidden title and description for screen readers. */}
        <DialogTitle asChild>
            <VisuallyHidden>Sign in with Email</VisuallyHidden>
        </DialogTitle>
        <DialogDescription asChild>
            <VisuallyHidden>Enter your details to sign in or create an account</VisuallyHidden>
        </DialogDescription>
        {/* The main form, handling sign-in on submission. */}
        <form onSubmit={handleSignIn}>
        <div className="grid gap-4 py-4">
            {/* Name input, primarily for sign-up. */}
            <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name">Name</Label>
            <Input
                id="name"
                name="name"
                type="text"
                placeholder="(if signing up)"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3 italic"
                disabled={isSubmitting}
            />
            </div>
            {/* Email input. */}
            <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email">Email</Label>
            <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="col-span-3"
                disabled={isSubmitting}
            />
            </div>
            {/* Password input. */}
            <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="password">Password</Label>
            <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="col-span-3"
                disabled={isSubmitting}
            />
            </div>
        </div>
        {/* Button to show the password reset form. */}
        <div className="flex justify-end -mt-3 mb-4">
            <button type="button" onClick={onShowPasswordReset} className="text-sm text-blue-500 hover:underline" disabled={isSubmitting}>Forgot your password?</button>
        </div>
        {/* Display authentication errors if any. */}
        {authError && <p className="text-red-500 text-sm col-span-4 text-center mb-2">{authError}</p>}
        {/* Action buttons for sign-up and sign-in. */}
        <div className="flex justify-end gap-4">
            <Button type="button" className="w-full" onClick={handleSignUp} disabled={isSubmitting}>Sign up</Button>
            <Button type="submit" className="w-full" disabled={isSubmitting}>Sign in</Button>
        </div>
        </form>
    </>
  );
});

EmailAuthForm.displayName = 'EmailAuthForm';

export { EmailAuthForm };