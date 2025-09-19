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

    const HOST = process.env.BASE_URL || "0.0.0.0";

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
        origin: [
          "http://localhost:52643", // Local development (e.g., Flutter web running on this port)
          "https://dating-admin-panel.pages.dev", // Production admin panel hosted on Cloudflare Pages (HTTPS)
          "http://dating-admin-panel.pages.dev", // Optional: HTTP version in case SSL is not enforced (usually not needed)
          "https://dating-admin-seven.vercel.app", // Production/staging admin panel hosted on Vercel
        ],
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
