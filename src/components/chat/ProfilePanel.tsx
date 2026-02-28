import { X, UserMinus, Image } from "lucide-react";
import type { Friend } from "@/pages/Dashboard";

interface ProfilePanelProps {
  friend: Friend;
  onClose: () => void;
}

const ProfilePanel = ({ friend, onClose }: ProfilePanelProps) => {
  return (
    <div className="w-80 h-full glass border-l border-border flex flex-col animate-slide-right shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Profile</h3>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Avatar & Info */}
      <div className="p-6 text-center border-b border-border">
        <div className="w-24 h-24 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center text-foreground text-3xl font-bold">
          {friend.username[0]}
        </div>
        <h2 className="text-lg font-semibold text-foreground">{friend.username}</h2>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className={`w-2 h-2 rounded-full ${friend.is_online ? "bg-online" : "bg-offline"}`} />
          <span className="text-sm text-muted-foreground">
            {friend.is_online ? "Online" : "Offline"}
          </span>
        </div>

        <button className="mt-4 px-4 py-2 rounded-xl bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors inline-flex items-center gap-2">
          <UserMinus className="w-4 h-4" />
          Unfriend
        </button>
      </div>

      {/* Shared Media */}
      <div className="p-4 flex-1">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-foreground">Shared Media</span>
          <span className="text-xs text-muted-foreground">0 items</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {/* Placeholder grid for shared media */}
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="aspect-square rounded-lg bg-secondary/30 flex items-center justify-center"
            >
              <Image className="w-4 h-4 text-muted-foreground/30" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfilePanel;
