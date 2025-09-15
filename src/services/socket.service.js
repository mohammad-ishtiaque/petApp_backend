const socketIO = require('socket.io');
const NotificationService = require('./notification.service');
const socketHandlers = require('../sockets');
const tokenService = require('../utils/tokenService');

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
    
    // JWT handshake authentication
    this.io.use((socket, next) => {
      try {
        // Support multiple ways to pass token: auth.token, query.token, headers.authorization
        const { token: authToken } = socket.handshake.auth || {};
        const queryToken = socket.handshake.query?.token;
        const headerAuth = socket.handshake.headers?.authorization || socket.handshake.headers?.Authorization;
        const headerToken = headerAuth?.startsWith('Bearer ')
          ? headerAuth.slice('Bearer '.length)
          : undefined;
        const token = authToken || queryToken || headerToken;
        if (!token) {
          return next(new Error('Unauthorized'));
        }

        const payload = tokenService.verifyAccessToken(token);
        const userId = payload?.id || payload?._id || payload?.userId;
        const role = payload?.role;

        if (!userId || !role) {
          return next(new Error('Invalid token payload'));
        }

        const userRoom = `${role}:${userId}`;

        // Attach to socket for downstream use
        socket.data.userId = userId;
        socket.data.role = role;
        socket.data.userRoom = userRoom;

        // Track and join personal room before connection handlers
        this.connectedUsers.set(socket.id, { userId, role, userRoom });
        socket.join(userRoom);

        return next();
      } catch (err) {
        return next(err);
      }
    });

    // Initialize socket handling
    this.initializeSocket();
  }

  initializeSocket() {
    console.log('Setting up socket connection handlers...');
    
    this.io.on('connection', (socket) => {
      console.log('New client connected:', socket.id);
      console.log('Current connected users:', [...this.connectedUsers.entries()]);

      // If authenticated via handshake, acknowledge immediately
      const authedUser = this.connectedUsers.get(socket.id);
      if (authedUser) {
        socket.emit('authenticated', {
          success: true,
          userId: authedUser.userId,
          role: authedUser.role,
          socketId: socket.id
        });

        // Deliver pending messages for this user
        setTimeout(() => {
          socket.emit('user_online');
        }, 500); // Reduced delay to ensure socket handlers are initialized
      }

      // Handle user authentication and room joining
      socket.on('authenticate', ({ userId, role }) => {
        console.log('Authentication attempt:', { socketId: socket.id, userId, role });
        
        // If already authenticated via handshake, ignore for backward compatibility
        if (this.connectedUsers.has(socket.id)) {
          return socket.emit('authenticated', {
            success: true,
            userId: this.connectedUsers.get(socket.id).userId,
            role: this.connectedUsers.get(socket.id).role,
            socketId: socket.id
          });
        }

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

        // Deliver pending messages for this user
        setTimeout(() => {
          socket.emit('user_online');
        }, 500); // Reduced delay to ensure socket handlers are initialized
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

  // Method to find socket by user ID and role
  findUserSocket(userId, role) {
    const userIdStr = userId?.toString();
    for (const [socketId, userData] of this.connectedUsers.entries()) {
      const userDataIdStr = userData.userId?.toString();
      if (userDataIdStr === userIdStr && userData.role === role) {
        return this.io.sockets.sockets.get(socketId);
      }
    }
    return null;
  }

  // Method to send message to specific user
  sendToUser(userId, role, event, data) {
    const socket = this.findUserSocket(userId, role);
    if (socket) {
      socket.emit(event, data);
      return true;
    }
    
    // Fallback: send via room
    const userRoom = `${role}:${userId}`;
    this.io.to(userRoom).emit(event, data);
    return false; // Indicates user was offline, sent via room
  }
}

module.exports = SocketService;