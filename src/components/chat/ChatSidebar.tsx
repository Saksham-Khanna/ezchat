import { Search, MessageCircle, LogOut, Plus } from "lucide-react";
import type { Friend } from "@/pages/Dashboard";

interface ChatSidebarProps {
  friends: Friend[];
  selectedFriend: Friend | null;
  onSelectFriend: (friend: Friend) => void;
  onLogout: () => void;
  username: string;
}

const ChatSidebar = ({ friends, selectedFriend, onSelectFriend, onLogout, username }: ChatSidebarProps) => {
  return (
    <div className="w-80 h-full glass flex flex-col border-r border-border shrink-0">
      {/* Header */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg gradient-text">QuickChat</span>
          </div>
          <button
            onClick={onLogout}
            className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* User */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
            {username[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{username}</p>
            <p className="text-xs text-muted-foreground">Online</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search friends..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>
      </div>

      {/* Friends List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-1">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Messages</span>
          <button className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {friends.map((friend) => (
          <button
            key={friend.id}
            onClick={() => onSelectFriend(friend)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
              selectedFriend?.id === friend.id
                ? "glass-strong"
                : "hover:bg-secondary/30"
            }`}
          >
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground font-medium text-sm">
                {friend.username[0]}
              </div>
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${
                  friend.is_online ? "bg-online" : "bg-offline"
                }`}
              />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground truncate">{friend.username}</p>
                <span className="text-[10px] text-muted-foreground shrink-0">{friend.last_message_time}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{friend.last_message}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ChatSidebar;
