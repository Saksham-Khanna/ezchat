import { useState } from "react";
import { motion } from "framer-motion";

interface LogoutButtonProps {
  onLogout: () => void;
  className?: string;
}

const LogoutButton = ({ onLogout, className }: LogoutButtonProps) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = async () => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    // Animation sequence takes ~1.2s to be safe with the falling effect
    setTimeout(() => {
      onLogout();
    }, 1200);
  };

  return (
    <motion.button
      onClick={handleClick}
      whileTap={{ scale: 0.98 }}
      whileHover={{ y: -2, scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.08)" }}
      className={`relative px-5 py-3 rounded-xl bg-[#1a1d2d] border border-white/10 flex items-center gap-3 transition-all duration-300 overflow-hidden group shadow-xl hover:shadow-primary/20 hover:border-primary/40 ${className}`}
      title="Sign out"
    >
      {/* Button Text */}
      <span className="text-[12px] font-black uppercase tracking-[0.15em] text-white transition-all duration-300 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] group-hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
        Log Out
      </span>

      <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
        {/* Doorway (The background part) */}
        <div className="absolute inset-0 flex items-center justify-center translate-x-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="3" width="14" height="18" rx="2" fill="#4f77ff" fillOpacity="0.15" />
                <rect x="2" y="3" width="14" height="18" rx="2" stroke="#4f77ff" strokeWidth="1.5" />
            </svg>
        </div>

        {/* Running and Falling Figure */}
        <motion.div
           className="absolute z-10"
           initial={{ x: -20, opacity: 0, rotate: 0, y: 0 }}
           animate={isAnimating ? {
             x: [ -20, 0, 12, 18, 22 ],
             opacity: [ 0, 1, 1, 0.8, 0 ],
             rotate: [ 0, 0, 0, 180, 720 ],
             y: [ 0, 0, 0, 20, 80 ],
             scale: [ 1, 1, 1, 0.8, 0.4 ]
           } : { opacity: 1, x: -17 }}
           transition={{
             duration: 1.2,
             times: [0, 0.15, 0.4, 0.7, 1],
             ease: "easeOut"
           }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f77ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_8px_rgba(79,119,255,0.4)]">
            <circle cx="12" cy="5" r="3" fill="#4f77ff" />
            <path d="M7 21 L11 15 L11 10 L15 10 L18 15" />
            <path d="M11 15 L8 19" />
            <path d="M11 10 L9 7" />
          </svg>
        </motion.div>

        {/* Animated Door Slab */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center origin-left"
          style={{ perspective: "1000px", zIndex: 20 }}
          initial={{ rotateY: 0 }}
          animate={isAnimating ? {
            rotateY: [0, -110, -110, 0]
          } : { rotateY: 0 }}
          transition={{
            duration: 1.2,
            times: [0, 0.25, 0.75, 1],
            ease: "easeInOut"
          }}
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="translate-x-[6px] drop-shadow-md">
                <rect x="0" y="3" width="12" height="18" rx="1.5" fill="#4f77ff" />
                <circle cx="9" cy="12" r="1" fill="white" />
            </svg>
        </motion.div>
      </div>

      {/* Shine effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    </motion.button>
  );
};

export default LogoutButton;
