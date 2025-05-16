import axios from 'axios';
import { retryRequest, formatErrorMessage, ErrorTypes, getErrorType } from './errorHandling';

// Create axios instance with default config
const api = axios.create({
  baseURL: '/api',  // This will work with Vite's proxy configuration
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const errorType = getErrorType(error);

    // Handle session timeout
    if (errorType === ErrorTypes.SESSION_TIMEOUT) {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      window.location.href = '/login';
    }

    // Format error message
    error.message = formatErrorMessage(error);
    return Promise.reject(error);
  }
);

// API request wrapper with retry mechanism
const makeRequest = async (method, url, data = null, config = {}) => {
  const requestFn = () => {
    switch (method.toLowerCase()) {
      case 'get':
        return api.get(url, config);
      case 'post':
        return api.post(url, data, config);
      case 'put':
        return api.put(url, data, config);
      case 'delete':
        return api.delete(url, config);
      default:
        throw new Error(`Unsupported method ${method}`);
    }
  };

  try {
    const response = await retryRequest(requestFn);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// API service methods
export const apiService = {
  get: (url, config) => makeRequest('get', url, null, config),
  post: (url, data, config) => makeRequest('post', url, data, config),
  put: (url, data, config) => makeRequest('put', url, data, config),
  delete: (url, config) => makeRequest('delete', url, null, config)
};