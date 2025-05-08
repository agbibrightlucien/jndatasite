# JN Data Site

A Node.js backend API service for managing user data and authentication.

## Features

- User authentication and authorization
- RESTful API endpoints
- MongoDB database integration
- Secure password hashing
- Role-based access control

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or remote instance)
- npm or yarn package manager

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/jndatasite
   ```

## Available Scripts

- `npm start`: Starts the production server
- `npm run dev`: Starts the development server with hot-reload

## Project Structure

```
src/
├── models/      # Database models
├── routes/      # API routes
└── server.js    # Main application file
```

## API Endpoints

- `GET /health`: Health check endpoint
- `GET /`: Welcome message

## Environment Variables

- `PORT`: Server port (default: 5000)
- `MONGODB_URI`: MongoDB connection string

## License

ISC