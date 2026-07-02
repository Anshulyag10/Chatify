import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

//Retrieves a list of all users except the currently logged-in user.
export const getUsersForSidebar = async (req, res) => {
  try {
    // Get the logged-in user's ID from the request object
    const loggedInUserId = req.user._id;

    // Find all users except the logged-in user and exclude their passwords
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    // Send the list of users as a response
    res.status(200).json(filteredUsers);
  } catch (error) {
    // Handle errors and return a 500 Internal Server Error response
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

//Retrieves chat history between the logged-in user and another user.
export const getMessages = async (req, res) => {
  try {
    // Extract the ID of the user to chat with from request parameters
    const { id: userToChatId } = req.params;
    
    // Get the logged-in user's ID
    const myId = req.user._id;

    // Find messages where the logged-in user is either the sender or receiver
    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    // Send the retrieved messages as a response
    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

//Sends a new message (text or image) to a specific user and emits it via WebSockets.
export const sendMessage = async (req, res) => {
  try {
    // Extract message details (text and image) from request body
    const { text, image } = req.body;
    // Extract receiver's user ID from request parameters
    const { id: receiverId } = req.params;

    // Get the logged-in user's ID (sender)
    const senderId = req.user._id;

    // Validate that we have at least text or image
    if (!text && !image) {
      return res.status(400).json({ error: "Message content is required" });
    }

    let imageUrl;
    if (image) {
      try {
        // Upload base64 image to cloudinary
        const uploadResponse = await cloudinary.uploader.upload(image);
        imageUrl = uploadResponse.secure_url;
      } catch (error) {
        console.log("Error uploading image:", error);
        // Continue without image if upload fails
      }
    }

    // Create a new message object
    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    // Save the new message to the database
    const savedMessage = await newMessage.save();

    // Send message via WebSockets - send to receiver only
    try {
      // Get the receiver's WebSocket socket ID
      const receiverSocketId = getReceiverSocketId(receiverId);
      
      // If the receiver is online, send them the new message via WebSockets
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("newMessage", savedMessage);
      }
      

    } catch (error) {
      console.log("Socket error in sendMessage:", error);
    }

    // Send the saved message as a response
    res.status(201).json(savedMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    
    // Handle errors and return a 500 Internal Server Error response
    res.status(500).json({ error: "Internal server error" });
  }
};

// Add or update a reaction for a message
export const addReaction = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { type } = req.body; // reaction type e.g. '👍' or '❤️'
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    // If the user already reacted, update; otherwise push new
    const existingIndex = message.reactions.findIndex(r => r.userId.toString() === userId.toString());
    if (existingIndex > -1) {
      message.reactions[existingIndex].type = type;
    } else {
      message.reactions.push({ userId, type });
    }

    await message.save();

    // Emit socket event to receiver if online
    const receiverId = message.receiverId.toString() === userId.toString() ? message.senderId : message.receiverId;
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('messageReaction', { messageId, userId, type });
    }

    res.status(200).json(message);
  } catch (error) {
    console.log('Error in addReaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mark a message as read by the authenticated user
export const markAsRead = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    if (!message.readBy.some(id => id.toString() === userId.toString())) {
      message.readBy.push(userId);
      await message.save();
    }

    // Notify sender that this message was read
    const senderSocketId = getReceiverSocketId(message.senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit('messageRead', { messageId, userId });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.log('Error in markAsRead:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};