import { useState } from "react";
import { X, UserMinus, ShieldAlert, Image } from "lucide-react";
import type { Friend, Message } from "@/pages/Dashboard";
import ConfirmDialog from "./ConfirmDialog";

import { SOCKET_URL } from "@/lib/config";

interface ProfilePanelProps {
  friend: Friend;
  messages: Message[];
  onClose: () => void;
  onUnfriend: (friendId: string) => void;
  onBlock: (friendId: string) => void;
  onViewAllMedia: () => void;
}

const ProfilePanel = ({ friend, messages, onClose, onUnfriend, onBlock, onViewAllMedia }: ProfilePanelProps) => {
  const [confirmAction, setConfirmAction] = useState<'unfriend' | 'block' | null>(null);

  const sharedMedia = messages.filter(m => m.media_url && m.media_url.length > 0 && m.media_type !== 'audio' && !m.media_url.includes('audio_'));

  const getMediaSrc = (url: string) => {
    if (url.startsWith("http")) return url;
    return `${SOCKET_URL}${url}`;
  };

  return (
    <div className="w-80 h-full glass border-l border-white/[0.05] flex flex-col animate-slide-right shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.05] flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Profile</h3>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/[0.08] transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Avatar & Info */}
      <div className="p-6 text-center border-b border-white/[0.05]">
        <div className="relative inline-block mb-4">
          {/* Animated ring */}
          <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary/40 to-accent/30 blur-sm opacity-60 animate-pulse" />
          <div className="relative w-24 h-24 rounded-full bg-secondary flex items-center justify-center text-foreground text-3xl font-bold overflow-hidden ring-2 ring-white/[0.08]">
            {friend.avatar_url ? (
              <img 
                src={friend.avatar_url.startsWith("http") ? friend.avatar_url : `${SOCKET_URL}${friend.avatar_url}`} 
                alt="" 
                className="w-full h-full object-cover" 
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement?.insertAdjacentHTML('beforeend', `<span class="flex items-center justify-center w-full h-full bg-primary/10 text-primary font-bold text-2xl">${friend.username.charAt(0).toUpperCase()}</span>`);
                }}
              />
            ) : (
              <span className="text-primary font-bold text-2xl">{friend.username.charAt(0).toUpperCase()}</span>
            )}
          </div>
        </div>
        
        <h2 className="text-lg font-bold text-foreground">{friend.username}</h2>
        {friend.cv_id && (
          <p className="text-[10px] text-muted-foreground/60 font-mono bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.05] inline-block mt-1.5">
            {friend.cv_id}
          </p>
        )}
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className={`w-2 h-2 rounded-full transition-colors ${friend.is_online ? "bg-online" : "bg-offline"}`} />
          <span className={`text-sm transition-colors ${friend.is_online ? 'text-green-400/80' : 'text-muted-foreground/60'}`}>
            {friend.is_online ? "Online" : "Offline"}
          </span>
        </div>
        {friend.bio && (
          <p className="text-xs text-muted-foreground/60 mt-3 px-3 italic leading-relaxed">
            "{friend.bio}"
          </p>
        )}

        <div className="flex items-center justify-center gap-2 mt-5">
          <button
            onClick={() => setConfirmAction('unfriend')}
            className="px-4 py-2 rounded-xl bg-red-500/[0.06] border border-red-500/10 text-red-400/80 text-xs font-medium hover:bg-red-500/15 hover:text-red-400 transition-all duration-300 inline-flex items-center gap-1.5 active:scale-95"
          >
            <UserMinus className="w-3.5 h-3.5" />
            Unfriend
          </button>
          <button
            onClick={() => setConfirmAction('block')}
            className="px-4 py-2 rounded-xl bg-red-500/[0.06] border border-red-500/10 text-red-400/80 text-xs font-medium hover:bg-red-500/15 hover:text-red-400 transition-all duration-300 inline-flex items-center gap-1.5 active:scale-95"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Block
          </button>
        </div>
      </div>

      {/* Shared Media */}
      <div className="p-4 flex-1 overflow-y-auto scrollbar-thin">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-foreground">Shared Media</span>
          {sharedMedia.length > 0 && (
            <span className="text-[10px] text-muted-foreground/50">{sharedMedia.length} items</span>
          )}
        </div>
        {sharedMedia.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mb-3">
              <Image className="w-6 h-6 text-muted-foreground/20" />
            </div>
            <p className="text-xs text-muted-foreground/50 font-medium">No shared media yet</p>
            <p className="text-[10px] text-muted-foreground/30 mt-0.5">Photos shared in this chat will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {sharedMedia.slice(0, 6).map((msg) => (
              <a
                key={msg._id}
                href={getMediaSrc(msg.media_url!)}
                target="_blank"
                rel="noopener noreferrer"
                className="aspect-square rounded-lg overflow-hidden bg-secondary/20 hover:opacity-80 transition-all duration-300 group"
              >
                <img
                  src={getMediaSrc(msg.media_url!)}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </a>
            ))}
          </div>
        )}
        <button
          onClick={onViewAllMedia}
          className="w-full py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-xs font-medium text-muted-foreground/60 hover:text-foreground hover:bg-white/[0.06] transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
        >
          View All Media, Links & Docs
          <span className="text-[10px]">→</span>
        </button>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
        title={confirmAction === 'unfriend' ? 'Unfriend' : 'Block User'}
        description={
          confirmAction === 'unfriend'
            ? `Are you sure you want to unfriend ${friend.username}?`
            : `Are you sure you want to block ${friend.username}? They won't be able to message you.`
        }
        confirmLabel="Yes"
        cancelLabel="No"
        variant="danger"
        onConfirm={() => {
          if (confirmAction === 'unfriend') {
            onUnfriend(friend._id);
          } else {
            onBlock(friend._id);
          }
        }}
      />
    </div>
  );
};

export default ProfilePanel;
