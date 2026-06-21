// Maps simplified, server-sent error codes to user-friendly messages.
export const getAuthErrorMessage = (error: unknown): string => {
  let message = 'An unexpected error occurred. Please try again.';

  if (typeof error === 'string') {
    return error;
  }

  // Check for a server-sent error object.
  const errorObj = error as { message?: string; code?: string };
  const code = errorObj.code;
  const errorMessage = errorObj.message;

  if (typeof code === 'string') {
    switch (code) {
      case 'INVALID_CREDENTIALS':
        message = 'Incorrect email or password.';
        break;
      case 'EMAIL_EXISTS':
        message = 'An account with this email already exists.';
        break;
      case 'WEAK_PASSWORD':
        message = 'Your password is too weak. It must be at least 6 characters long.';
        break;
      case 'POPUP_BLOCKED':
        message = 'Sign-in popup blocked—please allow popups for this site.';
        break;
      case 'USER_CANCELLED':
        message = 'The sign-in process was cancelled.';
        break;
      case 'SESSION_EXPIRED':
          message = 'Your session has expired. Please sign in again.';
          break;
      default:
        // Use the server's message if available, otherwise use the code.
        message = errorMessage || `An unknown error occurred (${code}).`;
        break;
    }
  } else if (errorMessage) {
    message = errorMessage;
  }
  return message;
};