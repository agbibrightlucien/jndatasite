const { ServerApiVersion } = require('mongodb');

const mongooseOptions = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  },
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

// Default to local MongoDB if MONGODB_URI is not set in environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jndatasite';

module.exports = {
  mongooseOptions,
  MONGODB_URI
};