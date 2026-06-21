'use client';

import { memo, type SVGProps } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@/components/ui/visually-hidden';

// A custom SVG icon for Google.
const GoogleIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg
      {...props}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="translate(3,3)" fill="currentColor">
        <path
          d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z"
        />
        <path
          d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1205 10.2109 14.4545 9 14.4545C6.96273 14.4545 5.26091 13.0395 4.63409 11.16H1.61591V13.4918C3.105 16.2218 5.83636 18 9 18Z"
        />
        <path
          d="M4.63409 11.16C4.425 10.56 4.305 9.90955 4.305 9.20455C4.305 8.5 4.425 7.84909 4.63409 7.24909V4.91727H1.61591C0.945 6.13773 0.525 7.585 0.525 9.20455C0.525 10.8241 0.945 12.2714 1.61591 13.4918L4.63409 11.16Z"
        />
        <path
          d="M9 3.95455C10.3214 3.95455 11.5077 4.41409 12.4786 5.34182L15.0218 2.8C13.4673 1.23318 11.43 0.363636 9 0.363636C5.83636 0.363636 3.105 2.18727 1.61591 4.91727L4.63409 7.24909C5.26091 5.37273 6.96273 3.95455 9 3.95455Z"
        />
      </g>
    </svg>
  );

GoogleIcon.displayName = 'GoogleIcon';

// A custom SVG icon for Discord.
const DiscordIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/>
    </svg>
  );
DiscordIcon.displayName = 'DiscordIcon';

// Defines props for the AuthMethodSelector component.
interface AuthMethodSelectorProps {
  onSelectEmail: () => void;
}

// A component to select an authentication method (Google or email).
const AuthMethodSelector = memo(({ onSelectEmail }: AuthMethodSelectorProps) => {
  // Get the Google sign-in function and auth error from the useAuth hook.
  const { signInWithGoogle, signInWithDiscord, authError } = useAuth();

  return (
    <>
        {/* Hidden title and description for screen readers. */}
        <DialogTitle asChild>
            <VisuallyHidden>Sign in</VisuallyHidden>
        </DialogTitle>
        <DialogDescription asChild>
            <VisuallyHidden>
                Choose your preferred sign-in method
            </VisuallyHidden>
        </DialogDescription>
        <div className="grid gap-4 py-4">
        {/* Button to sign in with Google. */}
        <Button onClick={signInWithGoogle} className="flex items-center justify-center w-full">
            <GoogleIcon className="mr-2 h-4 w-4" />
            Sign in with Google
        </Button>
        {/* Button to sign in with Discord. */}
        <Button onClick={signInWithDiscord} className="flex items-center justify-center w-full">
            <DiscordIcon className="mr-2 h-4 w-4" />
            Sign in with Discord
        </Button>
        {/* Display authentication errors if any. */}
        {authError && <p className="text-red-500 text-sm text-center">{authError}</p>}
        {/* Button to navigate to the email sign-in form. */}
        <Button onClick={onSelectEmail} className="flex items-center justify-center w-full">
            <Mail className="mr-2 h-4 w-4" />
            Sign in with email
        </Button>
        </div>
    </>
  );
});

AuthMethodSelector.displayName = 'AuthMethodSelector';

export { AuthMethodSelector };