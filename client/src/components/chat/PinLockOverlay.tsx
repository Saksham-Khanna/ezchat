import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Delete, ShieldCheck, ShieldAlert, Fingerprint } from "lucide-react";

interface PinLockOverlayProps {
  onVerify: (pin: string) => Promise<boolean>;
  title?: string;
  onLogout?: () => void;
}

export const PinLockOverlay = ({ onVerify, title = "Security Lock", onLogout }: PinLockOverlayProps) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleKeyPress = (num: string) => {
    if (pin.length < 4 && !loading) {
      setPin(prev => prev + num);
      setError(false);
      // Small vibration effect trigger would go here
    }
  };

  const handleDelete = () => {
    if (!loading) {
      setPin(prev => prev.slice(0, -1));
      setError(false);
    }
  };

  const handleVerify = async () => {
    if (pin.length !== 4) return;
    setLoading(true);
    const isValid = await onVerify(pin);
    if (!isValid) {
      setError(true);
      setPin("");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (pin.length === 4) {
      handleVerify();
    }
  }, [pin]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[2000] bg-[#030712]/80 backdrop-blur-3xl flex flex-col items-center justify-center p-6 overflow-hidden"
    >
      {/* Background Decorative Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        layout
        className="w-full max-w-sm flex flex-col items-center relative z-10"
      >
        {/* Animated Icon Header */}
        <div className="relative mb-8 pt-8">
          <motion.div
            animate={error ? { 
              x: [-6, 6, -6, 6, 0],
              rotate: [-2, 2, -2, 2, 0]
            } : {}}
            transition={{ duration: 0.4 }}
            className={`w-24 h-24 rounded-[32px] flex items-center justify-center shadow-2xl transition-all duration-500 relative border border-white/10 ${
              error ? "bg-red-500/20 text-red-500 scale-95" : "bg-primary/10 text-primary"
            }`}
          >
            {error ? <ShieldAlert className="w-10 h-10" /> : <Lock className="w-10 h-10" />}
            
            {/* Pulsing ring */}
            {!error && !loading && (
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute inset-0 rounded-[32px] border-2 border-primary/30"
              />
            )}
          </motion.div>
          
          {loading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg"
            >
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              />
            </motion.div>
          )}
        </div>

        <motion.h2 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-3xl font-black mb-2 tracking-tight text-white drop-shadow-md"
        >
          {title}
        </motion.h2>
        
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className={`text-sm mb-10 transition-colors duration-300 font-medium ${
            error ? "text-red-400" : "text-muted-foreground"
          }`}
        >
          {error ? "Incorrect PIN, try again" : "Secure access required"}
        </motion.p>

        {/* PIN Dots Display */}
        <div className="flex gap-6 mb-12">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="relative">
              <motion.div
                animate={{ 
                  scale: pin.length > i ? 1.2 : 1,
                  backgroundColor: pin.length > i ? (error ? "#ef4444" : "var(--primary-color, #3b82f6)") : "rgba(255,255,255,0.05)"
                }}
                className={`w-4 h-4 rounded-full border border-white/10 transition-all duration-300 shadow-sm ${
                  pin.length > i ? "shadow-[0_0_20px_rgba(59,130,246,0.3)]" : ""
                }`}
              />
              {pin.length > i && !error && (
                <motion.div 
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 2, opacity: 0 }}
                  className="absolute inset-0 rounded-full bg-primary/20"
                />
              )}
            </div>
          ))}
        </div>

        {/* Numpad Grid */}
        <div className="grid grid-cols-3 gap-x-8 gap-y-6 w-full max-w-[280px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <motion.button
              key={num}
              whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.08)" }}
              whileTap={{ scale: 0.9, backgroundColor: "rgba(255,255,255,0.12)" }}
              onClick={() => handleKeyPress(num.toString())}
              className="w-16 h-16 rounded-full flex flex-col items-center justify-center transition-all duration-200 text-white relative group"
            >
              <span className="text-2xl font-bold leading-none">{num}</span>
              <span className="text-[9px] font-bold opacity-30 tracking-tight group-hover:opacity-50">
                {num === 2 ? 'ABC' : num === 3 ? 'DEF' : num === 4 ? 'GHI' : num === 5 ? 'JKL' : num === 6 ? 'MNO' : num === 7 ? 'PQRS' : num === 8 ? 'TUV' : num === 9 ? 'WXYZ' : ''}
              </span>
            </motion.button>
          ))}
          
          <div className="flex items-center justify-center">
            <Fingerprint className="w-6 h-6 text-muted-foreground/20" />
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.08)" }}
            whileTap={{ scale: 0.9, backgroundColor: "rgba(255,255,255,0.12)" }}
            onClick={() => handleKeyPress("0")}
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold transition-all duration-200 text-white"
          >
            0
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05, color: "#f87171" }}
            whileTap={{ scale: 0.9 }}
            onClick={handleDelete}
            className="w-16 h-16 rounded-full flex items-center justify-center text-muted-foreground/60 hover:text-red-400 transition-all duration-200"
          >
            <Delete className="w-6 h-6" />
          </motion.button>
        </div>

        {onLogout && (
          <motion.button 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={onLogout}
            className="mt-14 px-6 py-2 rounded-full text-xs font-black text-muted-foreground/40 hover:text-primary hover:bg-primary/5 transition-all uppercase tracking-widest border border-transparent hover:border-primary/20"
          >
            Switch Account
          </motion.button>
        )}
      </motion.div>
      
      {/* Visual Shield for extra "Security" feel */}
      <div className="absolute bottom-10 opacity-5 select-none pointer-events-none">
        <ShieldCheck className="w-64 h-64 text-white" strokeWidth={0.5} />
      </div>
    </motion.div>
  );
};
