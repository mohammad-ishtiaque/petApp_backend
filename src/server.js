
const http = require("http");
const dotenv = require("dotenv");
dotenv.config();
const app = require('./app');
const SocketService = require("./services/socket.service");

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket Service
const socketService = new SocketService(server);

const PORT = process.env.PORT || 5000;
const HOST = process.env.UNIVERSAL || '0.0.0.0';


// server.listen(PORT, HOST, () => {
//   console.log(`Pet App Server is running on http://${HOST}:${PORT}`);
// });

server.listen(PORT, HOST, () => {
  console.log(`Pet App Server is running on ${PORT}`);
});