const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const { errorHandler } = require('./errors/errorHandler');
const connectDB = require('./config/db');

// Create Express app
const app = express();

const path = require('path');
const fs = require('fs');
// Serve static files from the uploads directory in the project root
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Test file check endpoint
// app.get('/test-upload-file', (req, res) => {
//   const uploadsDir = path.join(__dirname, '..', 'uploads'); // Go up one level to project root
//   const testFile = path.join(uploadsDir, '1754380067076-age1.jpg');
  
//   // Create uploads directory if it doesn't exist{"exists":true,"message":"File exists on server","path":"C:\\Users\\arifi\\OneDrive\\Documents\\All Projects\\petApp_backend\\uploads\\1754380067076-age1.jpg"}
//   if (!fs.existsSync(uploadsDir)) {
//     fs.mkdirSync(uploadsDir, { recursive: true });
//     return res.status(404).json({ 
//       exists: false, 
//       message: 'Uploads directory did not exist. Created it.',
//       path: uploadsDir
//     });
//   }
  
//   // Check if file exists
//   fs.access(testFile, fs.constants.F_OK, (err) => {
//     if (err) {
//       return res.status(404).json({ 
//         exists: false, 
//         message: 'File not found',
//         path: testFile,
//         currentDirectory: process.cwd(),
//         directoryContents: fs.readdirSync(uploadsDir)
//       });
//     }
//     res.status(200).json({ 
//       exists: true, 
//       message: 'File exists on server',
//       path: testFile
//     });
//   });
// });

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
app.use('/api/services', require('./app/module/BusinessServices/businessServices.router'));
app.use('/api/advertisement', require('./app/module/Advertisement/advertisement.router'));
app.use('/api/pet-medical-history', require('./app/module/PetMedicalHistory/PetMedicalHistory.router'));
app.use('/api/booking', require('./app/module/Booking/booking.router'));
app.use('/api/review', require('./app/module/Review/review.router'))
app.use('/api/dashboard', require('./app/module/Dashboard/dashboard.router'));
app.use('/api/faq', require('./app/module/Dashboard/Faq/faq.router'));
app.use('/api/admin', require('./app/module/Admin/admin.router'));
app.use('/api/privacy', require('./app/module/Dashboard/Privacy/privacy.router'));
app.use('/api/help', require('./app/module/Dashboard/Help/help.router'));
app.use('/api/terms-condition', require('./app/module/Dashboard/TermsCondition/termsCondition.router'));
app.use('/api/user-home-page', require('./app/module/UserHomePage/userHomePage.router'));
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
