import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { cn } from '@/client/lib/utils';

// Defines props for the Input component, extending standard input attributes.
type InputProps = ComponentPropsWithoutRef<'input'>;

// A styled input component that forwards a ref to the underlying input element.
const Input = forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      // Combines base styles with any custom class names.
      className={cn(
        // Base classes for styling the input.
        [
          'flex',
          'h-10',
          'w-full',
          'rounded-md',
          'border',
          'border-border',
          'bg-background',
          'px-3',
          'py-2',
          'text-base',
          'ring-offset-background',
          // Styles for the file input button.
          'file:border-0',
          'file:bg-transparent',
          'file:text-sm',
          'file:font-medium',
          'file:text-foreground',
          // Placeholder text style.
          'placeholder:text-muted-foreground',
          // Focus-visible styles for accessibility.
          'focus-visible:outline-none',
          'focus-visible:ring-2',
          'focus-visible:ring-primary',
          'focus-visible:ring-offset-2',
          // Disabled state styles.
          'disabled:cursor-not-allowed',
          'disabled:opacity-50',
          // Responsive text size.
          'md:text-sm',
        ],
        className,
      )}
      ref={ref} // Forwards the ref to the input element.
      {...props} // Spreads other props to the input element.
    />
  );
});
// Sets display name for debugging.
Input.displayName = 'Input';

// Exports the Input component.
export { Input };