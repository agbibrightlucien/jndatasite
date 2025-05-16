import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { apiService } from '../services/api';
import { ErrorTypes, getErrorType } from '../services/errorHandling';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      // Set token for both axios defaults and ensure apiService has it too
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // The apiService will pick up the token from localStorage/sessionStorage
      // through its own interceptor
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      const data = await apiService.get('/vendors/me');
      setUser(data);
    } catch (err) {
      console.error('Error fetching user profile:', err);
      const errorType = getErrorType(err);
      if ([ErrorTypes.AUTH_ERROR, ErrorTypes.SESSION_TIMEOUT].includes(errorType)) {
        console.log('Authentication error detected, clearing tokens');
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, rememberMe = false) => {
    try {
      console.log('Starting login process');
      
      // Clear any existing tokens before login to prevent conflicts
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      
      // Make a direct axios call to bypass the apiService interceptors for login
      const response = await axios.post('/api/vendors/login', { email, password }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Login response received:', {
        status: response.status,
        statusText: response.statusText,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : []
      });
      
      // The backend returns the token in the response.data object
      const token = response.data?.token;
      
      if (!token) {
        console.error('No token received from login');
        throw new Error('Authentication failed. Please try again.');
      }
      
      console.log('Token received successfully, setting up authentication');
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Fetch user profile with the new token
      await fetchUserProfile();
      return response.data;
    } catch (error) {
      console.error('Login error:', error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : error.message);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      console.log('Starting registration with data:', { ...userData, password: '[REDACTED]' });
      
      // Clear any existing tokens before registration to prevent conflicts
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      
      // Make a direct axios call to the registration endpoint
      // The server endpoint is at /api/vendors/register
      const response = await axios.post('/api/vendors/register', userData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Log the raw response for debugging
      console.log('Raw registration response:', response);
      
      console.log('Registration response received:', {
        status: response.status,
        statusText: response.statusText,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : []
      });
      
      // Log the full response data for debugging (excluding sensitive info)
      const safeResponseData = { ...response.data };
      if (safeResponseData.vendor && safeResponseData.vendor.password) {
        safeResponseData.vendor.password = '[REDACTED]';
      }
      console.log('Full registration response data:', safeResponseData);
      
      // The backend returns { vendor: vendorData, token: jwtToken } in the response.data object
      // Extract token from the response structure - handle both possible response formats
      let token = null;
      
      // Add more detailed logging to diagnose token extraction issues
      console.log('Registration response structure:', {
        hasVendor: !!response.data?.vendor,
        hasToken: !!response.data?.token,
        responseKeys: Object.keys(response.data || {})
      });
      
      // Try to extract token from different possible locations in the response
      if (response.data?.token) {
        // Token is directly in response.data.token
        token = response.data.token;
        console.log('Found token at response.data.token');
      } else if (response.data?.vendor && response.data?.token) {
        // Token is alongside vendor object
        token = response.data.token;
        console.log('Found token alongside vendor object');
      } else if (response.data?.vendor?.token) {
        // Token is nested inside vendor object
        token = response.data.vendor.token;
        console.log('Found token nested inside vendor object');
      }
      
      if (!token) {
        console.error('No token in response data:', response.data);
        throw new Error('Authentication failed: No token received from server');
      }
      
      console.log('Token received successfully, setting up authentication');
      // Store token in localStorage for persistence
      localStorage.setItem('token', token);
      // Set the Authorization header for all future axios requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Fetch user profile with the new token
      await fetchUserProfile();
      return response.data;
    } catch (error) {
      console.error('Registration error:', error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : error.message);
      
      // Provide a more user-friendly error message
      if (error.response) {
        if (error.response.status === 400) {
          throw new Error(error.response.data.error || 'Registration failed: Invalid information provided');
        } else if (error.response.status === 500) {
          throw new Error('Server error occurred during registration. Please try again later.');
        }
      }
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};