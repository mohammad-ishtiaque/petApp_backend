const express = require('express');
const http = require("http");
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const { errorHandler } = require('./errors/errorHandler');
const connectDB = require('./config/db');
const path = require('path');

// Load environment variables
dotenv.config();

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Initialize WebSocket
const SocketService = require('./services/socket.service');
const socketService = new SocketService(server);

// Serve static files from the uploads directory in the project root
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Connect to MongoDB
connectDB();

// API Routes
const apiRoutes = [
  { path: '/api/auth', route: require('./app/module/Auth/auth.routes') },
  { path: '/api/pet', route: require('./app/module/Pet/pet.router') },
  { path: '/api/user', route: require('./app/module/User/userprofile.router') },
  { path: '/api/owner', route: require('./app/module/Owner/owner.router') },
  { path: '/api/business', route: require('./app/module/Business/business.router') },
  { path: '/api/services', route: require('./app/module/BusinessServices/businessServices.router') },
  { path: '/api/advertisement', route: require('./app/module/Advertisement/advertisement.router') },
  { path: '/api/pet-medical-history', route: require('./app/module/PetMedicalHistory/PetMedicalHistory.router') },
  { path: '/api/booking', route: require('./app/module/Booking/booking.router') },
  { path: '/api/review', route: require('./app/module/Review/review.router') },
  { path: '/api/dashboard', route: require('./app/module/Dashboard/dashboard.router') },
  { path: '/api/faq', route: require('./app/module/Dashboard/Faq/faq.router') },
  { path: '/api/admin', route: require('./app/module/Admin/admin.router') },
  { path: '/api/privacy', route: require('./app/module/Dashboard/Privacy/privacy.router') },
  { path: '/api/help', route: require('./app/module/Dashboard/Help/help.router') },
  { path: '/api/terms-condition', route: require('./app/module/Dashboard/TermsCondition/termsCondition.router') },
  { path: '/api/user-home-page', route: require('./app/module/UserHomePage/userHomePage.router') },
  { path: '/api/chat', route: require('./app/module/Chat/chat.router') },
  { path: '/api/notifications', route: require('./app/module/Notification/notification.router') }
];

// Register all routes
apiRoutes.forEach(route => {
  app.use(route.path, route.route);
});

// Error handling middleware
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).json({
//     success: false,
//     message: 'Something went wrong!',
//     error: process.env.NODE_ENV === 'development' ? err.message : {}
//   });
// });

// Store socket service in app context
app.set('socketService', socketService);
// app.use('/api/admin', require('./app/module/Admin/admin.routes'));

// Health check route
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy'
  });
});

// Error handling middleware
// app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

module.exports = app;
