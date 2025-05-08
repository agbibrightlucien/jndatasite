const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

module.exports = {
  mongooseOptions,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/jndatasite'
};