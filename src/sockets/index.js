// src/sockets/index.js
const chatSocket = require('./chat.socket');
const userSocket = require('./user.socket');

module.exports = (io, socket, socketService) => {
  console.log('Initializing socket handlers for socket:', socket.id);
  
  // Debug log the socketService structure (but be careful with circular references)
  console.log('SocketService in index.js:', {
    hasConnectedUsers: !!socketService?.connectedUsers,
    socketServiceMethods: Object.keys(socketService || {}).filter(key => typeof socketService[key] === 'function')
  });

  try {
    // Initialize chat socket handlers
    chatSocket(io, socket, socketService);
    
    // Initialize user socket handlers
    userSocket(io, socket, socketService);
    
    console.log('All socket handlers initialized for socket:', socket.id);
  } catch (error) {
    console.error('Error initializing socket handlers:', error);
    // Emit error to the client
    socket.emit('error', { 
      message: 'Failed to initialize socket handlers',
      error: error.message 
    });
  }
};
