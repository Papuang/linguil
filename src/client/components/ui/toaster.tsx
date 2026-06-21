'use client';

import { useToast } from '@/client/hooks/use-toast';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/client/components/ui/toast';

// Renders all the toasts.
export function Toaster() {
  // Gets the list of toasts from the useToast hook.
  const { toasts } = useToast();

  return (
    // Manages the state of the toasts.
    <ToastProvider>
      {/* Maps over the toasts and renders each one. */}
      {toasts.map(({ id, title, description, action, ...props }) => (
        <Toast key={id} {...props}>
          <div className="grid gap-1">
            {/* Renders the title if it exists. */}
            {title && <ToastTitle>{title}</ToastTitle>}
            {/* Renders the description if it exists. */}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          {/* Renders the action button if it exists. */}
          {action}
          {/* Renders the close button. */}
          <ToastClose />
        </Toast>
      ))}
      {/* The viewport where the toasts are rendered. */}
      <ToastViewport />
    </ToastProvider>
  );
}