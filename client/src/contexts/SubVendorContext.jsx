import { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { useAuth } from './AuthContext';

const SubVendorContext = createContext(null);

export const SubVendorProvider = ({ children }) => {
  const { loading: authLoading, user } = useAuth();
  const [subVendors, setSubVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSubVendors = async () => {
    try {
      const data = await apiService.get('/vendors/me/subvendors');
      setSubVendors(data.subVendors);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch subvendors when auth is not loading and user is authenticated
    if (!authLoading && user) {
      fetchSubVendors();
    } else if (!authLoading && !user) {
      // If auth is done loading and no user is found, update loading state
      setLoading(false);
    }
  }, [authLoading, user]);

  const createSubVendor = async (subVendorData) => {
    try {
      const data = await apiService.post('/vendors/me/subvendors', subVendorData);
      setSubVendors([...subVendors, data]);
      return data;
    } catch (err) {
      throw err;
    }
  };

  const updateSubVendorStatus = async (subVendorId, approved) => {
    try {
      const data = await apiService.put(`/admin/subvendors/${subVendorId}/approve`, { approved });
      setSubVendors(subVendors.map(sv => 
        sv._id === subVendorId ? { ...sv, approved: data.subVendor.approved } : sv
      ));
      return data;
    } catch (err) {
      throw err;
    }
  };

  const value = {
    subVendors,
    loading,
    error,
    createSubVendor,
    updateSubVendorStatus,
    refreshSubVendors: fetchSubVendors
  };

  return (
    <SubVendorContext.Provider value={value}>
      {children}
    </SubVendorContext.Provider>
  );
};

export const useSubVendor = () => {
  const context = useContext(SubVendorContext);
  if (!context) {
    throw new Error('useSubVendor must be used within a SubVendorProvider');
  }
  return context;
};