import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Box,
  Alert,
} from '@mui/material';

const VendorPage = () => {
  const { vendorLink } = useParams();
  const [vendor, setVendor] = useState(null);
  const [bundles, setBundles] = useState([]);
  const [selectedBundle, setSelectedBundle] = useState(null);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVendorDetails = async () => {
      try {
        const response = await axios.get(`/api/vendors/link/${vendorLink}`);
        setVendor(response.data);
        setBundles(response.data.bundles);
        setLoading(false);
      } catch (err) {
        setError('Error loading vendor details');
        setLoading(false);
      }
    };

    fetchVendorDetails();
  }, [vendorLink]);

  const handleBundleSelect = (bundle) => {
    setSelectedBundle(bundle);
    setError('');
  };

  const handlePurchase = async () => {
    if (!selectedBundle) {
      setError('Please select a data bundle');
      return;
    }

    if (!customerPhone || !customerEmail) {
      setError('Please provide both phone number and email');
      return;
    }
    
    // Validate phone number format
    if (!/^[0-9]{10}$/.test(customerPhone)) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    try {
      const response = await axios.post(`/api/vendors/${vendorLink}/pay`, {
        bundleId: selectedBundle._id,
        customerPhone,
        customerEmail,
      });

      // Redirect to Paystack payment page
      window.location.href = response.data.data.authorization_url;
    } catch (err) {
      setError('Error processing payment');
    }
  };

  if (loading) {
    return (
      <Container>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  if (!vendor) {
    return (
      <Container>
        <Typography color="error">Vendor not found</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {vendor.name}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {bundles.map((bundle) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={bundle._id}>
            <Card
              sx={{
                height: '100%',
                cursor: 'pointer',
                border: selectedBundle?._id === bundle._id ? 2 : 0,
                borderColor: 'primary.main',
              }}
              onClick={() => handleBundleSelect(bundle)}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {bundle.name}
                </Typography>
                <Typography variant="body1">
                  {bundle.description}
                </Typography>
                <Typography variant="h5" color="primary" sx={{ mt: 2 }}>
                  ₦{bundle.basePrice.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {selectedBundle && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Customer Information
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Phone Number"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                required
              />
            </Grid>
          </Grid>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handlePurchase}
            sx={{ mt: 3 }}
          >
            Purchase Now
          </Button>
        </Box>
      )}
    </Container>
  );
};

export default VendorPage;