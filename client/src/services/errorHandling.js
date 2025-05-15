import axios from 'axios';

// Error types
export const ErrorTypes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  SESSION_TIMEOUT: 'SESSION_TIMEOUT',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

// Error messages for different scenarios
export const ErrorMessages = {
  [ErrorTypes.NETWORK_ERROR]: 'Network connection error. Please check your internet connection.',
  [ErrorTypes.AUTH_ERROR]: 'Authentication failed. Please log in again.',
  [ErrorTypes.VALIDATION_ERROR]: 'Invalid input. Please check your data.',
  [ErrorTypes.SERVER_ERROR]: 'Server error. Please try again later.',
  [ErrorTypes.SESSION_TIMEOUT]: 'Your session has expired. Please log in again.',
  [ErrorTypes.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.'
};

// Retry configuration
const RETRY_COUNT = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// Exponential backoff implementation
const getRetryDelay = (retryCount) => {
  return INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
};

// Check if error is a network error
const isNetworkError = (error) => {
  return !error.response && error.request;
};

// Check if error is an authentication error
const isAuthError = (error) => {
  return error.response && (error.response.status === 401 || error.response.status === 403);
};

// Check if error is a session timeout
const isSessionTimeout = (error) => {
  return error.response && error.response.status === 401 && 
         error.response.data?.message?.toLowerCase().includes('expired');
};

// Get error type based on error object
export const getErrorType = (error) => {
  if (isNetworkError(error)) return ErrorTypes.NETWORK_ERROR;
  if (isSessionTimeout(error)) return ErrorTypes.SESSION_TIMEOUT;
  if (isAuthError(error)) return ErrorTypes.AUTH_ERROR;
  if (error.response?.status === 400) return ErrorTypes.VALIDATION_ERROR;
  if (error.response?.status >= 500) return ErrorTypes.SERVER_ERROR;
  return ErrorTypes.UNKNOWN_ERROR;
};

// Retry request with exponential backoff
export const retryRequest = async (requestFn, retryCount = 0) => {
  try {
    return await requestFn();
  } catch (error) {
    const errorType = getErrorType(error);

    // Don't retry for these error types
    if ([ErrorTypes.AUTH_ERROR, ErrorTypes.VALIDATION_ERROR, ErrorTypes.SESSION_TIMEOUT].includes(errorType)) {
      throw error;
    }

    // Retry for network errors and server errors
    if (retryCount < RETRY_COUNT && 
        [ErrorTypes.NETWORK_ERROR, ErrorTypes.SERVER_ERROR].includes(errorType)) {
      const delay = getRetryDelay(retryCount);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryRequest(requestFn, retryCount + 1);
    }

    throw error;
  }
};

// Format error message for display
export const formatErrorMessage = (error) => {
  const errorType = getErrorType(error);
  return ErrorMessages[errorType] || ErrorMessages[ErrorTypes.UNKNOWN_ERROR];
};