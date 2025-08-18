
const http = require("http");
const dotenv = require("dotenv");
dotenv.config();
const app = require('./app');
const initSocket = require("./config/socket");


// Create HTTP server
const server = http.createServer(app);

// Init socket
initSocket(server);

const PORT = process.env.PORT || 5000;
const HOST = process.env.BASE_URL || '0.0.0.0';


server.listen(PORT, HOST, () => {
  console.log(`Pet App Server is running on http://${HOST}:${PORT}`);
});

