const socketIO = require('socket.io');
const { saveMessage } = require('../app/module/Chat/chat.controller');
const NotificationService = require('./notification.service');

class SocketService {
  constructor(server) {
    this.io = socketIO(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ["GET", "POST"],
        credentials: true
      }
    });
    
    this.notificationService = new NotificationService(this.io);
    this.connectedUsers = new Map();
    this.initializeSocket();
  }

  initializeSocket() {
    this.io.on('connection', (socket) => {
      console.log('New client connected:', socket.id);

      // Handle user authentication and room joining
      socket.on('authenticate', ({ userId, role }) => {
        if (!userId || !role) {
          console.error('Authentication failed: Missing userId or role');
          return;
        }

        const userRoom = `${role}:${userId}`;
        this.connectedUsers.set(socket.id, { userId, role, userRoom });
        
        // Join user's personal room for notifications
        socket.join(userRoom);
        console.log(`User ${userRoom} connected`);
      });

      // Handle new message
      socket.on('send_message', async ({ receiver, message }) => {
        try {
          const senderData = this.connectedUsers.get(socket.id);
          if (!senderData) {
            console.error('Unauthorized: User not authenticated');
            return;
          }

          const sender = {
            id: senderData.userId,
            role: senderData.role
          };

          // Save message and send notification
          const newMessage = await saveMessage(sender, receiver, message, this.io);
          
          // Emit the message to the room
          const roomId = [
            `${sender.role}:${sender.id}`,
            `${receiver.role}:${receiver.id}`
          ].sort().join('_');
          
          this.io.to(roomId).emit('receive_message', newMessage);
          
        } catch (error) {
          console.error('Error sending message:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Handle typing indicator
      socket.on('typing', ({ roomId, isTyping }) => {
        const userData = this.connectedUsers.get(socket.id);
        if (userData) {
          socket.to(roomId).emit('user_typing', { 
            userId: userData.userId,
            isTyping 
          });
        }
      });

      // Handle read receipt
      socket.on('mark_as_read', async ({ roomId }) => {
        try {
          const userData = this.connectedUsers.get(socket.id);
          if (!userData) return;

          // Update messages as read in the database
          await Message.updateMany(
            {
              roomId,
              'receiver.id': userData.userId,
              'receiver.role': userData.role,
              isRead: false
            },
            { $set: { isRead: true } }
          );

          // Notify other users in the room
          socket.to(roomId).emit('messages_read', { 
            userId: userData.userId,
            roomId 
          });
          
        } catch (error) {
          console.error('Error marking messages as read:', error);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        const userData = this.connectedUsers.get(socket.id);
        if (userData) {
          console.log(`User ${userData.userRoom} disconnected`);
          this.connectedUsers.delete(socket.id);
        }
      });
    });
  }

  // Method to send notification to a specific user
  async sendNotification(recipient, notificationData) {
    return this.notificationService.sendToUser(recipient, notificationData);
  }
}

module.exports = SocketService;
