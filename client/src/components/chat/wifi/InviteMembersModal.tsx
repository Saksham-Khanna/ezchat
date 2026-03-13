import { useState, useEffect } from "react";
import { X, Plus, UserPlus, Search, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SOCKET_URL } from "@/lib/config";

interface AddMembersModalProps {
  onClose: () => void;
  onInvite: (memberIds: string[]) => void;
  friends: any[];
  existingMemberIds: string[];
  roomName: string;
  currentUserId: string;
}

const AddMembersModal = ({ onClose, onInvite, friends, existingMemberIds, roomName, currentUserId }: AddMembersModalProps) => {
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const searchUsers = async (query: string) => {
    setIsSearching(true);
    try {
      const resp = await fetch(`${SOCKET_URL}/api/auth/search?query=${query}&userId=${currentUserId}`);
      if (resp.ok) {
        const data = await resp.json();
        setSearchResults(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleMember = (id: string) => {
    setSelectedMembers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    if (selectedMembers.size === 0) return;
    onInvite(Array.from(selectedMembers));
    onClose();
  };

  // Merge friends and search results, filtering out existing members
  const availableUsers = [
    ...friends.filter(f => !existingMemberIds.includes(f._id)),
    ...searchResults.filter(r => !existingMemberIds.includes(r._id) && !friends.some(f => f._id === r._id))
  ].filter((user, index, self) => index === self.findIndex(u => u._id === user._id));

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-sm glass bg-secondary/70 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <UserPlus className="w-6 h-6 text-primary-foreground stroke-[3]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground drop-shadow-sm">Add Members</h2>
              <p className="text-[11px] text-muted-foreground font-bold tracking-widest uppercase opacity-70 truncate max-w-[180px]">{roomName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.05] flex items-center justify-center text-muted-foreground hover:text-foreground transition-all active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Search App Users</label>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter username..."
                className="w-full pl-11 pr-4 py-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] text-foreground font-bold placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
              />
              {isSearching && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                   <Loader2 className="w-4 h-4 text-primary animate-spin" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
             <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
               {searchQuery ? 'Search Results' : 'Recent Friends'} ({selectedMembers.size})
             </label>
             <div className="max-h-60 overflow-y-auto scrollbar-thin p-1 space-y-1.5 bg-white/[0.02] border border-white/[0.04] rounded-2xl">
               {availableUsers.length === 0 ? (
                 <p className="text-[10px] text-muted-foreground italic p-8 text-center leading-relaxed">
                   {searchQuery ? "No users found matching your search." : "No friends available to add."}
                 </p>
               ) : (
                 availableUsers.map(user => (
                   <button
                     key={user._id}
                     onClick={() => toggleMember(user._id)}
                     className={`w-full flex items-center justify-between p-3 rounded-xl transition-all border ${
                       selectedMembers.has(user._id) 
                         ? "bg-primary/10 border-primary/30 text-primary" 
                         : "bg-white/[0.03] border-transparent text-muted-foreground hover:bg-white/[0.06]"
                     }`}
                   >
                     <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-[10px] font-black overflow-hidden ring-1 ring-white/10 shrink-0">
                          {user.avatar_url ? (
                            <img src={user.avatar_url.startsWith('http') ? user.avatar_url : `${SOCKET_URL}${user.avatar_url}`} alt="" className="w-full h-full object-cover" />
                          ) : (
                            user.username?.charAt(0).toUpperCase()
                          )}
                       </div>
                       <span className="text-xs font-bold truncate">{user.username}</span>
                     </div>
                     <div className={`w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center ${
                       selectedMembers.has(user._id) ? "bg-primary border-primary" : "border-white/10"
                     }`}>
                       {selectedMembers.has(user._id) && <Plus className="w-3 h-3 text-primary-foreground stroke-[4]" />}
                     </div>
                   </button>
                 ))
               )}
             </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] text-xs font-black text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all active:scale-95"
            >
              CANCEL
            </button>
            <button 
              onClick={handleAdd}
              disabled={selectedMembers.size === 0}
              className="flex-1 py-4 rounded-2xl gradient-primary text-xs font-black text-primary-foreground hover:opacity-90 transition-all disabled:opacity-30 active:scale-95 shadow-xl shadow-primary/20 glow-button"
            >
              ADD MEMBERS
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AddMembersModal;
