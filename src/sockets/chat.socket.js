const { saveMessage } = require("../app/module/Chat/chat.controller");
const Message = require('../app/module/Chat/Chat');

module.exports = (io, socket, socketService) => {
  console.log('[Chat] Initializing chat socket handlers for socket:', socket.id);
  
  // Debug: Log the socketService structure (careful with circular references)
  const logSocketService = () => {
    if (!socketService) {
      console.error('[Chat] socketService is undefined');
      return;
    }
    console.log('[Chat] socketService contains:', {
      hasConnectedUsers: !!socketService.connectedUsers,
      connectedUsersSize: socketService.connectedUsers?.size || 0,
      methods: Object.keys(socketService).filter(key => typeof socketService[key] === 'function')
    });
  };
  
  logSocketService();

  // Join a chat room
  socket.on('join_room', (roomId) => {
    console.log(`[Chat] join_room request from socket ${socket.id} for room ${roomId}`);
    
    if (!roomId) {
      console.error('[Chat] No roomId provided to join_room');
      return;
    }
    
    if (!socketService?.connectedUsers?.has(socket.id)) {
      console.error('[Chat] Socket not authenticated, cannot join room');
      return;
    }
    
    socket.join(roomId);
    console.log(`[Chat] Socket ${socket.id} joined room ${roomId}`);
    
    // Acknowledge room join
    socket.emit('room_joined', { 
      success: true, 
      roomId,
      socketId: socket.id
    });
  });

  // Leave a chat room
  socket.on('leave_room', (roomId) => {
    console.log(`[Chat] leave_room request from socket ${socket.id} for room ${roomId}`);
    
    socket.leave(roomId);
    console.log(`[Chat] Socket ${socket.id} left room ${roomId}`);
  });

  // Handle new message
  socket.on('send_message', async ({ receiver, message }) => {
    console.log('[Chat] send_message event received:', { 
      socketId: socket.id,
      receiver,
      message: message ? `${message.substring(0, 50)}${message.length > 50 ? '...' : ''}` : 'empty message'
    });
    
    try {
      // Verify socketService and connectedUsers
      if (!socketService || !socketService.connectedUsers) {
        const error = new Error('SocketService or connectedUsers is not available');
        console.error('[Chat]', error.message);
        return socket.emit('error', { 
          message: 'Internal server error',
          details: error.message
        });
      }

      // Get sender data
      const senderData = socketService.connectedUsers.get(socket.id);
      console.log('[Chat] Sender data from connectedUsers:', senderData);
      
      if (!senderData) {
        const error = 'User not authenticated';
        console.error(`[Chat] ${error}`);
        return socket.emit('error', { 
          message: 'Unauthorized',
          details: error
        });
      }

      const sender = {
        id: senderData.userId,
        role: senderData.role
      };

      console.log('[Chat] Processing message from:', sender, 'to:', receiver);
      
      // Save the message
      const newMessage = await saveMessage(sender, receiver, message, io);
      
      // Generate room ID (must be consistent for both sender and receiver)
      const roomId = [
        `${sender.role}:${sender.id}`,
        `${receiver.role}:${receiver.id}`
      ].sort().join('_');
      
      console.log('[Chat] Emitting receive_message to room:', roomId);
      
      // Send the message to the room
      io.to(roomId).emit('receive_message', {
        ...newMessage.toObject(),
        roomId // Include roomId in the response
      });
      
      console.log('[Chat] Message sent successfully');
      
    } catch (error) {
      console.error('[Chat] Error in send_message:', error);
      socket.emit('error', { 
        message: 'Failed to send message',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // Handle typing indicator
  socket.on('typing', ({ roomId, isTyping }) => {
    console.log('[Chat] typing event:', { socketId: socket.id, roomId, isTyping });
    
    if (!socketService?.connectedUsers) {
      console.error('[Chat] SocketService or connectedUsers not available');
      return;
    }
    
    const userData = socketService.connectedUsers.get(socket.id);
    if (userData) {
      console.log(`[Chat] Broadcasting typing status for user ${userData.userId} in room ${roomId}`);
      socket.to(roomId).emit('user_typing', { 
        userId: userData.userId,
        isTyping 
      });
    } else {
      console.error('[Chat] No user data found for socket:', socket.id);
    }
  });

  // Handle read receipt
  socket.on('mark_as_read', async ({ roomId }) => {
    console.log('[Chat] mark_as_read event:', { socketId: socket.id, roomId });
    
    try {
      if (!socketService?.connectedUsers) {
        console.error('[Chat] SocketService or connectedUsers not available');
        return;
      }
      
      const userData = socketService.connectedUsers.get(socket.id);
      if (!userData) {
        console.error('[Chat] No user data found for socket:', socket.id);
        return;
      }

      console.log(`[Chat] Marking messages as read in room ${roomId} for user ${userData.userId}`);
      
      const result = await Message.updateMany(
        {
          roomId,
          'receiver.id': userData.userId,
          'receiver.role': userData.role,
          isRead: false
        },
        { $set: { isRead: true } }
      );

      console.log(`[Chat] Marked ${result.modifiedCount} messages as read`);

      // Notify other users in the room
      socket.to(roomId).emit('messages_read', { 
        userId: userData.userId,
        roomId,
        timestamp: new Date()
      });
      
    } catch (error) {
      console.error('[Chat] Error in mark_as_read:', error);
      socket.emit('error', {
        message: 'Failed to mark messages as read',
        details: error.message
      });
    }
  });

  console.log('[Chat] Chat socket handlers initialized for socket:', socket.id);
};