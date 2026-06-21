'use client';

import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type HTMLAttributes } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/client/lib/utils';

// Re-exports the Root component from Radix UI Dialog as the main Dialog component.
const Dialog = DialogPrimitive.Root;

// Re-exports the Trigger component from Radix UI Dialog.
const DialogTrigger = DialogPrimitive.Trigger;

// A styled overlay that darkens the background when the dialog is open.
const DialogOverlay = forwardRef<
  ElementRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      // Base styles and animations for the overlay.
      [
        'fixed',
        'inset-0',
        'z-50',
        'bg-black/80',
        'data-[state=open]:animate-in',
        'data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0',
        'data-[state=open]:fade-in-0',
      ],
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

// Main content container for the dialog.
const DialogContent = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { hideCloseButton?: boolean }
>(({ className, children, hideCloseButton, ...props }, ref) => (
  // Portal ensures the dialog renders at the top level of the DOM.
  <DialogPrimitive.Portal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Base styles, positioning, and animations for the content.
        [
          'fixed',
          'left-[50%]',
          'top-[50%]',
          'z-50',
          'grid',
          'w-full',
          'max-w-lg',
          'translate-x-[-50%]',
          'translate-y-[-50%]',
          'gap-4',
          'border',
          'bg-background',
          'p-6',
          'shadow-lg',
          'duration-200',
          'data-[state=open]:animate-in',
          'data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0',
          'data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95',
          'data-[state=open]:zoom-in-95',
          'data-[state=closed]:slide-out-to-left-1/2',
          'data-[state=closed]:slide-out-to-top-[48%]',
          'data-[state=open]:slide-in-from-left-1/2',
          'data-[state=open]:slide-in-from-top-[48%]',
          'sm:rounded-lg',
        ],
        className,
      )}
      {...props}
    >
      {children}
      {/* Conditionally renders the close button. */}
      {!hideCloseButton && (
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-primary data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

// Dialog header with flex layout and spacing.
const DialogHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)}
    {...props}
  />
));
DialogHeader.displayName = 'DialogHeader';

// Dialog footer with flex layout for actions.
const DialogFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
    {...props}
  />
));
DialogFooter.displayName = 'DialogFooter';

// Styled title for the dialog header.
const DialogTitle = forwardRef<
  ElementRef<typeof DialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

// Styled description for the dialog header.
const DialogDescription = forwardRef<
  ElementRef<typeof DialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

// Export all dialog components.
export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};