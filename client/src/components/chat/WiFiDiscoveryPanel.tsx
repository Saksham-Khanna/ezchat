import { useState, useEffect } from "react";
import { X, Wifi, Search, Loader2, Network } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NearbyUsersList from "./wifi/NearbyUsersList";

interface WiFiDiscoveryPanelProps {
  wifiName: string;
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
        className="relative w-full max-w-3xl h-full max-h-[85vh] bg-secondary/20 border border-white/10 rounded-[2.5rem] shadow-[0_32px_128px_rgba(0,0,0,0.6)] overflow-hidden glass-strong flex flex-col"
      >
        {/* Header Section */}
        <div className="relative p-6 md:p-8 border-b border-white/5 flex flex-col gap-6 overflow-hidden bg-white/[0.02]">
          {/* Animated Background Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 blur-[120px] rounded-full animate-pulse-slow -z-10" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                {/* Radar Pulse Rings */}
                {isScanning && (
                  <div className="absolute inset-0">
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0.5 }}
                      animate={{ scale: 2.2, opacity: 0 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                      className="absolute inset-0 rounded-2xl border-2 border-primary/30"
                    />
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0.3 }}
                      animate={{ scale: 1.8, opacity: 0 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                      className="absolute inset-0 rounded-2xl border-2 border-primary/20"
                    />
                  </div>
                )}
                <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20 relative z-10 transition-transform hover:scale-105">
                  <Wifi className={`w-7 h-7 text-primary-foreground stroke-[2.5] ${isScanning ? "animate-pulse" : ""}`} />
                </div>
              </div>
              
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-2xl font-black text-white tracking-tight uppercase">Direct Mesh</h2>
                  <span className="px-2 py-0.5 rounded-lg bg-primary/15 text-primary text-[9px] font-black border border-primary/20 tracking-widest uppercase">Node_Actv</span>
                </div>
                <div className="flex items-center gap-2 mt-1 opacity-60">
                   <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                   <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                     Gateway: <span className="text-primary">{wifiName || "LOCAL_MESH"}</span>
                   </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
               <button
                  onClick={handleScan}
                  disabled={isScanning}
                  className="px-6 py-3 rounded-2xl gradient-primary text-primary-foreground font-black text-[10px] tracking-[0.2em] uppercase shadow-lg shadow-primary/20 hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-2.5 border border-primary/20"
                >
                  {isScanning ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  {isScanning ? "SCANNING..." : "Discover Nearby"}
                </button>

                <button 
                  onClick={onClose} 
                  className="w-10 h-10 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] hover:text-foreground border border-white/5 transition-all flex items-center justify-center group"
                >
                  <X className="w-4 h-4 text-muted-foreground group-hover:rotate-90 transition-all duration-300" />
                </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 md:p-10 flex flex-col max-w-2xl mx-auto w-full overflow-y-auto scrollbar-thin">
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
        <div className="px-10 py-5 bg-[#030712]/40 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-4 text-[9px] font-bold font-mono tracking-widest text-muted-foreground/40 uppercase">
          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              <span>CORE_MESH: ACTIVE</span>
            </div>
            <div className="flex items-center gap-2 opacity-60">
              <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
              <span>MODE: P2P_WEBRTC</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <span className="opacity-40 select-none">|</span>
             <span className="text-primary/40">NODE_VER: 2.1.0_STABLE</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default WiFiDiscoveryPanel;
