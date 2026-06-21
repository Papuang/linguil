'use client';

import { memo } from 'react';
import { Link } from 'react-router-dom';

// The main site header, displaying the logo which links to the homepage.
const Header = memo(() => {
  return (
    <header className="mb-2 flex justify-center">
      <Link to="/" aria-label="Homepage" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="./logo.png"
          alt="linguil logo"
          width={240}
          height={70}
          data-ai-hint="linguil logo"
        />
      </Link>
    </header>
  );
});

Header.displayName = 'Header';

export { Header };