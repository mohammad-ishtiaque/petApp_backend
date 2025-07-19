const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const { errorHandler } = require('./errors/errorHandler');
const connectDB = require('./config/db');

// Create Express app
const app = express();

dotenv.config();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());


connectDB();
// Routes
app.use('/api/auth', require('./app/module/Auth/auth.routes'));
app.use('/api/pet', require('./app/module/Pet/pet.router'));
app.use('/api/user', require('./app/module/User/userprofile.router'));
app.use('/api/owner', require('./app/module/Owner/owner.router'));
app.use('/api/business', require('./app/module/Business/business.router'));
app.use('/api/services', require('./app/module/BusinessServices/services.router'));
app.use('/api/advertisement', require('./app/module/Advertisement/advertisement.router'));
app.use('/api/pet-medical-history', require('./app/module/PetMedicalHistory/PetMedicalHistory.router'));

// app.use('/api/auth', require('./app/module/Auth/auth.routes'));
// app.use('/api/users', require('./app/module/User/user.routes'));
// app.use('/api/owners', require('./app/module/Owner/owner.routes'));
// app.use('/api/admin', require('./app/module/Admin/admin.routes'));

// Health check route
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy'
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

module.exports = app;
