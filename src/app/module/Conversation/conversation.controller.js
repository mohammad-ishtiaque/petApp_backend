const catchAsync = require("../../../utils/catchAsync");
const { ApiError } = require("../../../errors/errorHandler");
const { HTTP_STATUS } = require("../../../utils/enum");
const Conversation = require("./conversation.model");
const User = require("../User/User");
const { onlineUsers } = require("../../../sockets/SocketConnection");
const Message = require("./message.model");
const Owner = require("../Owner/Owner");

const getConversation = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;
    const { partnerId, page = 1, limit = 20 } = req.query;

    if (!partnerId) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Missing partner ID.");
    }

    // Find the conversation and populate messages
    let conversation = await Conversation.findOne({
      participants: { $all: [userId, partnerId] },
    })
      .populate({
        path: "messages",
        options: {
          sort: { createdAt: -1 },
          skip: (page - 1) * Number(limit),
          limit: Number(limit),
        },
      })
      .lean();

    // If no conversation, still try to populate the partner for response
    if (!conversation) {
      // Try to find partner in User or Owner
      let partner =
        (await User.findById(partnerId)
          .select("name profilePic role")
          .lean()) ||
        (await Owner.findById(partnerId)
          .select("name profilePic role")
          .lean());

      return res.status(200).json({
        status: true,
        conversation: null,
        message: "No message history",
        participant: partner,
      });
    }

    // Populate participants with role, name, profilePic
    const populatedParticipants = await Promise.all(
      conversation.participants.map(async (id) => {
        let user =
          (await User.findById(id)
            .select("role name profilePic")
            .lean()) ||
          (await Owner.findById(id)
            .select("role name profilePic")
            .lean());
        return user
          ? { _id: id, ...user }
          : { _id: id, role: null, name: null, profilePic: null };
      })
    );

    // Replace participants array with populated info
    conversation.participants = populatedParticipants;

    // Determine block status
    let isBlockedByYou = false;
    let isBlockedByPartner = false;

    if (conversation) {
      isBlockedByYou = conversation.blockedBy.map(id => id.toString()).includes(userId.toString());
      isBlockedByPartner = conversation.blockedBy.map(id => id.toString()).includes(partnerId.toString());
    }

    // Find partner info for response
    let partner =
      populatedParticipants.find(
        (p) => p._id.toString() === partnerId.toString()
      ) || null;

    res.status(200).json({
      status: true,
      conversation,
      message: "Fetched all message history",
      participant: partner,
      blockStatus: {
        isBlockedByYou,
        isBlockedByPartner,
        isBlocked: isBlockedByYou || isBlockedByPartner, // True if either blocked
      },
    });
  } catch (error) {
    console.error("Error fetching conversation:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

const getConversationList = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, search = "" } = req.query;
    const skip = (page - 1) * limit;

    const user = (await User?.findById(userId)) || (await Owner?.findById(userId));
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const conversations = await Conversation.find({ participants: userId })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    if (conversations.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          currentPage: Number(page),
          totalPages: 1,
          totalConversations: 0,
        },
      });
    }

    const conversationIds = conversations.map((conv) => conv._id);
    const lastMessages = await Message.find({
      conversationId: { $in: conversationIds },
    })
      .sort({ createdAt: -1 })
      .lean();

    const lastMessageMap = {};
    lastMessages.forEach((msg) => {
      if (!lastMessageMap[msg.conversationId]) {
        lastMessageMap[msg.conversationId] = msg;
      }
    });

    const processedConversations = await Promise.all(
      conversations.map(async (conversation) => {
        // Manually populate participants from both User and Owner collections
        const populatedParticipants = await Promise.all(
          conversation.participants.map(async (participantId) => {
            // Try to find in User collection first, then Owner collection
            let participant = await User.findById(participantId)
              .select("name profilePic role")
              .lean();
            
            if (!participant) {
              participant = await Owner.findById(participantId)
                .select("name profilePic role")
                .lean();
            }
            
            return participant ? { 
              _id: participantId, 
              ...participant 
            } : { 
              _id: participantId, 
              name: "Unknown User", 
              profilePic: null, 
              role: null 
            };
          })
        );

        // Find the other participant (not the current user)
        const otherParticipant = populatedParticipants.find(
          (participant) => participant._id.toString() !== userId.toString()
        );

        if (!otherParticipant) return null;

        // Apply search filter if provided
        if (search && !otherParticipant.name?.toLowerCase().includes(search.toLowerCase())) {
          return null;
        }

        const lastMessage = lastMessageMap[conversation._id] || null;
        const isOnline = onlineUsers.has(otherParticipant._id.toString());
        const unreadCount = await Message.countDocuments({
          conversationId: conversation._id,
          sender: otherParticipant._id,
          seen: false,
        });

        // Populate sender info for last message
        let detailedLastMessage = null;
        if (lastMessage) {
          let senderInfo = await User.findById(lastMessage.sender)
            .select("name profilePic")
            .lean();
          
          if (!senderInfo) {
            senderInfo = await Owner.findById(lastMessage.sender)
              .select("name profilePic")
              .lean();
          }

          detailedLastMessage = {
            ...lastMessage,
            sender: lastMessage.sender,
            receiver: otherParticipant._id
          };
        }

        return {
          conversationId: conversation._id,
          blockedBy: conversation.blockedBy,
          participants: [
            {
              id: userId,
              name: user.name,
              profileImage: user.profilePic || "",
              online: onlineUsers.has(userId.toString()),
            },
            {
              id: otherParticipant._id,
              name: otherParticipant.name,
              profileImage: otherParticipant.profilePic || "",
              online: isOnline,
            },
          ],
          lastMessage: detailedLastMessage,
          unreadCount,
          updatedAt: conversation.updatedAt,
        };
      })
    );

    const validConversations = processedConversations.filter(Boolean);
    const uniqueConversations = Array.from(new Set(validConversations.map(conv => conv.conversationId)))
      .map(id => validConversations.find(conv => conv.conversationId === id));

    const totalConversations = await Conversation.countDocuments({
      participants: userId,
    });

    res.status(200).json({
      success: true,
      data: uniqueConversations,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalConversations / limit),
        totalConversations,
      },
    });
  } catch (error) {
    console.error("Error fetching inbox list:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// const blockUser = catchAsync(async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { targetUserId } = req.params;

//     if (userId === targetUserId) {
//       return res.status(400).json({
//         success: false,
//         message: "You cannot block yourself."
//       });
//     }

//     // Find or create conversation between users
//     let conversation = await Conversation.findOne({
//       participants: { $all: [userId, targetUserId] }
//     });

//     if (!conversation) {
//       conversation = await Conversation.create({
//         participants: [userId, targetUserId],
//         messages: []
//       });
//     }

//     // Check if already blocked
//     if (conversation.blockedBy.includes(userId)) {
//       return res.status(400).json({
//         success: false,
//         message: "You have already blocked this user."
//       });
//     }

//     // Add user to blockedBy array
//     conversation.blockedBy.push(userId);
//     await conversation.save();

//     res.status(200).json({
//       success: true,
//       message: "User blocked successfully.",
//       blocked: true
//     });
//   } catch (error) {
//     console.error("Error blocking user:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error while blocking user."
//     });
//   }
// });

// const unblockUser = catchAsync(async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { targetUserId } = req.params;

//     const conversation = await Conversation.findOne({
//       participants: { $all: [userId, targetUserId] }
//     });

//     if (!conversation) {
//       return res.status(404).json({
//         success: false,
//         message: "No conversation found with this user."
//       });
//     }

//     // Check if user is in blockedBy array
//     const isBlocked = conversation.blockedBy.includes(userId);
//     if (!isBlocked) {
//       return res.status(400).json({
//         success: false,
//         message: "You have not blocked this user."
//       });
//     }

//     // Remove user from blockedBy array
//     conversation.blockedBy = conversation.blockedBy.filter(
//       id => id.toString() !== userId.toString()
//     );
//     await conversation.save();

//     res.status(200).json({
//       success: true,
//       message: "User unblocked successfully.",
//       blocked: false
//     });
//   } catch (error) {
//     console.error("Error unblocking user:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error while unblocking user."
//     });
//   }
// });

// const checkUserIsBlocked = catchAsync(async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { targetUserId } = req.params;

//     if (userId === targetUserId) {
//       return res.status(200).json({
//         success: true,
//         isBlockedByYou: false,
//         isBlockedByThem: false,
//         canMessage: true,
//         message: "Self-check - always allowed"
//       });
//     }

//     const conversation = await Conversation.findOne({
//       participants: { $all: [userId, targetUserId] }
//     });

//     // If no conversation exists, no blocks exist
//     if (!conversation) {
//       return res.status(200).json({
//         success: true,
//         isBlockedByYou: false,
//         isBlockedByThem: false,
//         canMessage: true,
//         message: "No conversation exists - messaging allowed"
//       });
//     }

//     const isBlockedByYou = conversation.blockedBy.includes(userId);
//     const isBlockedByThem = conversation.blockedBy.includes(targetUserId);
//     const canMessage = !isBlockedByYou && !isBlockedByThem;

//     let message = "Messaging allowed";
//     if (isBlockedByYou && isBlockedByThem) {
//       message = "Both users have blocked each other";
//     } else if (isBlockedByYou) {
//       message = "You have blocked this user";
//     } else if (isBlockedByThem) {
//       message = "This user has blocked you";
//     }

//     res.status(200).json({
//       success: true,
//       isBlockedByYou,
//       isBlockedByThem,
//       canMessage,
//       message
//     });
//   } catch (error) {
//     console.error("Error checking block status:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error while checking block status."
//     });
//   }
// });

const blockToggle = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Convert userId to string for comparison
    const userIdStr = userId.toString();

    // Check if user is a participant (convert all to string for comparison)
    const isParticipant = conversation.participants.some(
      (id) => id.toString() === userIdStr
    );

    if (!isParticipant) {
      return res.status(403).json({ 
        message: "You are not a participant in this conversation." 
      });
    }

    // Check if the user has already blocked the conversation
    const isBlocked = conversation.blockedBy.some(
      (id) => id.toString() === userIdStr
    );

    if (isBlocked) {
      // UNBLOCK: Remove user from blockedBy array
      conversation.blockedBy = conversation.blockedBy.filter(
        (id) => id.toString() !== userIdStr
      );
      await conversation.save();
      
      console.log(`✅ User ${userIdStr} unblocked conversation ${conversationId}`);
      
      return res.status(200).json({
        success: true,
        message: "Conversation unblocked successfully.",
        blocked: false,
        conversationId: conversation._id
      });
    } else {
      // BLOCK: Add user to blockedBy array
      conversation.blockedBy.push(userId);
      await conversation.save();
      
      console.log(`🚫 User ${userIdStr} blocked conversation ${conversationId}`);
      
      return res.status(200).json({ 
        success: true, 
        message: "Conversation blocked successfully.", 
        blocked: true,
        conversationId: conversation._id
      });
    }
  } catch (error) {
    console.error("Error toggling block:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error please try again!" 
    });
  }
});

