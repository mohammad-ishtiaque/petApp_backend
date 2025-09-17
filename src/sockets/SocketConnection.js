const { ENUM_SOCKET_EVENT } = require("../utils/enum");
const User = require("../app/module/User/User");
const Conversation = require("../app/module/Conversation/conversation.model");
const Message = require("../app/module/Conversation/message.model");
const Owner = require("../app/module/Owner/Owner");

const onlineUsers = new Map();
let waitingUsers = [];

// Connect Socket
const socket = async (io) => {
  io.on(ENUM_SOCKET_EVENT.CONNECT, async (socket) => {
    const currentUserId = socket.handshake.query.id;

    if (currentUserId === undefined) {
      console.error("Invalid user ID provided:", currentUserId);
      return;
    }

    console.log("Handshake MongoDB UserId:", currentUserId);

    socket.join(currentUserId);
    onlineUsers.set(currentUserId, socket);
    console.log("A user connected", currentUserId);

    await onEvent(socket, io, onlineUsers);

    socket.on("disconnect", async () => {
      if (onlineUsers.has(currentUserId)) {
        onlineUsers.delete(currentUserId);
        console.log(`Removed ${currentUserId} from online users.`);
      }

    // Find the user before removing
    const removedUser = waitingUsers.find(user => user.id === currentUserId);
    
    if (removedUser) {
        waitingUsers = waitingUsers.filter(user => user.id !== currentUserId);
        // console.log(`User ${removedUser.id} removed from waiting list.`);
    } else {
        console.log(`User ${currentUserId} not found in waiting list.`);
    }
    });
  });
};

