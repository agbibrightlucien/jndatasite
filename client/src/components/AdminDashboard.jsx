import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from '@mui/material';
import axios from 'axios';

const AdminDashboard = () => {
  const [vendors, setVendors] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [openNewBundle, setOpenNewBundle] = useState(false);
  const [newBundle, setNewBundle] = useState({
    name: '',
    description: '',
    basePrice: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [vendorsResponse, bundlesResponse] = await Promise.all([
          axios.get('/api/admin/vendors'),
          axios.get('/api/admin/bundles')
        ]);

        setVendors(vendorsResponse.data.vendors);
        setBundles(bundlesResponse.data.bundles);
        setLoading(false);
      } catch (err) {
        setError('Error loading dashboard data');
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleApproveVendor = async (vendorId) => {
    try {
      await axios.post(`/api/admin/vendors/${vendorId}/approve`);
      // Refresh vendors list
      const response = await axios.get('/api/admin/vendors');
      setVendors(response.data.vendors);
    } catch (err) {
      setError('Error approving vendor');
    }
  };

  const handleCreateBundle = async () => {
    try {
      await axios.post('/api/admin/bundles', newBundle);
      setOpenNewBundle(false);
      // Refresh bundles list
      const response = await axios.get('/api/admin/bundles');
      setBundles(response.data.bundles);
      setNewBundle({ name: '', description: '', basePrice: '' });
    } catch (err) {
      setError('Error creating bundle');
    }
  };

  if (loading) {
    return (
      <Container>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Vendors Management */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Vendors Management
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vendors.map((vendor) => (
                    <TableRow key={vendor._id}>
                      <TableCell>{vendor.name}</TableCell>
                      <TableCell>{vendor.email}</TableCell>
                      <TableCell>{vendor.phone}</TableCell>
                      <TableCell>
                        <Typography
                          color={vendor.approved ? 'success.main' : 'warning.main'}
                        >
                          {vendor.approved ? 'APPROVED' : 'PENDING'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {!vendor.approved && (
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleApproveVendor(vendor._id)}
                          >
                            Approve
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Data Bundles Management */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                Data Bundles
              </Typography>
              <Button
                variant="contained"
                onClick={() => setOpenNewBundle(true)}
              >
                Add New Bundle
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Base Price</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bundles.map((bundle) => (
                    <TableRow key={bundle._id}>
                      <TableCell>{bundle.name}</TableCell>
                      <TableCell>{bundle.description}</TableCell>
                      <TableCell>₦{bundle.basePrice.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* New Bundle Dialog */}
      <Dialog open={openNewBundle} onClose={() => setOpenNewBundle(false)}>
        <DialogTitle>Create New Data Bundle</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Bundle Name"
            fullWidth
            value={newBundle.name}
            onChange={(e) => setNewBundle({ ...newBundle, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={newBundle.description}
            onChange={(e) => setNewBundle({ ...newBundle, description: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Base Price"
            type="number"
            fullWidth
            value={newBundle.basePrice}
            onChange={(e) => setNewBundle({ ...newBundle, basePrice: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewBundle(false)}>Cancel</Button>
          <Button onClick={handleCreateBundle} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminDashboard;