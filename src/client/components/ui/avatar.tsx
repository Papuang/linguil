'use client';

import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, useState, useEffect } from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn, getProxiedImageUrl } from '@/client/lib/utils';

// Main avatar container, based on Radix UI's Avatar primitive.
const Avatar = forwardRef<
  ElementRef<typeof AvatarPrimitive.Root>,
  ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    // Combines base styles with any custom class names.
    className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

// Update AvatarImage component for Devvit.
const AvatarImage = forwardRef<
  ElementRef<typeof AvatarPrimitive.Image>,
  ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, src, ...props }, ref) => {
  const [displaySrc, setDisplaySrc] = useState<string | undefined>();

  useEffect(() => {
    if (typeof src === 'string') {
      setDisplaySrc(getProxiedImageUrl(src) || undefined);
    } else {
      setDisplaySrc(undefined);
    }
  }, [src]);

  return (
    <AvatarPrimitive.Image
      ref={ref}
      src={displaySrc}
      className={cn('aspect-square h-full w-full', className)}
      {...props}
    />
  );
});
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

// Fallback displayed if the avatar image fails to load.
const AvatarFallback = forwardRef<
  ElementRef<typeof AvatarPrimitive.Fallback>,
  ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, children, ...props }, ref) => {
  // Characters with descenders that may need vertical alignment adjustment.
  const descenderChars = ['g', 'j', 'p', 'q', 'y'];
  // Gets the first character of the children, if it's a string.
  const char = typeof children === 'string' ? children.trim().charAt(0) : '';
  // Determines if the character needs padding for vertical centering.
  const needsAdjustment = descenderChars.includes(char.toLowerCase());

  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={cn(
        // Base styles for the fallback.
        'flex h-full w-full items-center justify-center rounded-full bg-muted text-primary-foreground',
        // Applies bottom padding for characters with descenders.
        needsAdjustment && 'pb-1',
        className
      )}
      {...props}
    >
      {children}
    </AvatarPrimitive.Fallback>
  );
});
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

// Export the Avatar components.
export { Avatar, AvatarImage, AvatarFallback };