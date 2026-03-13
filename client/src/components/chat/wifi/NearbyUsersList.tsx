import { UserPlus, Search, Loader2 } from "lucide-react";
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
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] group"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative group-hover:scale-110 transition-transform duration-300">
                      <div className="w-12 h-12 rounded-2xl bg-secondary ring-2 ring-white/[0.05] flex items-center justify-center text-white font-black text-sm overflow-hidden shadow-inner group-hover:ring-primary/40 transition-all duration-300">
                        {u.avatarUrl ? (
                          <img 
                            src={u.avatarUrl.startsWith("http") ? u.avatarUrl : `${SOCKET_URL}${u.avatarUrl}`} 
                            className="w-full h-full object-cover group-hover:opacity-90 transition-opacity" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement?.insertAdjacentHTML('beforeend', `<span class="flex items-center justify-center w-full h-full bg-primary/20 text-primary font-bold text-sm">${u.username.charAt(0).toUpperCase()}</span>`);
                            }}
                          />
                        ) : (
                          <span className="text-primary font-bold text-sm">{u.username.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      {/* Show online dot for all nearby users as they are online on the server */}
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background shadow-lg transition-colors duration-300 bg-online ${isConnected ? 'animate-pulse' : ''}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-foreground leading-tight group-hover:text-primary transition-colors">{u.username}</p>
                        {isFriend && <span className="text-[9px] font-black bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 text-primary uppercase tracking-tighter">Friend</span>}
                        {u.cv_id && <span className="text-[9px] font-black bg-white/5 px-1.5 py-0.5 rounded border border-white/10 text-muted-foreground/40">{u.cv_id}</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <p className={`text-[10px] font-black uppercase tracking-wider ${isConnected ? 'text-online animate-pulse' : 'text-muted-foreground/60'}`}>
                          {isConnected ? 'P2P Active' : status}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isFriend && (
                      <button 
                        onClick={() => onAddFriend(u.cv_id || u.username)}
                        title="Send Friend Request"
                        className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.05] hover:bg-primary/20 text-muted-foreground hover:text-primary flex items-center justify-center transition-all active:scale-90 hover:shadow-lg shadow-primary/10"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => onConnect(u.userId)}
                      disabled={outgoingP2PRequests.has(u.userId)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all active:scale-95 shadow-lg ${
                        isConnected 
                        ? "bg-online/10 text-online border border-online/20" 
                        : outgoingP2PRequests.has(u.userId)
                        ? "bg-white/[0.1] text-muted-foreground border border-white/[0.05] opacity-50 cursor-not-allowed"
                        : "gradient-primary text-primary-foreground shadow-primary/20 hover:opacity-90 active:scale-95 glow-button"
                      }`}
                    >
                      {isConnected ? "CONNECTED" : outgoingP2PRequests.has(u.userId) ? "REQUEST SENT" : "CONNECT"}
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
