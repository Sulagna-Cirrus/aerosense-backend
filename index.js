const dotenv = require('dotenv');
// Load environment variables before any other code
dotenv.config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profiles');
const passwordResetRoutes = require('./routes/passwordReset');
require('./config/db'); // Import database configuration

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5001', 'http://your-production-domain.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


app.use(express.json());
app.use(express.static(path.join(__dirname, '../aerosens-frontend/dist')));
// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/password-reset', passwordResetRoutes);

// Basic route
app.get('/', (req, res) => {
  res.send('Welcome to the Aerosense Backend API');
});

// Catch-all route for SPA client-side routing
app.get('*', (req, res) => {
  // Only for non-API routes
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../aerosens-frontend/dist/index.html'));
  } else {
    // This is a fallback for API routes that don't exist
    res.status(404).json({ message: 'API endpoint not found' });
  }
});
// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Frontend and backend are now served from the same port`);
});