const chatImageVideo = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;

    const images = req.files?.chatImage || [];
    const video = req.files?.chatVideo?.[0] || null;
    const videoCover = req.files?.chatVideoCover?.[0] || null;

    const uploadedImages = images
      .map((f) => f.location || f.key || f.path)
      .filter(Boolean);
    const uploadedVideo = video
      ? video.location || video.key || video.path
      : null;
    const uploadedVideoCover = videoCover
      ? videoCover.location || videoCover.key || videoCover.path
      : null;

    return res.status(200).json({
      success: true,
      images: uploadedImages,
      video: uploadedVideo,
      cover: uploadedVideoCover,
    });
  } catch (error) {
    console.error("❌ Error uploading files", error);
    res.status(500).json({ success: false, message: "File Upload Error" });
  }
});

const deleteMessage = catchAsync(async (req, res) => {
  const userId = req.userId;
  const { messageId } = req.params;

  const message = await Message.findById(messageId);

  if (!message) {
    return res.status(404).json({
      success: false,
      message: "Message not found",
    });
  }

  if (message.sender !== userId) {
    return res.status(403).json({
      success: false,
      message: "You are not authorized to delete this message",
    });
  }

  await message.remove();

  return res.status(200).json({
    success: true,
    message: "Message deleted successfully",
  });
});

