import { Share2, X, Send, Search } from "lucide-react";
import { useState } from "react";
import type { Friend, Message } from "@/pages/Dashboard";
import { SOCKET_URL } from "@/lib/config";

interface ForwardModalProps {
  message: Message | null;
  friends: Friend[];
  onForward: (recipientId: string) => void;
  onClose: () => void;
}

const ForwardModal = ({ message, friends, onForward, onClose }: ForwardModalProps) => {
  const [search, setSearch] = useState("");
  
  if (!message) return null;

  const filteredFriends = friends.filter(f => 
    f.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-card border border-white/[0.08] rounded-2xl p-0 max-w-sm w-full mx-4 shadow-2xl scale-in overflow-hidden max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-white/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-primary" />
            <h3 className="text-foreground font-semibold">Forward Message</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-secondary/50 flex items-center justify-center text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 border-b border-white/[0.05]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search people..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-secondary/30 border border-white/[0.05] rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 min-h-[300px]">
          {filteredFriends.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-xs">No people found</div>
          ) : (
            <div className="space-y-1">
              {filteredFriends.map((friend) => (
                <button
                  key={friend._id}
                  onClick={() => onForward(friend._id)}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-secondary/50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground font-medium overflow-hidden border border-white/[0.05]">
                          {friend.avatar_url ? (
                            <img 
                              src={friend.avatar_url.startsWith("http") ? friend.avatar_url : `${SOCKET_URL}${friend.avatar_url}`} 
                              alt="" 
                              className="w-full h-full object-cover" 
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).parentElement?.insertAdjacentHTML('beforeend', `<span class="flex items-center justify-center w-full h-full bg-primary/10 text-primary font-bold text-sm">${friend.username.charAt(0).toUpperCase()}</span>`);
                              }}
                            />
                          ) : (
                            <span className="text-primary font-bold text-sm">
                              {friend.username.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        {friend.is_online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-card rounded-full" />}
                      </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">{friend.username}</p>
                      <p className="text-[10px] text-muted-foreground">{friend.cv_id}</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <Send className="w-3.5 h-3.5" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 bg-secondary/20 text-[10px] text-muted-foreground text-center border-t border-white/[0.05]">
          The message will be sent with a "Forwarded" label
        </div>
      </div>
    </div>
  );
};

export default ForwardModal;
