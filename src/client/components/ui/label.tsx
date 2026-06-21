'use client';

import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/client/lib/utils';

// Defines base styles for the label using cva.
const labelVariants = cva([
  'text-sm',
  'font-medium',
  'leading-none',
  // Styles for a disabled peer input.
  'peer-disabled:cursor-not-allowed',
  'peer-disabled:opacity-70',
]);

// A styled label component based on Radix UI's Label primitive.
const Label = forwardRef<
  ElementRef<typeof LabelPrimitive.Root>,
  ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  // Base Label component from Radix UI.
  <LabelPrimitive.Root
    ref={ref}
    // Combines base label variants with additional class names.
    className={cn(labelVariants(), className)}
    {...props}
  />
));
// Sets display name for debugging.
Label.displayName = LabelPrimitive.Root.displayName;

// Exports the Label component.
export { Label };