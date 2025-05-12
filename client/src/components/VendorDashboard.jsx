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
  Alert,
} from '@mui/material';
import axios from 'axios';

const VendorDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [profit, setProfit] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [ordersResponse, profileResponse] = await Promise.all([
          axios.get('/api/vendors/me/orders'),
          axios.get('/api/vendors/me/profile')
        ]);

        setOrders(ordersResponse.data.orders);
        setProfit(profileResponse.data.profit);
        setLoading(false);
      } catch (err) {
        setError('Error loading dashboard data');
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleWithdraw = async () => {
    try {
      await axios.post('/api/vendors/me/withdraw');
      // Refresh dashboard data after withdrawal
      window.location.reload();
    } catch (err) {
      setError('Error processing withdrawal');
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
        {/* Profit Overview */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Available Profit
            </Typography>
            <Typography variant="h4" color="primary">
              ₦{profit.toFixed(2)}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleWithdraw}
              sx={{ mt: 2 }}
              disabled={profit <= 0}
            >
              Withdraw
            </Button>
          </Paper>
        </Grid>

        {/* Recent Orders */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                Recent Orders
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Order ID</TableCell>
                    <TableCell>Customer Phone</TableCell>
                    <TableCell>Data Bundle</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order._id}>
                      <TableCell>{order._id}</TableCell>
                      <TableCell>{order.customerPhone}</TableCell>
                      <TableCell>{order.dataBundle.name}</TableCell>
                      <TableCell>₦{order.amountPaid.toFixed(2)}</TableCell>
                      <TableCell>
                        <Typography
                          color={
                            order.status === 'completed'
                              ? 'success.main'
                              : order.status === 'pending'
                              ? 'warning.main'
                              : 'error.main'
                          }
                        >
                          {order.status.toUpperCase()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default VendorDashboard;