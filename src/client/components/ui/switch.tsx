'use client';

import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import { cn } from '@/client/lib/utils';

// A toggle switch component built on Radix UI's Switch primitive.
const Switch = forwardRef<
  ElementRef<typeof SwitchPrimitives.Root>,
  ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> & { children?: ReactNode }
>(({ className, children, ...props }, ref) => (
  // The root element of the switch.
  <SwitchPrimitives.Root
    className={cn(
      // Base classes for styling the switch track.
      [
        'peer',
        'inline-flex',
        'h-6',
        'w-11',
        'shrink-0',
        'cursor-pointer',
        'items-center',
        'rounded-full',
        'border-2',
        'border-transparent',
        'transition-colors',
        'focus-visible:outline-none',
        'focus-visible:ring-2',
        'focus-visible:ring-primary',
        'focus-visible:ring-offset-2',
        'focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed',
        'disabled:opacity-50',
        'data-[state=checked]:bg-primary', // Checked state style.
        'data-[state=unchecked]:bg-muted', // Unchecked state style.
      ],
      className,
    )}
    {...props}
    ref={ref}
  >
    {/* The thumb (sliding part) of the switch. */}
    <SwitchPrimitives.Thumb
      className={cn([
        'pointer-events-none',
        'flex',
        'h-5',
        'w-5',
        'items-center',
        'justify-center',
        'rounded-full',
        'bg-background',
        'shadow-lg',
        'ring-0',
        'transition-transform',
        'data-[state=checked]:translate-x-5', // Moves thumb when checked.
        'data-[state=unchecked]:translate-x-0', // Thumb at start when unchecked.
      ])}
    >
      {/* Renders children passed to the switch, like an icon. */}
      {children}
    </SwitchPrimitives.Thumb>
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

// Exports the Switch component.
export { Switch };