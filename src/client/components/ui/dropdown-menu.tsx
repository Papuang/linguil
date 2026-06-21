'use client';

import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '@/client/lib/utils';

// Re-exports the Root component from Radix UI as the main DropdownMenu component.
const DropdownMenu = DropdownMenuPrimitive.Root;

// Re-exports the Trigger component from Radix UI.
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

// Main content container for the dropdown menu.
const DropdownMenuContent = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  // Portal ensures the dropdown is rendered at the top level of the DOM.
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      // Combines base styles with any custom class names.
      className={cn(
        // Base classes for styling, positioning, and animations.
        [
          'z-50',
          'min-w-[8rem]',
          'overflow-hidden',
          'rounded-md',
          'border',
          'bg-popover',
          'p-1',
          'text-popover-foreground',
          'shadow-md',
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
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

// A styled item within the dropdown menu.
const DropdownMenuItem = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.Item>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      // Base classes for item layout, transitions, and states.
      [
        'relative',
        'flex',
        'cursor-default',
        'select-none',
        'items-center',
        'gap-2',
        'rounded-sm',
        'px-2',
        'py-1.5',
        'text-sm',
        'outline-none',
        'transition-colors',
        'focus:bg-primary',
        'focus:text-primary-foreground',
        'data-disabled:pointer-events-none',
        'data-disabled:opacity-50',
        '[&_svg]:pointer-events-none',
        '[&_svg]:size-4',
        '[&_svg]:shrink-0',
      ],
      // Applies inset padding if the 'inset' prop is true.
      inset && 'pl-8',
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

// Exports all dropdown menu components.
export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem };