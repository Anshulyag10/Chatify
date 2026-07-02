import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./Skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";

const ChatContainer = () => {
  const {
    messages,              // List of chat messages
    getMessages,           // Function to fetch messages from backend
    isMessagesLoading,     // Boolean flag for loading state
    selectedUser,          // The currently selected user in the chat
    subscribeToMessages,   // Function to subscribe to real-time messages
    unsubscribeFromMessages, // Function to unsubscribe when unmounting
  } = useChatStore();

  // Get the authenticated user
  const { authUser } = useAuthStore();

  // Reference to the message container for auto-scrolling
  const messageContainerRef = useRef(null);
  // Reference to the last message for auto-scrolling
  const lastMessageRef = useRef(null);

  useEffect(() => {
    if (selectedUser?._id) {
      getMessages(selectedUser._id); // Fetch messages for the selected user
      subscribeToMessages(); // Start real-time message updates
    }

    return () => unsubscribeFromMessages();
  }, [selectedUser?._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: "smooth" });
    } else if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark incoming messages as read when they are from the selected user
  useEffect(() => {
    if (!selectedUser?._id || !authUser) return;
    messages.forEach((msg) => {
      // If the message was sent by the selected user and current user hasn't marked it read
      const readBy = Array.isArray(msg.readBy) ? msg.readBy.map(id => id.toString()) : [];
      if (msg.senderId === selectedUser._id && !readBy.includes(authUser._id)) {
        // mark as read
        useChatStore.getState().markMessageRead(msg._id);
      }
    });
  }, [messages, selectedUser?._id, authUser]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4"
        ref={messageContainerRef}
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-zinc-500">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={message._id || index}
              className={`chat ${message.senderId === authUser?._id ? "chat-end" : "chat-start"}`}
              ref={index === messages.length - 1 ? lastMessageRef : null} 
            >
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img
                    src={
                      message.senderId === authUser?._id
                        ? authUser?.profilePic || "/avatar.png"
                        : selectedUser?.profilePic || "/avatar.png" 
                    }
                    alt="profile pic"
                  />
                </div>
              </div>

              {/* Message timestamp */}
              <div className="chat-header mb-1">
                <time className="text-xs opacity-50 ml-1">
                  {formatMessageTime(message.createdAt)}
                </time>
              </div>

              <div className="chat-bubble flex flex-col">
                {message.image && (
                  <img
                    src={message.image}
                    alt="Attachment"
                    className="sm:max-w-[200px] rounded-md mb-2"
                  />
                )}
                {message.text && <p>{message.text}</p>}
                {/* Reactions display */}
                {message.reactions && message.reactions.length > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    {Object.entries(
                      (message.reactions || []).reduce((acc, r) => {
                        acc[r.type] = (acc[r.type] || 0) + 1;
                        return acc;
                      }, {})
                    ).map(([emoji, count]) => (
                      <div key={emoji} className="px-2 py-1 bg-base-200 rounded-full">{emoji} {count}</div>
                    ))}
                  </div>
                )}
              </div>
              {/* Reaction actions and read receipt */}
              <div className="text-xs opacity-60 mt-1 flex items-center gap-2">
                <div className="flex gap-1">
                  {['👍','❤️','😂','😮','🎉'].map(e => (
                    <button
                      key={e}
                      onClick={() => useChatStore.getState().reactToMessage(message._id, e)}
                      className="text-xs"
                      type="button"
                    >{e}</button>
                  ))}
                </div>
                {message.senderId === authUser?._id && (
                  <div className="ml-2">{Array.isArray(message.readBy) && message.readBy.map(id => id.toString()).includes(selectedUser?._id) ? 'Seen' : 'Sent'}</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;