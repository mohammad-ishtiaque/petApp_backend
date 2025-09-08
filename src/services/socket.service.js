const socketIO = require('socket.io');
const NotificationService = require('./notification.service');
const socketHandlers = require('../sockets');

class SocketService {
  constructor(server) {
    console.log('Initializing SocketService...');
    
    this.io = socketIO(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ["GET", "POST"],
        credentials: true
      },
      // Add connection state recovery
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
        skipMiddlewares: true
      }
    });
    
    this.notificationService = new NotificationService(this.io);
    this.connectedUsers = new Map();
    
    console.log('SocketService initialized with connectedUsers:', this.connectedUsers);
    
    // Initialize socket handling
    this.initializeSocket();
  }

  initializeSocket() {
    console.log('Setting up socket connection handlers...');
    
    this.io.on('connection', (socket) => {
      console.log('New client connected:', socket.id);
      console.log('Current connected users:', [...this.connectedUsers.entries()]);

      // Handle user authentication and room joining
      socket.on('authenticate', ({ userId, role }) => {
        console.log('Authentication attempt:', { socketId: socket.id, userId, role });
        
        if (!userId || !role) {
          console.error('Authentication failed: Missing userId or role');
          socket.emit('authentication_error', { message: 'Missing userId or role' });
          return;
        }

        const userRoom = `${role}:${userId}`;
        this.connectedUsers.set(socket.id, { userId, role, userRoom });
        
        // Join user's personal room for notifications
        socket.join(userRoom);
        console.log(`User ${userRoom} connected with socket ${socket.id}`);
        console.log('Updated connected users:', [...this.connectedUsers.entries()]);
        
        // Acknowledge successful authentication
        socket.emit('authenticated', { 
          success: true, 
          userId, 
          role,
          socketId: socket.id
        });
      });

      // Initialize socket handlers with the socketService instance
      try {
        console.log('Initializing socket handlers...');
        socketHandlers(this.io, socket, this);
        console.log('Socket handlers initialized');
      } catch (error) {
        console.error('Error initializing socket handlers:', error);
      }

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`Client disconnected: ${socket.id} (${reason})`);
        const userData = this.connectedUsers.get(socket.id);
        if (userData) {
          console.log(`User ${userData.userRoom} disconnected`);
          this.connectedUsers.delete(socket.id);
          console.log('Remaining connected users:', [...this.connectedUsers.entries()]);
        }
      });
    });
  }

  // Method to send notification to a specific user
  async sendNotification(recipient, notificationData) {
    console.log('Sending notification:', { recipient, notificationData });
    return this.notificationService.sendToUser(recipient, notificationData);
  }
}

module.exports = SocketService;