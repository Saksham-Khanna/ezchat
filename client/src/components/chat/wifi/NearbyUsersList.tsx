import { UserPlus, Search, Loader2, Signal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SOCKET_URL } from "@/lib/config";

interface NearbyUsersListProps {
  nearbyUsers: any[];
  friends: any[];
  connectionStatus: Map<string, string>;
  onConnect: (userId: string) => void;
  onAddFriend: (identifier: string) => void;
  isScanning: boolean;
  outgoingP2PRequests: Set<string>;
}

const NearbyUsersList = ({
  nearbyUsers,
  friends,
  connectionStatus,
  onConnect,
  onAddFriend,
  isScanning,
  outgoingP2PRequests
}: NearbyUsersListProps) => {
  return (
    <div className="space-y-5 flex flex-col h-full bg-white/[0.02] border border-white/[0.04] p-5 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between border-b border-white/[0.05] pb-4">
        <h3 className="text-sm font-bold text-foreground/80 uppercase tracking-widest flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.2)]" />
          Nearby Users
        </h3>
        <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-black border border-primary/20 shadow-sm shadow-primary/5">
          {nearbyUsers.length} FOUND
        </span>
      </div>
      
      <div className="flex-1 space-y-3 overflow-y-auto scrollbar-thin px-0.5">
        <AnimatePresence mode="popLayout" initial={false}>
          {isScanning ? (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="flex flex-col items-center justify-center py-20 animate-pulse"
            >
              <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <p className="text-xs font-bold text-primary tracking-widest uppercase">Scanning network...</p>
            </motion.div>
          ) : nearbyUsers.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-white/[0.03] flex items-center justify-center mb-4 border border-white/[0.05]">
                <Search className="w-6 h-6 text-muted-foreground/30" />
              </div>
              <p className="text-xs text-muted-foreground/80 font-medium italic">No nearby users detected.</p>
              <p className="text-[10px] text-muted-foreground/50 mt-1 uppercase tracking-tight">Try scanning local network ID</p>
            </motion.div>
          ) : (
            nearbyUsers.map((u, idx) => {
              const status = connectionStatus.get(u.userId) || 'Available';
              const isConnected = status === 'connected';
              const isFriend = friends.some(f => f._id === u.userId);
              
              return (
                <motion.div
                  key={u.userId}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center justify-between p-4 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-primary/20 transition-all hover:shadow-[0_8px_32px_rgba(0,0,0,0.2)] group relative overflow-hidden active:scale-[0.99]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-2xl bg-[#0F111A] ring-1 ring-white/10 flex items-center justify-center overflow-hidden shadow-2xl group-hover:ring-primary/40 transition-all duration-500">
                        {u.avatarUrl ? (
                          <img 
                            src={u.avatarUrl.startsWith("http") ? u.avatarUrl : `${SOCKET_URL}${u.avatarUrl}`} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement?.insertAdjacentHTML('beforeend', `<span class="flex items-center justify-center w-full h-full bg-primary/20 text-primary font-bold text-lg">${u.username.charAt(0).toUpperCase()}</span>`);
                            }}
                          />
                        ) : (
                          <span className="text-primary font-black text-lg">{u.username.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-[3px] border-[#0F111A] shadow-xl ${isConnected ? 'bg-online animate-pulse' : 'bg-online'}`} />
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-white tracking-tight group-hover:text-primary transition-colors">{u.username}</p>
                        {isFriend && (
                          <span className="text-[8px] font-black bg-primary/20 text-primary px-1.5 py-0.5 rounded-md border border-primary/20 uppercase tracking-widest">
                            FAV
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="flex items-center gap-1.5 text-muted-foreground/40">
                            <Signal className="w-3 h-3 text-primary/60" />
                            <span className="text-[9px] font-black uppercase tracking-tighter">Signal: 98%</span>
                         </div>
                         <span className="text-[9px] opacity-20 text-white">|</span>
                         <p className={`text-[9px] font-black uppercase tracking-widest ${isConnected ? 'text-primary animate-pulse' : 'text-muted-foreground/60'}`}>
                           {isConnected ? 'NODE_ACTIVE' : 'READY_TO_MESH'}
                         </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 relative z-10">
                    {!isFriend && (
                      <button 
                        onClick={() => onAddFriend(u.cv_id || u.username)}
                        className="w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-primary/20 hover:border-primary/30 text-white/40 hover:text-primary flex items-center justify-center transition-all active:scale-90"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => onConnect(u.userId)}
                      disabled={outgoingP2PRequests.has(u.userId)}
                      className={`h-10 px-6 rounded-2xl text-[10px] font-black tracking-widest transition-all active:scale-95 shadow-xl ${
                        isConnected 
                        ? "bg-transparent text-primary border border-primary/30 backdrop-blur-md" 
                        : outgoingP2PRequests.has(u.userId)
                        ? "bg-white/[0.05] text-white/20 border border-white/5 cursor-not-allowed"
                        : "gradient-primary text-primary-foreground shadow-primary/20 hover:brightness-110 glow-button"
                      }`}
                    >
                      {isConnected ? "ACTIVE" : outgoingP2PRequests.has(u.userId) ? "SENT" : "JOIN"}
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default NearbyUsersList;
