import { useState, useEffect } from "react";
import { X, Plus, Hash, AlignLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SOCKET_URL } from "@/lib/config";


interface CreateRoomModalProps {
  onClose: () => void;
  onCreateRoom: (roomData: { 
    roomName: string, 
    description: string, 
    selectedMemberIds: string[]
  }) => void;
  friends: any[];
}

const CreateRoomModal = ({ onClose, onCreateRoom, friends }: CreateRoomModalProps) => {
  const [roomName, setRoomName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());

  const toggleMember = (id: string) => {
    setSelectedMembers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = () => {
    if (!roomName.trim()) return;
    onCreateRoom({
      roomName: roomName.trim(),
      description: description.trim(),
      selectedMemberIds: Array.from(selectedMembers)
    });
    onClose();
  };

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
        className="relative w-full max-w-md glass bg-secondary/70 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Plus className="w-6 h-6 text-primary-foreground stroke-[3]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground drop-shadow-sm">Create Mesh Group</h2>
              <p className="text-[11px] text-muted-foreground font-bold tracking-widest uppercase opacity-70">Start a local mesh chat</p>
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
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Room Name</label>
            <div className="relative group">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
              <input
                type="text"
                autoFocus
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g. Project Discussion"
                className="w-full pl-11 pr-4 py-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] text-foreground font-bold placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
              />
            </div>
          </div>

          <div className="space-y-3">
             <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Invite Friends ({selectedMembers.size})</label>
             <div className="max-h-40 overflow-y-auto scrollbar-thin p-1 space-y-1.5 bg-white/[0.02] border border-white/[0.04] rounded-2xl">
               {friends.length === 0 ? (
                 <p className="text-[10px] text-muted-foreground italic p-4 text-center">No friends available to add</p>
               ) : (
                 friends.map(friend => (
                   <button
                     key={friend._id}
                     onClick={() => toggleMember(friend._id)}
                     className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all border ${
                       selectedMembers.has(friend._id) 
                         ? "bg-primary/10 border-primary/30 text-primary" 
                         : "bg-white/[0.03] border-transparent text-muted-foreground hover:bg-white/[0.06]"
                     }`}
                   >
                     <div className="flex items-center gap-2.5">
                       <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-black overflow-hidden ring-1 ring-white/10 shrink-0">
                          {friend.avatar_url ? (
                            <img 
                              src={friend.avatar_url.startsWith('http') ? friend.avatar_url : `${SOCKET_URL}${friend.avatar_url}`} 
                              alt="" 
                              className="w-full h-full object-cover" 
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).parentElement?.insertAdjacentHTML('beforeend', `<span class="text-primary">${friend.username.charAt(0).toUpperCase()}</span>`);
                              }}
                            />
                          ) : (
                            <span className="text-primary">{friend.username.charAt(0).toUpperCase()}</span>
                          )}
                       </div>
                       <span className="text-xs font-bold truncate">{friend.username}</span>
                     </div>
                     <div className={`w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center ${
                       selectedMembers.has(friend._id) ? "bg-primary border-primary" : "border-white/10"
                     }`}>
                       {selectedMembers.has(friend._id) && <Plus className="w-3 h-3 text-primary-foreground stroke-[4]" />}
                     </div>
                   </button>
                 ))
               )}
             </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Optional Description</label>
            <div className="relative group">
              <AlignLeft className="absolute left-4 top-5 w-4 h-4 text-primary opacity-50" />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this room about?"
                rows={3}
                className="w-full pl-11 pr-4 py-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] text-foreground font-medium placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none"
              />
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
              onClick={handleCreate}
              disabled={!roomName.trim()}
              className="flex-1 py-4 rounded-2xl gradient-primary text-xs font-black text-primary-foreground hover:opacity-90 transition-all disabled:opacity-30 active:scale-95 shadow-xl shadow-primary/20 glow-button"
            >
              CREATE ROOM
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CreateRoomModal;
