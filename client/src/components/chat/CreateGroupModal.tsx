import { useState } from "react";
import { X, Users, MessageSquare, Search, Shield, ChevronRight, Loader2, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Friend {
  _id: string;
  username: string;
  avatar_url?: string;
  cv_id?: string;
  is_online?: boolean;
}

interface CreateGroupModalProps {
  friends: Friend[];
  onClose: () => void;
  onCreate: (name: string, MemberIds: string[]) => void;
}

const CreateGroupModal = ({ friends, onClose, onCreate }: CreateGroupModalProps) => {
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const filteredFriends = friends.filter(f => 
    f.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleMember = (id: string) => {
    setSelectedMembers(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) return;
    setIsCreating(true);
    try {
      await onCreate(groupName, selectedMembers);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-8"
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" onClick={onClose} />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-lg glass-card rounded-[2.5rem] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl border border-white/10"
      >
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
               <Users className="w-6 h-6 text-white" />
             </div>
             <div>
               <h2 className="text-xl font-black tracking-tight italic">Initiate <span className="text-primary not-italic">Mesh Group</span></h2>
               <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Protocol v4.2 Alpha</p>
             </div>
          </div>
          <button onClick={onClose} className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] transition-all">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin">
          {/* Group Name */}
          <div className="space-y-3">
             <label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] ml-1">Transmission Alias</label>
             <div className="relative group">
                <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-3xl bg-white/[0.03] border border-white/5 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all hover:bg-white/[0.05]"
                  placeholder="Enter group name..."
                />
             </div>
          </div>

          {/* Member Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">Select Members</label>
              <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-full">
                {selectedMembers.length} Joined
              </span>
            </div>

            {/* Search */}
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/[0.02] border border-white/5 text-xs focus:outline-none focus:border-primary/30 transition-all"
                placeholder="Search tactical personnel..."
              />
            </div>

            {/* List */}
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 scrollbar-thin">
              {filteredFriends.length === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-white/5 rounded-3xl">
                   <p className="text-xs text-muted-foreground/40 font-bold uppercase tracking-widest">No matching personnel</p>
                </div>
              ) : (
                filteredFriends.map(f => (
                  <button
                    key={f._id}
                    onClick={() => toggleMember(f._id)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all border ${
                      selectedMembers.includes(f._id) 
                      ? "bg-primary/10 border-primary/30" 
                      : "bg-white/[0.02] border-transparent hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-secondary overflow-hidden shrink-0">
                        {f.avatar_url ? (
                          <img src={f.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary font-black text-xs">
                            {f.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold truncate">{f.username}</p>
                        <p className="text-[9px] text-muted-foreground uppercase font-medium tracking-tighter">{f.cv_id}</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                      selectedMembers.includes(f._id)
                      ? "bg-primary border-primary text-white"
                      : "border-white/10"
                    }`}>
                      {selectedMembers.includes(f._id) && <Plus className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 bg-black/40 border-t border-white/5 flex gap-4">
           <button
             onClick={onClose}
             className="flex-1 py-4 rounded-2xl bg-white/[0.03] border border-white/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-white/[0.08] transition-all"
           >
             Abort
           </button>
           <button
             onClick={handleSubmit}
             disabled={!groupName.trim() || selectedMembers.length === 0 || isCreating}
             className="flex-[2] py-4 rounded-2xl gradient-primary text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20 flex items-center justify-center gap-3"
           >
             {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
             {isCreating ? "ENCRYPTING GROUP..." : "COMMIT TRANSMISSION"}
           </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CreateGroupModal;
