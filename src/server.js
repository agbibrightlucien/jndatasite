require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const { MONGODB_URI, mongooseOptions } = require('./config/database');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const routes = require('./routes');
const homeController = require('./controllers/homeController');
const { verifyToken } = require('./utils/jwt');

const app = express();
const server = http.createServer(app);

// Middleware
// Request logging middleware (Morgan)
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(MONGODB_URI, mongooseOptions)
  .then(() => console.log('Successfully connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// MongoDB Connection Events
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from MongoDB');
});

process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
  });
});

// Routes
app.get('/', homeController.welcome);
app.use('/api', routes);

// Handle 404 errors for unmatched routes
app.use(notFound);

// Global error handling middleware
app.use(errorHandler);

// Socket.io setup
const io = socketIo(server, {
  path: '/api/socket.io',
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error: Token missing'));
  }
  
  try {
    const decoded = verifyToken(token);
    socket.user = decoded;
    next();
  } catch (error) {
    return next(new Error('Authentication error: Invalid token'));
  }
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.id}`);
  
  // Join a room based on user ID
  socket.join(socket.user.id);
  
  // Join a room based on user role
  if (socket.user.role) {
    socket.join(socket.user.role);
  }
  
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.user.id}`);
  });
});

// Make io accessible to our routes
app.set('io', io);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});