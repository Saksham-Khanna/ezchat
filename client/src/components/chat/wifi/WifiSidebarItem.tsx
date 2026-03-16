import { Wifi, Radio, Zap } from "lucide-react";
import { motion } from "framer-motion";

interface WifiSidebarItemProps {
  isActive: boolean;
  onToggle: (val: boolean) => void;
  onOpenPanel: () => void;
}

const WifiSidebarItem = ({
  isActive,
  onToggle,
  onOpenPanel
}: WifiSidebarItemProps) => {
  return (
    <div className={`w-full p-4 rounded-3xl transition-all duration-500 relative overflow-hidden flex flex-col gap-4 ${
      isActive 
        ? "bg-primary/[0.08] border border-primary/20 shadow-[0_12px_40px_rgba(var(--primary),0.15)]" 
        : "bg-white/[0.03] border border-white/[0.05] hover:border-white/[0.1] shadow-xl"
    }`}>
      {/* Background Decorative Element */}
      <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[60px] transition-colors duration-700 ${
        isActive ? "bg-primary/20" : "bg-white/[0.02]"
      }`} />

      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${
            isActive 
              ? "gradient-primary text-primary-foreground shadow-lg shadow-primary/20" 
              : "bg-white/[0.05] text-muted-foreground"
          }`}>
            <Wifi className={`w-5 h-5 ${isActive ? "animate-pulse" : ""}`} />
          </div>
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.12em] text-white/95 flex items-center gap-2 drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]">
              P2P Protocol
              {isActive && (
                <span className="flex h-1.5 w-1.5 rounded-full bg-[#22c55e] animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
              )}
            </h3>
            <p className="text-[9px] text-[#94a3b8]/60 font-black uppercase tracking-[0.05em] mt-0.5">
              Secure Mesh Networking
            </p>
          </div>
        </div>

        {/* Improved Toggle Switch */}
        <button 
          onClick={() => onToggle(!isActive)}
          className={`relative w-11 h-6 rounded-full transition-all duration-300 focus:outline-none ${
            isActive ? "bg-primary" : "bg-white/[0.1] border border-white/[0.05]"
          }`}
        >
          <motion.div 
            animate={{ x: isActive ? 22 : 4 }}
            className={`absolute top-1 w-4 h-4 rounded-full shadow-sm transition-colors ${
              isActive ? "bg-white" : "bg-muted-foreground/40"
            }`}
          />
        </button>
      </div>

      <div className="h-px bg-white/[0.04] w-full" />

      <button
        onClick={onOpenPanel}
        className={`w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 border relative overflow-hidden group/portal ${
          isActive 
            ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary/50 hover:shadow-[0_0_20px_rgba(var(--primary),0.2)]" 
            : "border-white/10 bg-white/[0.02] text-white/60 hover:text-white hover:bg-white/[0.05] hover:border-white/20"
        }`}
      >
        <Radio className={`w-3.5 h-3.5 transition-colors duration-300 ${isActive ? "text-primary" : "text-white/40 group-hover/portal:text-white"}`} />
        <span className="relative z-10">{isActive ? "Scan for Mesh Peers" : "Discovery Portal"}</span>
      </button>

      {/* Mode Indicators */}
      <div className="flex items-center justify-evenly w-full px-2">
        <div className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.1em] transition-all duration-500 ${!isActive ? "text-[#f59e0b] drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]" : "text-white/20"}`}>
          <Zap className={`w-3.5 h-3.5 ${!isActive ? "animate-pulse" : ""}`} />
          Global Mode
        </div>
        <div className="w-1 h-1 rounded-full bg-white/10" />
        <div className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.1em] transition-all duration-500 ${isActive ? "text-[#0ea5e9] drop-shadow-[0_0_10px_rgba(14,165,233,0.4)]" : "text-white/20"}`}>
          <Wifi className={`w-3.5 h-3.5 ${isActive ? "animate-pulse" : ""}`} />
          Mesh Mode
        </div>
      </div>
    </div>
  );
};

export default WifiSidebarItem;
