import { Shield, User, UserX, Crown, X, UserPlus, Trash2, Edit2, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SOCKET_URL } from "@/lib/config";

interface Member {
  userId: any; // Populated object from DB or string
  username?: string;
  avatar_url?: string;
  role: 'admin' | 'manager' | 'member';
}

interface RoomMembersPanelProps {
  room: any;
  currentUserId: string;
  members: any[];
  onRemoveMember: (userId: string) => void;
  onPromoteMember: (userId: string, role: 'manager' | 'member') => void;
  onRenameRoom: () => void;
  onDeleteRoom: () => void;
  onLeaveRoom: () => void;
  onClose: () => void;
  onInviteClick?: () => void;
}

const RoomMembersPanel = ({
  room,
  currentUserId,
  members,
  onRemoveMember,
  onPromoteMember,
  onRenameRoom,
  onDeleteRoom,
  onLeaveRoom,
  onClose,
  onInviteClick
}: RoomMembersPanelProps) => {
  const currentUserMember = members.find(m => (m.userId?._id || m.userId) === currentUserId);
  const isAdmin = currentUserMember?.role === 'admin';
  const isManager = currentUserMember?.role === 'manager';

  const sortedMembers = [...members].sort((a, b) => {
    const roles = { admin: 0, manager: 1, member: 2 };
    return roles[a.role] - roles[b.role];
  });

  return (
    <div className="flex flex-col h-full bg-secondary/30 border-l border-white/5 backdrop-blur-xl">
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-foreground/80 uppercase tracking-widest flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Room Members
          </h3>
          <p className="text-[10px] text-muted-foreground mt-1 font-bold">{members.length} / 10 USERS</p>
        </div>
        <button 
          onClick={onClose}
          className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/[0.08] transition-all active:scale-90"
          title="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scroll-smooth p-4 space-y-6">
        {isAdmin && (
           <div className="space-y-2">
             <label className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-2">Admin Actions</label>
             <div className="grid grid-cols-2 gap-2">
               <button 
                 onClick={onRenameRoom}
                 className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all flex flex-col items-center gap-2 text-center"
               >
                 <Edit2 className="w-4 h-4 text-primary" />
                 <span className="text-[9px] font-black">RENAME</span>
               </button>
               <button 
                 onClick={onDeleteRoom}
                 className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all flex flex-col items-center gap-2 text-center group"
               >
                 <Trash2 className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
                 <span className="text-[9px] font-black text-red-400">DELETE</span>
               </button>
             </div>
           </div>
        )}

        <div className="space-y-2">
           <label className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-2">Personal Actions</label>
           <button 
             onClick={onLeaveRoom}
             className="w-full p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 transition-all flex items-center justify-center gap-3 group"
           >
             <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
             <span className="text-[10px] font-black uppercase tracking-widest">Leave Group</span>
           </button>
        </div>

        <div className="space-y-3">
          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-2">Participating</label>
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {sortedMembers.map((member) => (
                <motion.div
                  key={member.userId?._id || member.userId}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.02] border border-transparent hover:border-white/5 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-secondary ring-2 ring-white/[0.05] overflow-hidden">
                        {(member.userId?.avatar_url || member.avatar_url) ? (
                          <img 
                            src={(member.userId?.avatar_url || member.avatar_url).startsWith('http') ? (member.userId?.avatar_url || member.avatar_url) : `${SOCKET_URL}${member.userId?.avatar_url || member.avatar_url}`} 
                            alt={member.userId?.username || member.username} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-primary font-black text-xs">
                            {(member.userId?.username || member.username || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      {member.role === 'admin' && (
                        <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground p-0.5 rounded-md shadow-lg">
                          <Crown className="w-2.5 h-2.5" />
                        </div>
                      )}
                      {member.role === 'manager' && (
                        <div className="absolute -top-1 -right-1 bg-blue-500 text-white p-0.5 rounded-md shadow-lg">
                          <Shield className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{member.userId?.username || member.username || 'Unknown'}</span>
                        {(member.userId?._id || member.userId) === currentUserId && (
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">YOU</span>
                        )}
                      </div>
                      <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">{member.role}</span>
                    </div>
                  </div>

                  {/* Actions (visible if admin or manager) */}
                  {(isAdmin || isManager) && (member.userId?._id || member.userId) !== currentUserId && member.role !== 'admin' && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isAdmin && (
                        <button 
                          onClick={() => onPromoteMember(member.userId?._id || member.userId, member.role === 'manager' ? 'member' : 'manager')}
                          className="p-2 rounded-lg hover:bg-white/10 text-primary transition-all active:scale-90"
                          title={member.role === 'manager' ? "Remove Manager" : "Promote to Manager"}
                        >
                          <Crown className={`w-3.5 h-3.5 ${member.role === 'manager' ? 'fill-primary' : ''}`} />
                        </button>
                      )}
                      <button 
                         onClick={() => onRemoveMember(member.userId?._id || member.userId)}
                         className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-all active:scale-90"
                         title="Remove User"
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-white/5">
        <button 
          className="w-full py-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] text-[10px] font-black text-muted-foreground hover:text-foreground transition-all flex items-center justify-center gap-2"
          onClick={() => {
            if (onInviteClick) {
              onInviteClick();
            } else if (room.inviteCode) {
              navigator.clipboard.writeText(room.inviteCode);
            }
          }}
        >
          <UserPlus className="w-4 h-4" />
          ADD MEMBERS
        </button>
      </div>
    </div>
  );
};

export default RoomMembersPanel;
