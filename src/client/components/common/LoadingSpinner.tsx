import { memo } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/client/lib/utils';

interface LoadingSpinnerProps {
  // Optional className for custom styling.
  className?: string;
}

// A reusable loading spinner hidden from screen readers; the parent component should announce the loading state.
const LoadingSpinner = memo(({ className }: LoadingSpinnerProps) => {
  return (
    <Loader2
      className={cn('h-8 w-8 animate-spin', className)}
      aria-hidden="true"
    />
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';

export { LoadingSpinner };