// src/app/module/Chat/chat.controller.js
const Message = require("./Chat");
const {generateRoomId} = require("../../../utils/chatHandler");
const Notification = require("../Notification/Notification");

// Get messages for a chat room
exports.getMessages = async (req, res, next) => {
  try {
    const { senderRole, senderId, receiverRole, receiverId } = req.query;
    const roomId = generateRoomId(
      { role: senderRole, id: senderId },
      { role: receiverRole, id: receiverId }
    );

    const messages = await Message.find({ roomId })
      .sort({ createdAt: 1 })
      .lean();
      
    res.json(messages);
  } catch (err) {
    next(err);
  }
};

// Save message (used by both API and socket)
exports.saveMessage = async (sender, receiver, text, io = null) => {
  try {
    const roomId = generateRoomId(sender, receiver);

    // Save the message
    const newMsg = await Message.create({
      sender,
      receiver,
      message: text,
      roomId
    });

    // Create a notification for the receiver
    const notification = await Notification.create({
      recipient: receiver,
      sender: sender,
      type: 'MESSAGE',
      title: 'New Message',
      message: `You have a new message from ${sender.role}`,
      relatedEntity: {
        type: 'CHAT',
        id: newMsg._id
      },
      data: {
        roomId,
        messagePreview: text.length > 50 ? `${text.substring(0, 50)}...` : text
      }
    });

    // Emit the new message to the room
    if (io) {
      io.to(roomId).emit('new_message', newMsg);
      
      // Emit notification to the receiver
      const receiverRoom = `${receiver.role}:${receiver.id}`;
      io.to(receiverRoom).emit('new_notification', notification);
    }

    return newMsg;
  } catch (error) {
    console.error('Error saving message:', error);
    throw error;
  }
};

// Get user's conversations
exports.getConversations = async (req, res, next) => {
  try {
    const { id: userId, role: userRole } = req.user;
    
    // Get distinct conversations where user is either sender or receiver
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { 'sender.id': userId, 'sender.role': userRole },
            { 'receiver.id': userId, 'receiver.role': userRole }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$roomId',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                { 
                  $and: [
                    { $eq: ['$receiver.id', userId] },
                    { $eq: ['$receiver.role', userRole] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          roomId: '$_id',
          lastMessage: 1,
          unreadCount: 1
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ]);

    res.json(conversations);
  } catch (error) {
    next(error);
  }
};

// Mark messages as read
exports.markAsRead = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { id: userId, role: userRole } = req.user;

    await Message.updateMany(
      {
        roomId,
        'receiver.id': userId,
        'receiver.role': userRole,
        isRead: false
      },
      { $set: { isRead: true } }
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
