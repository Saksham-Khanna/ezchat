import { useState } from "react";
import { motion } from "framer-motion";
import { LogOut } from "lucide-react";

interface LogoutButtonProps {
  onLogout: () => void;
  className?: string;
}

const LogoutButton = ({ onLogout, className }: LogoutButtonProps) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleClick = () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      onLogout();
    }, 500);
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={isLoggingOut}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all text-muted-foreground overflow-hidden ${className}`}
    >
      <LogOut className={`w-4 h-4 ${isLoggingOut ? "animate-pulse mt-[-4px]" : ""}`} />
      <span className="text-xs font-bold uppercase tracking-wider">
        {isLoggingOut ? "LOGGING OUT..." : "Logout"}
      </span>

      {/* Progress Bar Animation */}
      {isLoggingOut && (
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          className="absolute bottom-0 left-0 h-[2px] bg-destructive shadow-[0_0_10px_rgba(239,68,68,0.8)]"
          transition={{ duration: 0.5, ease: "linear" }}
        />
      )}
    </motion.button>
  );
};

export default LogoutButton;
