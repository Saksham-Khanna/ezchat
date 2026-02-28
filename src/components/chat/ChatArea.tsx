import { Send, Image, Smile, Phone, Video, MoreVertical, UserCircle } from "lucide-react";
import type { Friend, Message } from "@/pages/Dashboard";
import MessageBubble from "./MessageBubble";
import { RefObject } from "react";

interface ChatAreaProps {
  selectedFriend: Friend | null;
  messages: Message[];
  newMessage: string;
  onNewMessageChange: (msg: string) => void;
  onSendMessage: () => void;
  onToggleProfile: () => void;
  messagesEndRef: RefObject<HTMLDivElement>;
}

const ChatArea = ({
  selectedFriend,
  messages,
  newMessage,
  onNewMessageChange,
  onSendMessage,
  onToggleProfile,
  messagesEndRef,
}: ChatAreaProps) => {
  if (!selectedFriend) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 rounded-2xl gradient-primary mx-auto mb-4 flex items-center justify-center opacity-50">
            <UserCircle className="w-10 h-10 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Select a conversation to start chatting</p>
        </div>
      </div>
    );
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="glass border-b border-border px-6 py-4 flex items-center justify-between shrink-0">
        <button onClick={onToggleProfile} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground font-medium">
              {selectedFriend.username[0]}
            </div>
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${
                selectedFriend.is_online ? "bg-online" : "bg-offline"
              }`}
            />
          </div>
          <div className="text-left">
            <p className="font-medium text-foreground">{selectedFriend.username}</p>
            <p className="text-xs text-muted-foreground">
              {selectedFriend.is_online ? "Online" : "Offline"}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2">
          {[Phone, Video, MoreVertical].map((Icon, i) => (
            <button
              key={i}
              className="w-9 h-9 rounded-xl bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} isOwn={msg.sender_id === "me"} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="glass rounded-2xl flex items-center gap-2 px-4 py-2">
          <button className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all shrink-0">
            <Image className="w-5 h-5" />
          </button>
          <button className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all shrink-0">
            <Smile className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => onNewMessageChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none py-2 text-sm"
          />
          <button
            onClick={onSendMessage}
            disabled={!newMessage.trim()}
            className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground disabled:opacity-30 hover:opacity-90 transition-all shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;
