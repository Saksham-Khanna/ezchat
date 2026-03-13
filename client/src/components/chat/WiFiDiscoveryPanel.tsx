import { useState, useEffect } from "react";
import { X, Wifi, Search, Loader2, Network, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NearbyUsersList from "./wifi/NearbyUsersList";
import NearbyRoomsList from "./wifi/NearbyRoomsList";

interface WiFiDiscoveryPanelProps {
  wifiName: string;
  onSetWifiName: (name: string) => void;
  onClose: () => void;
  nearbyUsers: any[];
  onConnectToUser: (userId: string) => void;
  isScanning?: boolean;
  onScan?: () => void;
  userId: string;
  username: string;
  avatarUrl?: string;
  outgoingP2PRequests: Set<string>;
  friends: any[];
   onAddFriend: (identifier: string) => void;
}

const WiFiDiscoveryPanel = ({
  wifiName,
  onSetWifiName,
  onClose,
  nearbyUsers,
  onConnectToUser,
  isScanning = false,
  onScan,
  userId,
  username,
  avatarUrl,
  outgoingP2PRequests,
  friends,
  onAddFriend
}: WiFiDiscoveryPanelProps) => {
  const handleScan = () => {
    onScan?.();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-background/60 backdrop-blur-xl transition-all"
      />
      
      {/* Main Panel */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 30 }}
        className="relative w-full max-w-2xl h-full max-h-[90vh] bg-secondary/30 border border-white/10 rounded-[3rem] shadow-[0_32px_128px_rgba(0,0,0,0.6)] overflow-hidden glass-strong flex flex-col"
      >
        {/* Header */}
        <div className="relative p-10 border-b border-white/[0.05] flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden">
          {/* Animated Background Glow */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 blur-[120px] rounded-full animate-pulse-slow -z-10" />
          
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-[1.75rem] gradient-primary flex items-center justify-center shadow-[0_12px_32px_rgba(var(--primary),0.3)] group-hover:scale-105 transition-transform duration-500">
                <Wifi className="w-8 h-8 text-primary-foreground stroke-[2.5]" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-online border-[3px] border-background animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-black text-foreground tracking-tight drop-shadow-sm">Direct Mesh Discovery</h2>
                <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black border border-primary/20 tracking-tighter uppercase mb-1">PRO</span>
              </div>
              <p className="text-sm font-medium text-muted-foreground/70 flex items-center gap-2 mt-1">
                <Network className="w-4 h-4 text-primary opacity-60" />
                Connect with users on the same network instantly
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
             <div className="relative flex-1 md:w-80 group">
                <Globe className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary transition-transform group-hover:scale-110" />
                <input
                  type="text"
                  value={wifiName}
                  onChange={(e) => onSetWifiName(e.target.value)}
                  placeholder="Mesh Gateway ID (Leave empty for auto-detect)"
                  className="w-full pl-12 pr-6 py-4 rounded-[1.5rem] bg-white/[0.03] border border-white/[0.06] text-foreground font-bold placeholder:text-muted-foreground/30 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-sm group-hover:bg-white/[0.05]"
                />
             </div>
             <button
                onClick={handleScan}
                disabled={isScanning}
                className="px-8 py-4 rounded-[1.5rem] gradient-primary text-primary-foreground font-black text-xs shadow-[0_8px_32px_rgba(var(--primary),0.3)] hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-3 min-w-[160px] justify-center glow-button"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin stroke-[3]" />
                    <span className="tracking-widest uppercase">SCANNING...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 stroke-[3]" />
                    <span className="tracking-widest uppercase">SCAN NEARBY</span>
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.05] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/[0.08] transition-all active:scale-90"
              >
                <X className="w-6 h-6" />
              </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-10 flex flex-col max-w-2xl mx-auto w-full overflow-y-auto scrollbar-thin">
           <NearbyUsersList 
             nearbyUsers={nearbyUsers.filter(u => u.userId !== userId)}
             friends={friends} 
             connectionStatus={new Map()} 
             onConnect={onConnectToUser}
             onAddFriend={onAddFriend}
             isScanning={isScanning}
             outgoingP2PRequests={outgoingP2PRequests}
           />
        </div>

        {/* Footer / Status Bar */}
        <div className="px-10 py-5 bg-white/[0.02] border-t border-white/[0.05] flex items-center justify-between text-[10px] font-black tracking-[0.2em] text-muted-foreground/40 uppercase">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              SYSTEM ACTIVE
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
              PROTOCOL: WEBRTC MESH
            </div>
          </div>
          <div>QUICKCHAT MESH NODE v2.1.0</div>
        </div>
      </motion.div>
    </div>
  );
};

export default WiFiDiscoveryPanel;
