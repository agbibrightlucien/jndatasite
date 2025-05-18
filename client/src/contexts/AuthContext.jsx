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
      
      // Extract token from the response structure
      // The backend should return either { token } or { vendor, token }
      let token = null;
      
      if (response.data?.token) {
        // Token is directly in response.data.token
        token = response.data.token;
      } else if (response.data?.vendor?.token) {
        // Token is nested inside vendor object
        token = response.data.vendor.token;
      }
      
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
      
      // Return the vendor data from the response
      return response.data.vendor || response.data;
    } catch (error) {
      console.error('Login error:', error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : error.message);
      
      // Provide a more user-friendly error message
      if (error.response) {
        if (error.response.status === 401) {
          throw new Error('Invalid email or password');
        } else if (error.response.status === 500) {
          throw new Error('Server error occurred during login. Please try again later.');
        }
      }
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
      console.log('Sending registration request to /api/vendors/register');
      let response;
      
      // Based on examining the server routes, we know the correct endpoint is /api/vendors/register
      // The server expects a POST request with the vendor data and returns {vendor, token}
      try {
        response = await axios.post('/api/vendors/register', userData, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        console.log('Registration successful with /api/vendors/register endpoint');
      } catch (registerError) {
        console.error('Registration endpoint error:', registerError);
        
        // If we get a specific error message from the server, use it
        if (registerError.response && registerError.response.data && registerError.response.data.error) {
          throw new Error(registerError.response.data.error);
        }
        
        // Otherwise, throw a generic error
        throw new Error('Registration failed: ' + (registerError.message || 'Unable to connect to server'));
      }
      
      // Log the response for debugging
      console.log('Registration response:', {
        status: response.status,
        statusText: response.statusText,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : []
      });
      
      // Extract token from the response structure
      // The server returns { vendor, token } for registration as seen in the server code
      let token = null;
      
      // Check for token in the response - directly from server implementation
      if (response.data?.token) {
        console.log('Found token in response.data.token');
        token = response.data.token;
      } else {
        // If token isn't in the expected location, log the response for debugging
        console.error('Unexpected response structure. Token not found:', response.data);
        throw new Error('Authentication failed: Token not found in server response');
      }
      
      if (!token) {
        console.error('Empty token received from server');
        throw new Error('Authentication failed: Empty token received from server');
      }
      
      console.log('Token received successfully, setting up authentication');
      // Store token in localStorage for persistence
      localStorage.setItem('token', token);
      // Set the Authorization header for all future axios requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Fetch user profile with the new token
      await fetchUserProfile();
      
      // Return the vendor data from the response
      return response.data.vendor || response.data;
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
        } else if (error.response.status === 409) {
          throw new Error('Email or phone number already registered');
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