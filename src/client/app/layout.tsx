// Import global styles.
import '@/client/app/globals.css';

// Import React types and components.
import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

// Import custom components.
import { ConditionalHeader } from '@/client/components/common/ConditionalHeader';
import { GlobalLoadingSpinner } from '@/client/components/common/GlobalLoadingSpinner';
import { Providers } from '@/client/app/providers';
import { Footer } from '@/client/components/common/Footer';
import { Toaster } from '@/client/components/ui/toaster';
import { PaymentProcessor } from '@/client/components/payments/PaymentProcessor';

// Define the root layout component for the entire application.
export default function RootLayout() {
  return (
    <Providers>
      <ConditionalHeader />
      {/* Define the main content area with a fallback loading spinner. */}
      <main className="w-full max-w-2xl mx-auto flex flex-col justify-start grow">
        <Suspense fallback={<GlobalLoadingSpinner />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <Toaster />
      <Suspense fallback={null}>
        <PaymentProcessor />
      </Suspense>
    </Providers>
  );
}