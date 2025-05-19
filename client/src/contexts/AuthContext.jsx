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
      
      // Create an axios instance that uses the proxy configuration
      const axiosInstance = axios.create({
        baseURL: '/api',  // This will work with Vite's proxy configuration
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      // Make the login request with the correct instance
      const response = await axiosInstance.post('/vendors/login', { email, password });
      
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
      
      // Ensure we're not sending any authorization headers for registration
      // which could cause 401 Unauthorized errors
      
      // Make a direct axios call to the registration endpoint
      console.log('Sending registration request to /api/vendors/register');
      let response;
      
      // The server route is at /register on the vendor router
      // Based on the server implementation, we need to use the correct endpoint
      try {
        // Ensure we're sending the required fields according to server validation
        const requiredFields = ['name', 'email', 'password', 'phone'];
        const missingFields = requiredFields.filter(field => !userData[field]);
        
        if (missingFields.length > 0) {
          throw new Error(`Registration failed: Missing required fields: ${missingFields.join(', ')}`);
        }
        
        // Validate Ghanaian phone number format
        if (userData.phone) {
          // Ghanaian phone numbers should be 10 digits, optionally starting with +233 or 0
          const phoneRegex = /^(?:\+233|0)?[0-9]{9,10}$/;
          if (!phoneRegex.test(userData.phone)) {
            throw new Error('Registration failed: Invalid phone number format. Please use a valid Ghanaian phone number.');
          }
          
          // Ensure phone number is in the correct format for the server
          // If it starts with 0, replace with +233
          if (userData.phone.startsWith('0')) {
            userData.phone = '+233' + userData.phone.substring(1);
          }
          // If it doesn't have a country code, add +233
          else if (!userData.phone.startsWith('+')) {
            userData.phone = '+233' + userData.phone;
          }
        }
        
        // Log the request being sent (without sensitive data)
        console.log('Registration request data structure:', {
          ...userData,
          password: '[REDACTED]',
          endpoint: '/api/vendors/register'
        });
        
        // Use the apiService or create an axios instance that uses the proxy configuration
        // The baseURL should be '/api' to work with Vite's proxy configuration
        const axiosInstance = axios.create({
          baseURL: '/api',  // This will work with Vite's proxy configuration
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        // Make sure no authorization header is included
        delete axiosInstance.defaults.headers.common['Authorization'];
        
        // Make the registration request with the correct instance
        // The vendor routes are mounted at '/api/vendors' and the registration route is at '/register'
        response = await axiosInstance.post('/vendors/register', userData);
        console.log('Registration request successful');

        console.log('Registration successful with /api/vendors/register endpoint');
      } catch (registerError) {
        console.error('Registration endpoint error:', registerError);
        console.error('Error details:', {
          status: registerError.response?.status,
          statusText: registerError.response?.statusText,
          data: registerError.response?.data,
          message: registerError.message
        });
        
        // If we get a specific error message from the server, use it
        if (registerError.response && registerError.response.data && registerError.response.data.error) {
          throw new Error(registerError.response.data.error);
        }
        
        // Otherwise, throw a generic error with more details
        throw new Error('Registration failed: ' + (registerError.message || 'Unable to connect to server'));
      }
      
      // Log the response for debugging
      console.log('Registration response:', {
        status: response.status,
        statusText: response.statusText,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : []
      });
      
      // Validate the response structure
      if (!response.data) {
        console.error('Empty response data received from server');
        throw new Error('Registration failed: Empty response from server');
      }
      
      // Extract token from the response structure
      // The server returns { vendor, token } for registration as seen in the server code
      let token = null;
      
      // Log the full response structure for debugging
      console.log('Full registration response structure:', JSON.stringify(response.data, null, 2));
      
      // Check for token in the response - directly from server implementation
      if (response.data?.token) {
        console.log('Found token in response.data.token');
        token = response.data.token;
      } else if (response.data?.vendor && response.data?.token) {
        // This is the expected structure from the server
        console.log('Found token in expected structure: { vendor, token }');
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
          // Handle validation errors
          let errorMessage = '';
          
          // Check for specific phone validation errors
          if (error.response.data.error?.includes('phone')) {
            errorMessage = 'Invalid phone number format. Please enter a valid Ghanaian phone number.';
          } else if (error.response.data.error?.includes('email')) {
            errorMessage = 'Invalid email format. Please enter a valid email address.';
          } else {
            // Use server error message or fallback to generic message
            errorMessage = error.response.data.error || 
                          (error.response.data.errors ? error.response.data.errors.join(', ') : null) || 
                          'Registration failed: Invalid information provided';
          }
          
          throw new Error(errorMessage);
        } else if (error.response.status === 409 || 
                  (error.response.status === 400 && error.response.data.error?.includes('already registered'))) {
          // Check if it's specifically the phone number that's already registered
          if (error.response.data.error?.includes('phone')) {
            throw new Error('Phone number already registered. Please use a different phone number.');
          } else if (error.response.data.error?.includes('email')) {
            throw new Error('Email already registered. Please use a different email address.');
          } else {
            throw new Error('Email or phone number already registered');
          }
        } else if (error.response.status === 401) {
        throw new Error('Registration failed: Server authentication error. Please contact support.');  
      } else if (error.response.status === 500) {
        throw new Error('Server error occurred during registration. Please try again later.');
        } else {
          // For other status codes
          throw new Error(`Registration failed: ${error.response.data?.error || error.response.statusText || 'Unknown error'}`);
        }
      } else if (error.message) {
        // For network errors or other non-response errors
        throw new Error(`Registration failed: ${error.message}`);
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