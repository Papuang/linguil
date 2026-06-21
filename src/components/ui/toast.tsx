'use client';

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type ReactElement,
} from 'react';
import * as ToastPrimitives from '@radix-ui/react-toast';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

// Manages the toast state.
const ToastProvider = ToastPrimitives.Provider;

// The viewport where toasts are rendered.
const ToastViewport = forwardRef<
  ElementRef<typeof ToastPrimitives.Viewport>,
  ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    // Combines base viewport styles with custom class names.
    className={cn(
      // Classes for positioning and styling the viewport.
      [
        'fixed',
        'top-0',
        'z-100',
        'flex',
        'max-h-screen',
        'w-full',
        'flex-col-reverse',
        'p-4',
        'sm:bottom-0',
        'sm:right-0',
        'sm:top-auto',
        'sm:flex-col',
        'md:max-w-[420px]',
      ],
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

// Defines different variants of the toast.
const toastVariants = cva(
  // Base classes for all toast variants.
  [
    'group',
    'pointer-events-auto',
    'relative',
    'flex',
    'w-full',
    'items-center',
    'justify-between',
    'space-x-4',
    'overflow-hidden',
    'rounded-md',
    'border',
    'p-6',
    'pr-8',
    'shadow-lg',
    'transition-all',
    'data-[swipe=cancel]:translate-x-0',
    'data-[swipe=end]:translate-x-(--radix-toast-swipe-end-x)',
    'data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x)',
    'data-[swipe=move]:transition-none',
    'data-[state=open]:animate-in',
    'data-[state=closed]:animate-out',
    'data-[swipe=end]:animate-out',
    'data-[state=closed]:fade-out-80',
    'data-[state=closed]:slide-out-to-right-full',
    'data-[state=open]:slide-in-from-top-full',
    'data-[state=open]:sm:slide-in-from-bottom-full',
  ],
  {
    variants: {
      variant: {
        // Default toast style.
        default: ['border', 'bg-background', 'text-foreground'],
        // Destructive toast style.
        destructive: [
          'destructive',
          'group',
          'border-destructive',
          'bg-destructive',
          'text-destructive-foreground',
        ],
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

// The main Toast component.
const Toast = forwardRef<
  ElementRef<typeof ToastPrimitives.Root>,
  ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      // Applies toast variants and additional class names.
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

// An action button for a toast.
const ToastAction = forwardRef<
  ElementRef<typeof ToastPrimitives.Action>,
  ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    // Combines base styles with custom class names.
    className={cn(
      // Base classes for the action button.
      [
        'inline-flex',
        'h-8',
        'shrink-0',
        'items-center',
        'justify-center',
        'rounded-md',
        'border',
        'bg-transparent',
        'px-3',
        'text-sm',
        'font-medium',
        'ring-offset-background',
        'transition-colors',
        'hover:bg-secondary',
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-primary',
        'focus:ring-offset-2',
        'disabled:pointer-events-none',
        'disabled:opacity-50',
        'group-[.destructive]:border-muted/40',
        'group-[.destructive]:hover:border-destructive/30',
        'group-[.destructive]:hover:bg-destructive',
        'group-[.destructive]:hover:text-destructive-foreground',
        'group-[.destructive]:focus:ring-destructive',
      ],
      className,
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

// The close button for the toast.
const ToastClose = forwardRef<
  ElementRef<typeof ToastPrimitives.Close>,
  ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      // Base classes for the close button.
      [
        'absolute',
        'right-2',
        'top-2',
        'rounded-md',
        'p-1',
        'text-foreground/50',
        'opacity-0',
        'transition-opacity',
        'hover:text-foreground',
        'focus:opacity-100',
        'focus:outline-none',
        'focus:ring-2',
        'group-hover:opacity-100',
        'group-[.destructive]:text-red-300',
        'group-[.destructive]:hover:text-red-50',
        'group-[.destructive]:focus:ring-red-400',
        'group-[.destructive]:focus:ring-offset-red-600',
      ],
      className,
    )}
    toast-close=""
    {...props}
  >
    {/* 'X' icon for the close button. */}
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

// The title of the toast.
const ToastTitle = forwardRef<
  ElementRef<typeof ToastPrimitives.Title>,
  ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn(['text-sm', 'font-semibold'], className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

// The description of the toast.
const ToastDescription = forwardRef<
  ElementRef<typeof ToastPrimitives.Description>,
  ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn(['text-sm', 'opacity-90'], className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

// Props type for the Toast component.
type ToastProps = ComponentPropsWithoutRef<typeof Toast>;

// ToastAction component type, ensuring it is a ReactElement.
type ToastActionElement = ReactElement<typeof ToastAction>;

// Exports all toast-related components and types.
export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
};