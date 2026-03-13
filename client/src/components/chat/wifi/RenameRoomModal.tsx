import { useState } from "react";
import { X, Edit2, Hash } from "lucide-react";
import { motion } from "framer-motion";

interface RenameRoomModalProps {
  currentName: string;
  onClose: () => void;
  onRename: (newName: string) => void;
}

const RenameRoomModal = ({ currentName, onClose, onRename }: RenameRoomModalProps) => {
  const [newName, setNewName] = useState(currentName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim() && newName.trim() !== currentName) {
      onRename(newName.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-sm glass bg-secondary/70 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
              <Edit2 className="w-6 h-6 text-primary stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground drop-shadow-sm">Rename Group</h2>
              <p className="text-[11px] text-muted-foreground font-bold tracking-widest uppercase opacity-70">Update group identity</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.05] flex items-center justify-center text-muted-foreground hover:text-foreground transition-all active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">New Room Name</label>
            <div className="relative group">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
              <input
                type="text"
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. New Group Name"
                className="w-full pl-11 pr-4 py-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] text-foreground font-bold placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] text-xs font-black text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all active:scale-95"
            >
              CANCEL
            </button>
            <button 
              type="submit"
              disabled={!newName.trim() || newName.trim() === currentName}
              className="flex-1 py-4 rounded-2xl gradient-primary text-xs font-black text-primary-foreground hover:opacity-90 transition-all disabled:opacity-30 active:scale-95 shadow-xl shadow-primary/20 glow-button"
            >
              UPDATE
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default RenameRoomModal;
