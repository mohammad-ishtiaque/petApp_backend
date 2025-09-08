module.exports = (io, socket, socketService) => {
  console.log('[User] Initializing user socket handlers for socket:', socket.id);
  
  // Debug: Log the socketService structure
  const logSocketService = () => {
    if (!socketService) {
      console.error('[User] socketService is undefined');
      return;
    }
    console.log('[User] socketService contains:', {
      hasConnectedUsers: !!socketService.connectedUsers,
      connectedUsersSize: socketService.connectedUsers?.size || 0,
      methods: Object.keys(socketService).filter(key => typeof socketService[key] === 'function')
    });
  };
  
  logSocketService();

  // Handle user status (e.g., online/offline)
  socket.on('user_status', ({ status }) => {
    console.log('[User] user_status event received:', { 
      socketId: socket.id,
      status 
    });
    
    try {
      // Verify socketService and connectedUsers
      if (!socketService?.connectedUsers) {
        const error = 'SocketService or connectedUsers not available';
        console.error(`[User] ${error}`);
        return socket.emit('error', { 
          message: 'Internal server error',
          details: error
        });
      }
      
      const userData = socketService.connectedUsers.get(socket.id);
      console.log('[User] User data for status update:', userData);
      
      if (!userData) {
        const error = 'User not authenticated';
        console.error(`[User] ${error}`);
        return socket.emit('error', { 
          message: 'Unauthorized',
          details: error
        });
      }
      
      console.log(`[User] Broadcasting status update for user ${userData.userId}: ${status}`);
      
      // Broadcast user status to other clients (except sender)
      socket.broadcast.emit('user_status_changed', {
        userId: userData.userId,
        role: userData.role,
        status,
        timestamp: new Date()
      });
      
      // Acknowledge status update
      socket.emit('status_updated', { 
        success: true,
        userId: userData.userId,
        status,
        timestamp: new Date()
      });
      
    } catch (error) {
      console.error('[User] Error in user_status handler:', error);
      socket.emit('error', {
        message: 'Failed to update user status',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  console.log('[User] User socket handlers initialized for socket:', socket.id);
};