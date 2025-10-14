const dotenv = require("dotenv");
dotenv.config();
const app = require("./app");
const connectDB = require("./config/db");
const { socket } = require("./sockets/SocketConnection");
const { Server } = require("socket.io");

async function main() {
  try {
    const PORT = process.env.PORT || 5000;

    await connectDB();

    const HOST = process.env.UNIVERSAL || "0.0.0.0";

    const server = app.listen(PORT, HOST, () => {
      console.log(`Pet App Server is running on http://${HOST}:${PORT}`);
    });

    // const server = app.listen(PORT, "0.0.0.0", () => {
    //   console.log(`Server is Running http://localhost:${PORT}`);
    // });
    // Set up Socket.IO-----------------
    const socketIO = new Server(server, {
      pingTimeout: 60000,
      cors: {
        origin: ["*"],
        credentials: true,
      },
    });

    socket(socketIO);
    // Assign Socket.IO to globally available.
    global.io = socketIO;
  } catch (e) {
    console.log(`Main Server Error ${e}`);
  }
}

main();
