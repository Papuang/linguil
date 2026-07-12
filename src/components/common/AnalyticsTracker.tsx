'use client';

import { useEffect, memo } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import Script from 'next/script';

// Add the fbq function to the window interface to avoid TypeScript errors.
declare global {
  interface Window {
    fbq: (...args: any[]) => void;
  }
}

// Tracks page views, performance, and conversions using Firebase and Meta Pixel.
const AnalyticsTracker = memo(() => {
  const pathname = usePathname();
  const { user, isInsideDiscord } = useAuth();
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  // Initializes services and logs page views.
  useEffect(() => {
    // Do not initialize services inside the Discord client or if the pixel ID is missing.
    if (isInsideDiscord || !metaPixelId) {
      return;
    }

    // Ensure the Meta Pixel script has loaded.
    if (window.fbq) {
      // Initialize with external_id if the user is logged in, otherwise init without it.
      const config = user ? { external_id: user.uid } : {};
      window.fbq('init', metaPixelId, config);

      // Track PageView on initial load and subsequent route changes.
      window.fbq('track', 'PageView');
    }

    // Defer the initialization of Firebase services to prevent blocking the main thread.
    const timer = setTimeout(() => {
      const initializeFirebaseServices = async () => {
        try {
          const { getFirebasePerformance } = await import('@/lib/firebase/firebase');
          getFirebasePerformance();

          const { getFirebaseAnalytics } = await import('@/lib/firebase/firebase');
          const analytics = await getFirebaseAnalytics();
          if (!analytics) return;

          const { logEvent } = await import('firebase/analytics');
          logEvent(analytics, 'page_view', { page_path: pathname });
        } catch {
          // Silently fails on errors.
        }
      };
      initializeFirebaseServices();
    }, 2000);

    return () => clearTimeout(timer);
  }, [pathname, isInsideDiscord, metaPixelId, user]);

  // Renders the Meta Pixel script.
  if (isInsideDiscord || !metaPixelId) {
    return null;
  }

  return (
    <Script id="fb-pixel-script" strategy="afterInteractive">
      {`
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
      `}
    </Script>
  );
});

AnalyticsTracker.displayName = 'AnalyticsTracker';

export { AnalyticsTracker };