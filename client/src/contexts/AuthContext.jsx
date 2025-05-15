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
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
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
      const errorType = getErrorType(err);
      if ([ErrorTypes.AUTH_ERROR, ErrorTypes.SESSION_TIMEOUT].includes(errorType)) {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, rememberMe = false) => {
    const data = await apiService.post('/vendors/login', { email, password });
    // Handle different response structures - token might be nested in data object
    const token = data.token || (data.data && data.data.token);
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    await fetchUserProfile();
    return data;
  };

  const register = async (userData) => {
    const data = await apiService.post('/vendors/register', userData);
    // Handle different response structures - token might be nested in data object
    const token = data.token || (data.data && data.data.token);
    if (token) {
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      await fetchUserProfile();
    }
    return data;
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