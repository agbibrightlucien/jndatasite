import { useState } from 'react';
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
  IconButton,
  Badge,
  Menu,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondary,
  Divider
} from '@mui/material';
import { Notifications as NotificationsIcon } from '@mui/icons-material';
import { useSubVendor } from '../contexts/SubVendorContext';
import { useNotification } from '../contexts/NotificationContext';

const SubVendorDashboard = () => {
  const { subVendors, loading, error, createSubVendor } = useSubVendor();
  const { notifications, clearNotification, clearAllNotifications } = useNotification();
  
  const [openNewSubVendor, setOpenNewSubVendor] = useState(false);
  const [newSubVendor, setNewSubVendor] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });
  const [formError, setFormError] = useState('');
  
  // Notification menu state
  const [anchorEl, setAnchorEl] = useState(null);
  
  const handleNotificationClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleNotificationClose = () => {
    setAnchorEl(null);
  };
  
  const handleCreateSubVendor = async () => {
    try {
      // Validate required fields
      if (!newSubVendor.name || !newSubVendor.email || !newSubVendor.phone || !newSubVendor.password) {
        setFormError('All fields are required');
        return;
      }
      
      // Validate phone number format
      if (!/^[0-9]{10}$/.test(newSubVendor.phone)) {
        setFormError('Please enter a valid 10-digit phone number');
        return;
      }
      
      await createSubVendor(newSubVendor);
      setOpenNewSubVendor(false);
      setNewSubVendor({ name: '', email: '', phone: '', password: '' });
    } catch (err) {
      setFormError(err.message);
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
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          Sub-Vendor Management
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <IconButton onClick={handleNotificationClick}>
            <Badge badgeContent={notifications.length} color="primary">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          
          <Button
            variant="contained"
            onClick={() => setOpenNewSubVendor(true)}
          >
            Add Sub-Vendor
          </Button>
        </Box>
      </Box>
      
      {/* Notifications Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleNotificationClose}
        PaperProps={{
          sx: { width: 350, maxHeight: 400 }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Notifications</Typography>
          <Button size="small" onClick={clearAllNotifications}>Clear All</Button>
        </Box>
        <Divider />
        <List sx={{ p: 0 }}>
          {notifications.length === 0 ? (
            <ListItem>
              <ListItemText primary="No new notifications" />
            </ListItem>
          ) : (
            notifications.map((notification, index) => (
              <ListItem key={index} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <ListItemText
                  primary={notification.message}
                  secondary={new Date(notification.timestamp).toLocaleString()}
                />
                <Button size="small" onClick={() => clearNotification(index)}>Dismiss</Button>
                <Divider />
              </ListItem>
            ))
          )}
        </List>
      </Menu>
      
      {/* Sub-Vendors Table */}
      <Paper sx={{ p: 2 }}>
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
              {subVendors.map((subVendor) => (
                <TableRow key={subVendor._id}>
                  <TableCell>{subVendor.name}</TableCell>
                  <TableCell>{subVendor.email}</TableCell>
                  <TableCell>{subVendor.phone}</TableCell>
                  <TableCell>
                    <Typography
                      color={subVendor.approved ? 'success.main' : 'warning.main'}
                    >
                      {subVendor.approved ? 'ACTIVE' : 'PENDING'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {}}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      
      {/* New Sub-Vendor Dialog */}
      <Dialog open={openNewSubVendor} onClose={() => setOpenNewSubVendor(false)}>
        <DialogTitle>Create New Sub-Vendor</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="Business Name"
            fullWidth
            value={newSubVendor.name}
            onChange={(e) => setNewSubVendor({ ...newSubVendor, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            value={newSubVendor.email}
            onChange={(e) => setNewSubVendor({ ...newSubVendor, email: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Phone Number"
            fullWidth
            value={newSubVendor.phone}
            onChange={(e) => setNewSubVendor({ ...newSubVendor, phone: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Password"
            type="password"
            fullWidth
            value={newSubVendor.password}
            onChange={(e) => setNewSubVendor({ ...newSubVendor, password: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewSubVendor(false)}>Cancel</Button>
          <Button onClick={handleCreateSubVendor} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SubVendorDashboard;