// Get a conversation by its id (with messages)
const getConversationById = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!conversationId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing conversation id" });
    }

    let conversation = await Conversation.findById(conversationId).lean();

    if (!conversation) {
      return res
        .status(404)
        .json({ success: false, message: "Conversation not found" });
    }

    // Manually fetch and paginate messages
    const messages = await Message.find({ conversationId: conversation._id })
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    // Manually populate sender and receiver for each message
    const populatedMessages = await Promise.all(
      messages.map(async (message) => {
        const sender =
          (await User.findById(message.sender)
            .select("name profilePic role")
            .lean()) ||
          (await Owner.findById(message.sender)
            .select("name profilePic role")
            .lean());

        const receiver =
          (await User.findById(message.receiver)
            .select("name profilePic role")
            .lean()) ||
          (await Owner.findById(message.receiver)
            .select("name profilePic role")
            .lean());

        return {
          ...message,
          sender,
          receiver,
        };
      })
    );

    // Replace the message IDs in the conversation object with the populated messages
    conversation.messages = populatedMessages;

    const otherId = conversation.participants.find(
      (p) => p.toString() !== userId?.toString()
    );

    let partner = null;
    if (otherId) {
      // Try to find the partner in both User and Owner collections
      partner =
        (await User.findById(otherId)
          .select("name profilePic address role")
          .lean()) ||
        (await Owner.findById(otherId)
          .select("name profilePic address role")
          .lean());
    }

    const isBlockedByYou = conversation.blockedBy
      .map((id) => id.toString())
      .includes(userId);
    const isBlockedByPartner = otherId
      ? conversation.blockedBy
          .map((id) => id.toString())
          .includes(otherId.toString())
      : false;

    return res.status(200).json({
      success: true,
      conversation,
      participant: partner,
      blockStatus: {
        isBlockedByYou,
        isBlockedByPartner,
        isBlocked: isBlockedByYou || isBlockedByPartner,
      },
    });
  } catch (error) {
    console.error("Error fetching conversation by id:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

const ConversationController = {
  getConversation,
  getConversationList,
  blockUser,
  unblockUser,
  checkUserIsBlocked,
  blockToggle,
  chatImageVideo,
  deleteMessage,
  getConversationById,
};

module.exports = { ConversationController };
