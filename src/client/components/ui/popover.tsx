'use client';

import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/client/lib/utils';

// Re-exports the Root component from Radix UI Popover as the main Popover component.
const Popover = PopoverPrimitive.Root;

// Re-exports the Trigger component from Radix UI Popover.
const PopoverTrigger = PopoverPrimitive.Trigger;

// Main content container for the popover.
const PopoverContent = forwardRef<
  ElementRef<typeof PopoverPrimitive.Content>,
  ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'center', sideOffset = 4, ...props }, ref) => (
  // Portal ensures the popover is rendered at the top level of the DOM.
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      // Combines base styles with any custom class names.
      className={cn(
        // Base classes for styling, positioning, and animations.
        [
          'z-50',
          'w-72',
          'rounded-md',
          'border',
          'bg-popover',
          'p-4',
          'text-popover-foreground',
          'shadow-md',
          'outline-none',
          'data-[state=open]:animate-in',
          'data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0',
          'data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95',
          'data-[state=open]:zoom-in-95',
          'data-[side=bottom]:slide-in-from-top-2',
          'data-[side=left]:slide-in-from-right-2',
          'data-[side=right]:slide-in-from-left-2',
          'data-[side=top]:slide-in-from-bottom-2',
        ],
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

// Exports the Popover, PopoverTrigger, and PopoverContent components.
export { Popover, PopoverTrigger, PopoverContent };