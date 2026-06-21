import { memo } from 'react';
import { LoadingSpinner } from '@/client/components/common/LoadingSpinner';

// A full-screen loading indicator for global loading states.
const GlobalLoadingSpinner = memo(() => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background"
      role="status"
      aria-label="Loading application..."
    >
      <LoadingSpinner />
    </div>
  );
});

GlobalLoadingSpinner.displayName = 'GlobalLoadingSpinner';

export { GlobalLoadingSpinner };