async function onEvent(socket, io, onlineUsers) {

  socket.on("join-random", (data) => {

    // console.log(socket.id);
  
  
    // console.log(`User ${data.currentUserId} requested random match`);

    if (waitingUsers.some(user => user.id === data.currentUserId)) {
      console.log(`User ${data.currentUserId} is already in the waiting list`);
      return;
    }

    if (waitingUsers.length > 0) {
        const randomIndex = Math.floor(Math.random() * waitingUsers.length);
        const matchedUser = waitingUsers.splice(randomIndex, 1)[0];

        const callId = `call_${data.currentUserId}_${matchedUser.id}`;
        
        const matchedUserSocketId = matchedUser.socketId;
        const currentUserSocketId = socket.id;

        io.to(currentUserSocketId).emit(`match-found/${data.currentUserId}`, { 
            callId, userId: matchedUser.id, username: matchedUser.username, image: matchedUser.image 
        });

        io.to(matchedUserSocketId).emit(`match-found/${matchedUser.id}`, { 
            callId, userId: data.currentUserId, username: data.username, image: data.image 
        });

        console.log(`Matched ${data.currentUserId} with ${matchedUser.id}`);
    } else {
        waitingUsers.push({ id: data.currentUserId, username: data.username, image: data.image, socketId: socket.id });
        console.log(`Added ${data.currentUserId} to waiting list`);
    }
});

socket.on("cancel-waiting", (data) => {
    const removedUser = waitingUsers.find(user => user.id === data);
    
    if (removedUser) {
        waitingUsers = waitingUsers.filter(user => user.id !== data);
        console.log(`User ${removedUser.id} removed from waiting list.`);
    } else {
        console.log(`User ${data} not found in waiting list.`);
    }
});

  socket.on("typing", ({ conversationId, senderId, receiverId }) => {
    try{
      console.log(`📝 ${senderId} is typing in conversation ${conversationId}`);
      io.to(receiverId).emit("typing", { conversationId, senderId });
    }catch(e){
      console.warn(`⚠️ Typing Error ${e} is not online.`);
    }
  });
  
  socket.on("stop_typing", ({ conversationId, senderId, receiverId }) => {
    try{
      console.log(`🛑 ${senderId} manually stopped typing in ${conversationId}`);
    io.to(receiverId).emit("stop_typing", { conversationId, senderId });
    }catch(e){
      console.warn(`⚠️ Typing Error ${e}`);
    }
  });   

  socket.on("ping", (data) => {
    socket.emit("pong", data);
  });

  socket.on(ENUM_SOCKET_EVENT.MARK_MESSAGES_AS_READ, async ({ conversationId, myId, senderId }) => {
    try {

      if (!conversationId || !myId || !senderId) {
        return socket.emit("error", { message: "Missing conversationId, myId, or senderId." });
      }

      const conversation = await Conversation.findById(conversationId);

      if (!conversation) {
        return socket.emit("error", { message: "Conversation not found." });
      }

      if (!conversation.participants.includes(myId)) {
        return socket.emit("error", { message: "Receiver is not a participant in this conversation." });
      }

      const unreadCount = await Message.countDocuments({
        conversationId,
        receiver: myId, 
        seen: false
      });
  
      console.log("Querying unread messages for:", unreadCount);

      const updateResult = await Message.updateMany(
        { conversationId, receiver: myId, seen: false },
        { $set: { seen: true } }
      );
  
      const unreadCount1 = await Message.countDocuments({
        conversationId,
        receiver: myId, 
        seen: false
      });
  
      console.log("Querying unread messages for1:", unreadCount1);

      console.log("Update Result:", updateResult);
      
      const userSocket = onlineUsers.get(myId);
      if (userSocket) {
        userSocket.emit(ENUM_SOCKET_EVENT.MARK_MESSAGES_AS_READ, {
          conversationId,
          seen: true,
          updateResult,
        });
      } else {
        console.log(`User with id ${myId} is not connected.`);
      }
  
      socket.to(senderId).emit(ENUM_SOCKET_EVENT.MARK_MESSAGES_AS_READ, {
        conversationId,
        seen: true,
        updateResult,
      });
  
    } catch (error) {
      console.error("Error in MARK_MESSAGES_AS_READ:", error);
      socket.emit("error", {
        message: error.message || "An unexpected error occurred while marking messages as read.",
      });
    }
  });
  

  socket.on(ENUM_SOCKET_EVENT.MESSAGE_NEW, async (data) => {
    const { senderId, receiverId, text, images, video, videoCover} = data;
    console.log("Incoming MESSAGE_NEW:", { senderId, receiverId, hasText: !!text, imagesCount: Array.isArray(images) ? images.length : 0, hasVideo: !!video });
  
    if (!senderId || !receiverId || (!text && (!images || images.length === 0) && !video)) {
      console.log("No valid message content provided");
      return socket.emit("error-message", {
        message: "Message must contain either text, at least one image, or a video!",
      });
    }
  
    try {
      const findAccountById = async (id) => {
        return (await User.findById(id)) || (await Owner.findById(id));
      };

      const sender = await findAccountById(senderId);
      const receiver = await findAccountById(receiverId);

    //   if (!sender || !receiver) {
    //     console.log("User lookup result:", { senderFound: !!sender, receiverFound: !!receiver, senderId, receiverId });
    //   }
  
      if (!sender || !receiver) {
        console.log("User not found in socket");
        return socket.emit("error-message", { message: "User not found!" });
      }
  
      // Find or create conversation
      let conversation = await Conversation.findOne({
        participants: { $all: [receiverId, senderId] },
      });
  
      if (!conversation) {
        conversation = await Conversation.create({
          participants: [senderId, receiverId],
          messages: [],
        });
      }
      
        if (conversation.blockedBy.includes(senderId)) {
          return socket.emit("error-message", { message: "You have blocked this conversation." });
        }

        if (conversation.blockedBy.includes(receiverId)) {
          return socket.emit("error-message", { message: "You cannot send messages to this user." });
        }  

      const newMessage = new Message({
        sender: senderId,
        receiver: receiverId,
        text: text || "",
        images: images && images.length > 0 ? images : [],
        video: video || "",
        videoCover: videoCover || "",
        conversationId: conversation._id,
        seen: false,
      });
  
      // Save the new message and update the conversation
      conversation.messages.push(newMessage._id);
      await Promise.all([conversation.save(), newMessage.save()]);
      // Emit to receiver's room with receiver-specific event
      await emitMessage(
        receiverId,
        newMessage,
        `${ENUM_SOCKET_EVENT.MESSAGE_NEW}/${senderId}`,
        io
      );
      // Emit echo to sender's room with sender-specific event
      await emitMessage(
        senderId,
        newMessage,
        `${ENUM_SOCKET_EVENT.MESSAGE_NEW}/${receiverId}`,
        io
      );

      await Message.updateMany(
        { conversationId: conversation._id, seen: false, sender: receiverId },
        { $set: { seen: true } }
      );

      // Calculate unread count for sender and receiver separately
      const unreadCountReceiver = await Message.countDocuments({
        conversationId: conversation._id,
        seen: false,
        sender: senderId,
      });
  
      const unreadCountSender = await Message.countDocuments({
        conversationId: conversation._id,
        seen: false,
        sender: receiverId,
      });
  
      // Populate sender and receiver details for the message
      const populatedMessage = {
        ...newMessage.toObject(),
        sender: {
          id: sender._id,
          name: sender.name,
          profilePic: sender.profilePic,
          role: sender.role || (sender.email ? 'USER' : 'OWNER')
        },
        receiver: {
          id: receiver._id,
          name: receiver.name,
          profilePic: receiver.profilePic,
          role: receiver.role || (receiver.email ? 'USER' : 'OWNER')
        }
      };

      // Construct the conversation updates for both participants
      const conversationUpdateReceiver = {
        conversationId: conversation._id,
        participant: {
          id: sender._id, // Receiver sees sender's details
          name: sender.name,
          profileImage: sender.profilePic,
          role: sender.role || (sender.email ? 'USER' : 'OWNER'),
          online: onlineUsers.has(sender._id.toString()) ?? false,
        },
        lastMessage: populatedMessage,
        unreadCount: unreadCountReceiver,
        updatedAt: new Date(),
      };
  
      const conversationUpdateSender = {
        conversationId: conversation._id,
        participant: {
          id: receiver._id, // Sender sees receiver's details
          name: receiver.name,
          profileImage: receiver.profilePic,
          role: receiver.role || (receiver.email ? 'USER' : 'OWNER'),
          online: onlineUsers.has(receiver._id.toString()) ?? false,
        },
        unreadCount: unreadCountSender,
        lastMessage: populatedMessage,
        updatedAt: new Date(),
      };
  
      // Use emitMessage for emitting the conversation updates and new message
      await emitMessage(receiverId, conversationUpdateReceiver, `${ENUM_SOCKET_EVENT.CONVERSATION_UPDATE}/${receiverId}`, io);
      await emitMessage(senderId, conversationUpdateSender, `${ENUM_SOCKET_EVENT.CONVERSATION_UPDATE}/${senderId}`, io);
  
    } catch (err) {
      console.error("Socket error:", err);
      socket.emit("error-message", {
        message: "An error occurred while sending the message.",
      });
    }
  });
  
  
}

const emitMessage = async (receiver, data, emit_message, io) => {
  if (io) {
    const roomSize = io.sockets.adapter.rooms.get(receiver.toString())?.size || 0;
    // console.log(`Emitting to room ${receiver} (size=${roomSize}) event=${emit_message}`);
    await io.to(receiver.toString()).emit(emit_message, data);
  } else {
    console.error("Socket.IO is not initialized");
  }
};

module.exports = {
  socket,
  onlineUsers,
};
