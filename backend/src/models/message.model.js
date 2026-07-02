import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        senderId: {
            type: mongoose.Schema.Types.ObjectId,  // References another document (User)
            ref: "User",  // refers to the "User" model
            required: true,  
        },

        receiverId: { 
            type: mongoose.Schema.Types.ObjectId,  // References another document (User)
            ref: "User",  // refers to the "User" model
            required: true,  
        },

        text:{
            type : String,
        },

        image : {
            type: String
        },
            reactions: [
                {
                    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                    type: { type: String },
                }
            ],

            readBy: [
                { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
            ],
    },
    {timestamps : true} // Automatically adds `createdAt` and `updatedAt` fields
);

// Add index to speed up conversation queries between two users
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;