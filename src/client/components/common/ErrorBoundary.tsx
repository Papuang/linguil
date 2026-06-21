'use client';

import { Component } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/client/components/ui/button';
import { AlertTriangle } from 'lucide-react';

// Defines the props for the ErrorBoundary component.
interface ErrorBoundaryProps {
  // The child components to render.
  children: ReactNode;
}

// Defines the state for the ErrorBoundary component.
interface ErrorBoundaryState {
  // True if an error has been caught.
  hasError: boolean;
}

// A React component that catches JavaScript errors anywhere in its child component tree.
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Display name for the component in React DevTools.
  static displayName = 'ErrorBoundary';

  // Initialize the state.
  public state: ErrorBoundaryState = {
    hasError: false,
  };

  // This lifecycle method is invoked after an error has been thrown by a descendant component.
  public static getDerivedStateFromError(): ErrorBoundaryState {
    // Return a new state object to indicate an error has occurred.
    return { hasError: true };
  }

  // Renders the component.
  public render() {
    // If an error has been caught, render a fallback UI.
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4"
          role="alert"
        >
          <div className="max-w-md w-full bg-card p-4 sm:p-6 md:p-8 rounded-lg border border-destructive/50">
            <div className="flex flex-col items-center text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
              <h1 className="text-2xl font-bold mb-4">Failed to load linguil</h1>
              <p className="mb-6 text-center text-muted-foreground">
                Try refreshing the page
              </p>
              <Button onClick={() => window.location.reload()}>Refresh</Button>
            </div>
          </div>
        </div>
      );
    }

    // If there is no error, render the child components as usual.
    return this.props.children;
  }
}

export { ErrorBoundary };