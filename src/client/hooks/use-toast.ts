'use client';

import * as React from 'react';
import type { ToastActionElement, ToastProps } from '@/client/components/ui/toast';

const TOAST_LIMIT = 1; // Max number of toasts displayed at once.
const TOAST_REMOVE_DELAY = 5000; // Delay in ms before a toast is removed.

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

type Action =
  | { type: 'ADD_TOAST'; toast: ToasterToast }
  | { type: 'UPDATE_TOAST'; toast: Partial<ToasterToast> }
  | { type: 'DISMISS_TOAST'; toastId?: ToasterToast['id'] }
  | { type: 'REMOVE_TOAST'; toastId?: ToasterToast['id'] };

interface State {
  toasts: ToasterToast[];
}

let memoryState: State = { toasts: [] }; // Global toast state, managed outside of React.
const listeners = new Map<string, (state: State) => void>(); // Map of active listeners for state changes.
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>(); // Stores timeouts for removing toasts.

// Manages the toast state based on actions.
const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case 'UPDATE_TOAST':
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case 'DISMISS_TOAST':
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toastId || action.toastId === undefined
            ? { ...t, open: false }
            : t
        ),
      };

    case 'REMOVE_TOAST':
      if (action.toastId === undefined) { // If no ID is provided, clear all toasts.
        return { ...state, toasts: [] };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };

    default:
      return state;
  }
};

// Dispatches an action to update the global state and notify listeners.
function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

let count = 0; // Counter for generating unique toast IDs.
const genId = () => {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

// Schedules a toast's automatic removal after dismissal.
const handleDismiss = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({ type: 'REMOVE_TOAST', toastId });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};

// Creates and displays a new toast.
export const toast = (props: Omit<ToasterToast, 'id'>) => {
  const id = genId();

  const update = (newProps: ToasterToast) =>
    dispatch({ type: 'UPDATE_TOAST', toast: { ...newProps, id } });
  
  const dismiss = () => {
    dispatch({ type: 'DISMISS_TOAST', toastId: id });
    handleDismiss(id);
  };

  dispatch({
    type: 'ADD_TOAST',
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  return { id, dismiss, update };
};

// React hook to subscribe a component to the global toast state.
export function useToast() {
  const [state, setState] = React.useState<State>(memoryState);
  const subscriberId = React.useId();

  React.useEffect(() => {
    listeners.set(subscriberId, setState); // Subscribe the component to state changes.
    return () => {
      listeners.delete(subscriberId); // Unsubscribe on cleanup.
    };
  }, [subscriberId]);

  const dismiss = (toastId?: string) => {
    dispatch({ type: 'DISMISS_TOAST', toastId });
    if (toastId) {
      handleDismiss(toastId);
    } else {
      state.toasts.forEach((t) => handleDismiss(t.id));
    }
  };

  return { ...state, toast, dismiss };
}