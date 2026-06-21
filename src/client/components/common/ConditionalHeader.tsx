'use client';

import { useLocation } from 'react-router-dom';
import { memo } from 'react';
import { Header } from '@/client/components/common/Header';

// Renders the main site header on all pages except for the homepage.
const ConditionalHeader = memo(() => {
  const { pathname } = useLocation();

  const isHomePage = pathname === '/';

  return isHomePage ? null : <Header />;
});

ConditionalHeader.displayName = 'ConditionalHeader';

export { ConditionalHeader };