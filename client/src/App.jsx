import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SubVendorProvider } from './contexts/SubVendorContext';
import { NotificationProvider } from './contexts/NotificationContext';

// Import components
import HomePage from './components/HomePage';
import VendorPage from './components/VendorPage';
import VendorDashboard from './components/VendorDashboard';
import AdminDashboard from './components/AdminDashboard';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Create theme instance
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          {/* Only render child providers after authentication is loaded */}
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/vendor/:vendorLink" element={<VendorPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route
              path="/vendor/dashboard"
              element={
                <ProtectedRoute>
                  <NotificationProvider>
                    <SubVendorProvider>
                      <VendorDashboard />
                    </SubVendorProvider>
                  </NotificationProvider>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  )
}

export default App
