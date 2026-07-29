'use client';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Header } from '@/components/common/Header';
import dynamic from 'next/dynamic';
import { Info } from 'lucide-react';
import type { SVGProps } from 'react';

// Dynamically import components to reduce the initial bundle size.
const AuthButton = dynamic(() => import('@/components/auth/AuthButton').then(mod => mod.AuthButton), {
  ssr: false,
});
const AnalyticsTracker = dynamic(() => import('@/components/common/AnalyticsTracker').then(mod => mod.AnalyticsTracker), {
    ssr: false,
});
const DarkModeToggleSwitch = dynamic(() => import('@/components/common/DarkModeToggleSwitch').then(mod => mod.DarkModeToggleSwitch), {
    ssr: false,
});

// GitHub icon
const GithubIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg role="img" className="fill-primary-foreground" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
    <title>GitHub</title>
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

// Discord icon
const DiscordIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg
      {...props}
      role="img"
      className="fill-primary-foreground"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
    >
      <title>Discord</title>
      <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/>
    </svg>
  );

// The main landing page, providing options to play, authenticate, toggle dark mode, view the Privacy Policy, and contribute.
export default function HomePage() {
  return (
    <ErrorBoundary>
      <div className="flex flex-col min-h-screen">
        <div className="grow flex flex-col items-center justify-center gap-6 text-center">
          <Header />
          <h1 className="sr-only">linguil | The daily language guessing game</h1>
          <h2 className="text-xs italic -mb-1 -mt-6 text-center">The daily language guessing game</h2>
          {/* Link to the main game page. */}
          <Link href="/game" className="w-full max-w-xs">
              <Button size="lg" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-xl h-14">
                  Play
              </Button>
          </Link>
          {/* Authentication button for users. */}
          <div className="w-full max-w-xs">
            <AuthButton />
          </div>
          {/* Dark mode toggle switch. */}
          <div className="w-full max-w-xs flex justify-center">
            <DarkModeToggleSwitch variant="gamepage" />
          </div>
           {/* Privacy policy link. */}
          <Button asChild variant="ghost" size="icon" className="text-primary hover:bg-transparent hover:text-primary/90 -mt-3">
            <Link href="/privacy" aria-label="Privacy Policy">
              <Info />
            </Link>
          </Button>
        </div>

        {/* GitHub link. */}
        <div className="fixed bottom-20 right-3 z-1 transform-gpu">
          <Button asChild variant="ghost" className="h-7 w-min text-primary-foreground bg-muted hover:bg-muted/90 hover:text-primary-foreground/90">
            <Link href="https://github.com/linguil/linguil"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Contribute on GitHub">
              <GithubIcon />
              <span className="text-sm font-medium">Contribute</span>
            </Link>
          </Button>
        </div>
        {/* Discord link */}
        <div className="fixed bottom-20 left-3 z-1 transform-gpu">
            <Button asChild variant="ghost" className="h-7 w-min text-primary-foreground bg-muted hover:bg-muted/90 hover:text-primary-foreground/90">
                <Link href="https://discord.com/discovery/applications/1473406949792940247"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Add App on Discord">
                    <DiscordIcon />
                    <span className="text-sm font-medium">Add to Server</span>
                </Link>
            </Button>
        </div>
        <AnalyticsTracker />
      </div>
    </ErrorBoundary>
  );
}