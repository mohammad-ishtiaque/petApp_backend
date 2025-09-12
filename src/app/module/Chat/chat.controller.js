// src/app/module/Chat/chat.controller.js
const Message = require("./Chat");
const {generateRoomId} = require("../../../utils/chatHandler");
const Notification = require("../Notification/Notification");
const User = require("../User/User");
const Owner = require("../Owner/Owner");

// Get messages for a chat room
exports.getMessages = async (req, res, next) => {
  try {
    // const { roomId } = req.params;
    const { limit = 20, page = 1, roomId } = req.query;
    const skip = (page - 1) * limit;
    
    if (!roomId) {
      return res.status(400).json({ message: 'Room ID is required' });
    }

    const messages = await Message.find({ roomId })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
      
    const totalMessages = await Message.countDocuments({ roomId });
    
    // Get unique sender and receiver IDs from messages
    const senderIds = [...new Set(messages.map(msg => msg.sender.id))];
    const receiverIds = [...new Set(messages.map(msg => msg.receiver.id))];
    const allUserIds = [...new Set([...senderIds, ...receiverIds])];
    
    // Fetch user and owner details
    const users = await User.find({ _id: { $in: allUserIds } })
      .select('name profilePic role')
      .lean();
    const owners = await Owner.find({ _id: { $in: allUserIds } })
      .select('name profilePic role')
      .lean();
    
    // Create a lookup map for user details
    const userDetailsMap = {};
    [...users, ...owners].forEach(user => {
      userDetailsMap[user._id.toString()] = {
        name: user.name,
        profilePic: user.profilePic,
        role: user.role
      };
    });
    
    // Enhance messages with user details
    const enhancedMessages = messages.map(msg => ({
      ...msg,
      sender: {
        ...msg.sender,
        ...userDetailsMap[msg.sender.id]
      },
      receiver: {
        ...msg.receiver,
        ...userDetailsMap[msg.receiver.id]
      }
    }));
    
    res.json({
      messages: enhancedMessages,
      pagination: {
        total: totalMessages,
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
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
    const { limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;
    
    // Get distinct conversations where user is either sender or receiver
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { 'sender.id': userId, 'sender.role': userRole.toUpperCase() },
            { 'receiver.id': userId, 'receiver.role': userRole.toUpperCase() }
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
                    { $eq: ['$receiver.role', userRole.toUpperCase()] },
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
      },
      {
        $skip: skip
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    // Get total count for pagination
    const totalConversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { 'sender.id': userId, 'sender.role': userRole.toUpperCase() },
            { 'receiver.id': userId, 'receiver.role': userRole.toUpperCase() }
          ]
        }
      },
      {
        $group: {
          _id: '$roomId'
        }
      },
      {
        $count: 'total'
      }
    ]);

    const total = totalConversations.length > 0 ? totalConversations[0].total : 0;

    // Get unique user IDs from conversations
    const allUserIds = [];
    conversations.forEach(conv => {
      allUserIds.push(conv.lastMessage.sender.id);
      allUserIds.push(conv.lastMessage.receiver.id);
    });
    const uniqueUserIds = [...new Set(allUserIds)];

    // Fetch user and owner details
    const users = await User.find({ _id: { $in: uniqueUserIds } })
      .select('name profilePic role')
      .lean();
    const owners = await Owner.find({ _id: { $in: uniqueUserIds } })
      .select('name profilePic role')
      .lean();
    
    // Create a lookup map for user details
    const userDetailsMap = {};
    [...users, ...owners].forEach(user => {
      userDetailsMap[user._id.toString()] = {
        name: user.name,
        profilePic: user.profilePic,
        role: user.role
      };
    });

    // Enhance conversations with user details
    const enhancedConversations = conversations.map(conv => {
      const lastMessage = conv.lastMessage;
      const otherUserId = lastMessage.sender.id.toString() === userId ? 
        lastMessage.receiver.id : lastMessage.sender.id;
      const otherUserRole = lastMessage.sender.id.toString() === userId ? 
        lastMessage.receiver.role : lastMessage.sender.role;
      
      return {
        ...conv,
        lastMessage: {
          ...lastMessage,
          sender: {
            ...lastMessage.sender,
            ...userDetailsMap[lastMessage.sender.id]
          },
          receiver: {
            ...lastMessage.receiver,
            ...userDetailsMap[lastMessage.receiver.id]
          }
        },
        otherUser: {
          id: otherUserId,
          ...userDetailsMap[otherUserId]
        }
      };
    });

    res.json({
      conversations: enhancedConversations,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
      }
    });
  } catch (error) {
    next(error);
  }
};

// Mark messages as read
exports.markAsRead = async (req, res, next) => {
  try {
    const { roomId } = req.query;
    const { id: userId, role: userRole } = req.user;

    await Message.updateMany(
      {
        roomId,
        'receiver.id': userId,
        'receiver.role': userRole.toUpperCase(),
        isRead: false
      },
      { $set: { isRead: true } }
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
