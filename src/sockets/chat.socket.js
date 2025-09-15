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
    
    try {
      if (!roomId) {
        console.error('[Chat] No roomId provided to join_room');
        socket.emit('room_join_error', { 
          success: false,
          message: 'No roomId provided',
          socketId: socket.id
        });
        return;
      }
      
      if (!socketService?.connectedUsers?.has(socket.id)) {
        console.error('[Chat] Socket not authenticated, cannot join room');
        socket.emit('room_join_error', { 
          success: false,
          message: 'Socket not authenticated',
          socketId: socket.id
        });
        return;
      }
      
      const userData = socketService.connectedUsers.get(socket.id);
      console.log(`[Chat] User data for join_room:`, userData);
      
      socket.join(roomId);
      console.log(`[Chat] Socket ${socket.id} (${userData?.role}:${userData?.userId}) joined room ${roomId}`);
      
      // Acknowledge room join
      socket.emit('room_joined', { 
        success: true, 
        roomId,
        socketId: socket.id,
        userId: userData?.userId,
        role: userData?.role
      });
      
    } catch (error) {
      console.error('[Chat] Error in join_room:', error);
      socket.emit('room_join_error', { 
        success: false,
        message: 'Failed to join room',
        details: error.message,
        socketId: socket.id
      });
    }
  });

  // Leave a chat room
  socket.on('leave_room', (roomId) => {
    console.log(`[Chat] leave_room request from socket ${socket.id} for room ${roomId}`);
    
    socket.leave(roomId);
    console.log(`[Chat] Socket ${socket.id} left room ${roomId}`);
  });

  // Handle new message - SIMPLIFIED VERSION (No room dependency)
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
      
      // Save the message (returns enriched message)
      const newMessage = await saveMessage(sender, receiver, message, io);
      
      // Generate room ID for database queries only (not for socket communication)
      const { generateRoomId } = require('../utils/chatHandler');
      const roomId = generateRoomId(sender, receiver);

      // Compute unread count for the receiver
      const unreadCount = await Message.countDocuments({
        roomId,
        'receiver.id': receiver.id,
        'receiver.role': receiver.role,
        isRead: false
      });

      // Build conversation-style payload for the receiver
      const conversationPayloadForReceiver = {
        lastMessage: newMessage, // already enriched
        unreadCount,
        roomId,
        otherUser: {
          id: newMessage.sender?.id,
          name: newMessage.sender?.name,
          profilePic: newMessage.sender?.profilePic,
          role: newMessage.sender?.role
        }
      };

      console.log('[Chat] Conversation payload:', JSON.stringify(conversationPayloadForReceiver, null, 2));
      
      // STEP 1: Send confirmation to sender
      socket.emit('message_sent', {
        success: true,
        message: 'Message sent successfully',
        conversation: conversationPayloadForReceiver,
        timestamp: new Date()
      });
      console.log('[Chat] Confirmation sent to sender');
      
      // STEP 2: Send message to receiver using improved socket service methods
      console.log('[Chat] Sending message to receiver:', receiver);
      
      // Use the new socket service method for reliable delivery
      const isOnline = socketService.sendToUser(
        receiver.id, 
        receiver.role, 
        'receive_message', 
        conversationPayloadForReceiver
      );
      
      if (isOnline) {
        console.log('[Chat] Receiver is online, message sent successfully');
      } else {
        console.log('[Chat] Receiver is offline, message sent via room and will be delivered when they come online');
      }
      
      console.log('[Chat] Message processing completed');
      
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


  // Function to deliver pending messages when user comes online
  const deliverPendingMessages = async (userId, role, socket) => {
    try {
      console.log(`[Chat] Checking for pending messages for user ${userId} (${role})`);
      
      // Get all unread messages for this user
      const pendingMessages = await Message.find({
        'receiver.id': userId,
        'receiver.role': role,
        isRead: false
      }).sort({ createdAt: -1 }).lean();

      if (pendingMessages.length === 0) {
        console.log(`[Chat] No pending messages for user ${userId}`);
        return;
      }

      console.log(`[Chat] Found ${pendingMessages.length} pending messages for user ${userId}`);

      // Group messages by conversation (roomId)
      const conversations = {};
      pendingMessages.forEach(msg => {
        if (!conversations[msg.roomId]) {
          conversations[msg.roomId] = {
            lastMessage: msg,
            unreadCount: 0,
            roomId: msg.roomId,
            otherUser: {
              id: msg.sender.id,
              name: msg.sender.name,
              profilePic: msg.sender.profilePic,
              role: msg.sender.role
            }
          };
        }
        conversations[msg.roomId].unreadCount++;
      });

      // Send each conversation to the user with a small delay to ensure socket is ready
      const conversationArray = Object.values(conversations);
      for (let i = 0; i < conversationArray.length; i++) {
        const conversation = conversationArray[i];
        console.log(`[Chat] Delivering pending conversation ${i + 1}/${conversationArray.length} for room ${conversation.roomId}`);
        
        // Add small delay between messages to prevent overwhelming the client
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        socket.emit('receive_message', conversation);
      }

      console.log(`[Chat] Delivered ${conversationArray.length} pending conversations to user ${userId}`);

    } catch (error) {
      console.error('[Chat] Error delivering pending messages:', error);
    }
  };

  // Listen for user coming online and deliver pending messages
  socket.on('user_online', async () => {
    console.log('[Chat] user_online event received from socket:', socket.id);
    
    const userData = socketService.connectedUsers.get(socket.id);
    if (userData) {
      console.log(`[Chat] User ${userData.userId} (${userData.role}) is now online`);
      await deliverPendingMessages(userData.userId, userData.role, socket);
    }
  });

  // Heartbeat mechanism to keep connection alive and verify user is still authenticated
  socket.on('ping', () => {
    const userData = socketService.connectedUsers.get(socket.id);
    if (userData) {
      socket.emit('pong', { 
        success: true, 
        userId: userData.userId, 
        role: userData.role,
        timestamp: new Date()
      });
    } else {
      socket.emit('pong', { 
        success: false, 
        message: 'User not authenticated',
        timestamp: new Date()
      });
    }
  });

  console.log('[Chat] Chat socket handlers initialized for socket:', socket.id);
};