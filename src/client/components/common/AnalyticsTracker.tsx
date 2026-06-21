'use client';

import { useEffect, memo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAnalytics } from '@/client/hooks/use-analytics';

// Tracks page views for analytics using a Devvit-compatible hook.
const AnalyticsTracker = memo(() => {
  // Gets the current URL path.
  const { pathname } = useLocation();
  // Devvit-compatible analytics hook.
  const { logEvent } = useAnalytics();

  // Logs page views on path change.
  useEffect(() => {
    logEvent('page_view', { page_path: pathname });
  }, [pathname, logEvent]);

  // This component does not render any UI.
  return null;
});

AnalyticsTracker.displayName = 'AnalyticsTracker';

export { AnalyticsTracker };