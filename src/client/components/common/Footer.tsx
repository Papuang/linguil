'use client';

import { memo } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Languages, BarChart } from 'lucide-react';
import { buttonVariants } from '@/client/components/ui/button';
import { cn } from '@/client/lib/utils';

// Defines the navigation items for the footer.
const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/game', icon: Languages, label: 'Game' },
  { href: '/leaderboard', icon: BarChart, label: 'Leaderboard' },
];

// The footer component with navigation links, using react-router-dom.
const Footer = memo(() => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-20 border-t bg-card shadow-t-lg">
      <nav className="mx-auto flex h-16 w-full max-w-[512px] items-center justify-around px-4">
        {/* Map over the navigation items and create a NavLink for each one. */}
        {navItems.map(({ href, icon: Icon, label }) => (
          <NavLink
            key={href}
            to={href}
            end
            title={label}
            aria-label={label}
            className={({ isActive }) =>
              cn(
                buttonVariants({ variant: 'ghost' }),
                'group h-12 w-12 rounded-full transition-colors hover:bg-primary/20',
                isActive && 'bg-primary/20'
              )
            }
          >
            {({ isActive }) => (
              <Icon
                className={cn(
                  'h-6 w-6 transition-colors group-hover:text-primary',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              />
            )}
          </NavLink>
        ))}
      </nav>
    </footer>
  );
});

// Set the display name for the component for easier debugging.
Footer.displayName = 'Footer';

export { Footer };