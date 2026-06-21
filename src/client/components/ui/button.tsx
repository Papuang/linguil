import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/client/lib/utils';

// Defines button styles and variants using cva.
const buttonVariants = cva(
  // Base classes for all buttons.
  [
    'inline-flex',
    'items-center',
    'justify-center',
    'gap-2',
    'whitespace-nowrap',
    'rounded-md',
    'text-sm',
    'font-medium',
    'ring-offset-background',
    'transition-colors',
    'focus-visible:outline-none',
    'focus-visible:ring-2',
    'focus-visible:ring-primary',
    'focus-visible:ring-offset-2',
    'disabled:pointer-events-none',
    'disabled:opacity-50',
    '[&_svg]:pointer-events-none', // Disables mouse events on SVG icons within the button.
    '[&_svg]:size-4', // Sets the size of SVG icons.
    '[&_svg]:shrink-0', // Prevents SVG icons from shrinking.
  ],
  {
    variants: {
      // Defines button visual styles.
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90', // Primary action.
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90', // Destructive action.
        outline:
          'border border-border bg-muted hover:bg-primary hover:text-primary-foreground', // Secondary action.
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80', // Less prominent action.
        ghost: 'hover:bg-primary hover:text-primary-foreground', // Unobtrusive action.
        link: 'text-primary underline-offset-4 hover:underline', // Link-styled button.
      },
      // Defines button sizes.
      size: {
        default: 'h-10 px-4 py-2', // Default size.
        sm: 'h-9 rounded-md px-3', // Small size.
        lg: 'h-11 rounded-md px-8', // Large size.
        icon: 'h-10 w-10', // Icon-only button.
      },
    },
    // Default variant and size.
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

// Defines props for the Button component.
interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  // If true, renders the button as a child element, merging props.
  asChild?: boolean;
}

// Button component with ref forwarding.
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    // Renders a Slot to merge with a child element, or a standard button.
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
// Sets display name for debugging.
Button.displayName = 'Button';

// Exports the Button component and its variants.
export { Button, buttonVariants };