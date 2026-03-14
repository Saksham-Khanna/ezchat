import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { Message } from "@/pages/Dashboard";
import { Clock, Check, Download, Trash2, Reply, Pencil, Smile, Share2, Phone, Video, Lock as LockIcon, Image as ImageIcon, FileText } from "lucide-react";
import VoicePlayer from "./VoicePlayer";
import { SOCKET_URL } from "@/lib/config";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  onDelete: (messageId: string) => void;
  onDeleteForMe: (messageId: string) => void;
  onReply: () => void;
  onEdit: () => void;
  onReact: (emoji: string) => void;
  onForward: () => void;
  onStartCall?: (type: "audio" | "video") => void;
  currentUserId: string;
}

const StatusIcon = ({ status }: { status?: string }) => {
  if (status === 'pending') {
    return <Clock className="w-3 h-3 text-primary-foreground/40" />;
  }
  if (status === 'read') {
    return (
      <div className="flex -space-x-1.5">
        <Check className="w-3 h-3 text-green-400" />
        <Check className="w-3 h-3 text-green-400" />
      </div>
    );
  }
  return <Check className="w-3 h-3 text-primary-foreground/40" />;
};


const getDocIcon = (url: string) => {
  const ext = url.split('.').pop()?.split('?')[0].toLowerCase();
  return ext || 'file';
};

const getDocName = (message: Message) => {
  if (message.content && message.content.startsWith('📄 ')) {
    return message.content.substring(2);
  }
  const url = message.media_url || "";
  const parts = url.split('/');
  const filename = parts[parts.length - 1];
  const match = filename.match(/^doc_\d+_(.+)$/);
  return match ? match[1] : filename;
};

const MessageBubble = ({ message, isOwn, onDelete, onDeleteForMe, onReply, onEdit, onReact, onForward, onStartCall, currentUserId }: MessageBubbleProps) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (message.is_disappearing && message.expires_at) {
      const expiry = new Date(message.expires_at).getTime();
      const updateTimer = () => {
        const now = Date.now();
        const diff = Math.max(0, Math.floor((expiry - now) / 1000));
        setTimeLeft(diff);
        if (diff <= 0) {
          onDeleteForMe(message._id);
        }
      };
      
      updateTimer();
      const timer = setInterval(updateTimer, 1000);
      return () => clearInterval(timer);
    }
  }, [message.is_disappearing, message.expires_at, message._id, onDeleteForMe]);

  if (message.is_deleted) return null;

  if (message.type === 'system') {
    return (
      <div className="w-full flex justify-center py-2 animate-fade-in">
        <div className="px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.05] text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 select-none">
          {message.content}
        </div>
      </div>
    );
  }

  const hasImage = message.media_url && message.media_url.length > 0 && message.media_type !== 'audio' && message.media_type !== 'document' && !message.media_url.includes('doc_');
  const hasAudio = message.media_url && message.media_url.length > 0 &&
    (message.media_type === 'audio' || message.media_url.includes('audio_'));
  const hasDoc = message.media_url && message.media_url.length > 0 &&
    (message.media_type === 'document' || message.media_url.includes('doc_'));
  const hasCall = message.media_type === 'call' || message.media_type === 'call_video';
  
  const isImageOnly = hasImage && (message.content === "📷 Image" || !message.content);
  const isAudioOnly = hasAudio && (message.content === "🎤 Voice Note" || !message.content);
  const isDocOnly = hasDoc && (message.content.startsWith("📄") || !message.content);
  const isCallOnly = hasCall;

  const formatDuration = (seconds: number) => {
    if (!seconds) return "Missed call";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getMediaSrc = () => {
    if (!message.media_url) return "";
    if (message.media_url.startsWith("http")) return message.media_url;
    return `${SOCKET_URL}${message.media_url}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex ${isOwn ? "justify-end" : "justify-start"} group w-full relative`}
    >
      <div className={`relative flex items-end gap-2 max-w-[75%] flex-row`}>
        {/* Interaction buttons — appear on hover */}
        <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0 pb-1 ${isOwn ? "order-1" : "order-2"}`}>
          <div className="flex items-center gap-0.5 px-1 py-0.5 rounded-full bg-secondary/80 backdrop-blur-sm border border-white/[0.05] shadow-lg">
            <button onClick={onReply} className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-all" title="Reply">
              <Reply className="w-3.5 h-3.5" />
            </button>
            {isOwn && (
              <button onClick={onEdit} className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-all" title="Edit">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="relative">
              <button onClick={() => setShowReactions(!showReactions)} className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/50 hover:text-yellow-500 hover:bg-yellow-500/10 transition-all" title="React">
                <Smile className="w-3.5 h-3.5" />
              </button>
              {showReactions && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 glass-strong p-1.5 rounded-full flex gap-1 z-50 animate-pop-in shadow-xl">
                  {['👍', '❤️', '😂', '😮', '😢', '🔥'].map(emoji => (
                    <button key={emoji} onClick={() => { onReact(emoji); setShowReactions(false); }} className="hover:scale-125 transition-transform text-sm p-0.5">{emoji}</button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={onForward} className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-all" title="Forward">
              <Share2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/50 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Delete options"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
 
        <div className={`flex flex-col ${isOwn ? "items-end text-right order-2" : "items-start text-left order-1"}`}>
          {/* Sender Name and Avatar for Groups */}
          {!isOwn && message.recipient_id?.startsWith('room_') && (
            <div className="flex items-center gap-2 mb-1.5 px-2">
              <div className="w-5 h-5 rounded-md bg-primary/20 flex items-center justify-center overflow-hidden ring-1 ring-white/10">
                {message.sender_avatar ? (
                  <img 
                   src={message.sender_avatar.startsWith('http') ? message.sender_avatar : `${SOCKET_URL}${message.sender_avatar}`} 
                   alt="" 
                   className="w-full h-full object-cover" 
                  />
                ) : (
                  <span className="text-[8px] font-black text-primary">
                    {message.sender_name?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              {message.sender_name && (
                <div className="text-[10px] font-black uppercase tracking-wider text-primary opacity-80">
                  {message.sender_name}
                </div>
              )}
            </div>
          )}
          <div
            className={`relative rounded-[1.4rem] shadow-sm transition-all duration-300 ${
              isOwn
                ? "bg-gradient-to-br from-primary to-primary-foreground/20 text-white rounded-tr-none shadow-primary/20 border border-white/10"
                : "bg-white/[0.06] border border-white/[0.08] text-foreground rounded-tl-none"
            } ${hasImage || hasAudio || hasDoc || hasCall ? "p-1.5" : "px-4 py-2.5"}`}
            style={{ 
              boxShadow: isOwn ? '0 8px 24px -10px rgba(59, 130, 246, 0.4)' : '0 8px 24px -10px rgba(0, 0, 0, 0.2)'
            }}
          >
          {!isOwn && message.sender_name && !message.recipient_id?.startsWith('room_') && (
            <div className="flex items-center gap-2 mb-1 px-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-primary brightness-125">
                {message.sender_name}
              </div>
            </div>
          )}
          {/* Reply Preview */}
          {message.reply_to && (
            <div className={`mb-2 p-2.5 rounded-2xl border-l-2 text-[11px] min-w-[160px] backdrop-blur-xl relative overflow-hidden group/reply ${
              isOwn 
                ? "bg-white/5 border-white/20 hover:bg-white/10" 
                : "bg-primary/5 border-primary/30 hover:bg-primary/10"
            } transition-all duration-300`}>
               <div className="absolute top-0 right-0 p-1 opacity-10 group-hover/reply:opacity-30 transition-opacity">
                  <Reply className="w-3 h-3" />
               </div>
               <p className={`font-black mb-1 text-[9px] uppercase tracking-widest ${isOwn ? "text-white/40" : "text-primary/60"}`}>
                 {message.reply_to.sender_id === currentUserId ? "You" : (message.sender_name || "Them")}
               </p>
               <p className={`truncate font-semibold ${isOwn ? "text-white/70" : "text-foreground/70"}`}>
                 {message.reply_to.content}
               </p>
            </div>
          )}
          {message.is_forwarded && (
            <div className={`flex items-center gap-1.5 mb-2 text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md w-fit ${
                isOwn ? "bg-white/5 text-white/40 border border-white/10" : "bg-primary/5 text-primary/60 border border-primary/10"
            }`}>
              <Share2 className="w-2.5 h-2.5" />
              <span>Forwarded_Packet</span>
            </div>
          )}
          {hasImage && (
            <a href={getMediaSrc()} target="_blank" rel="noopener noreferrer" className="relative block rounded-2xl overflow-hidden group/img">
              <img
                src={getMediaSrc()}
                alt="Shared content"
                className="rounded-xl max-w-full max-h-72 object-cover cursor-pointer hover:scale-[1.03] transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                 <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                   <ImageIcon className="w-5 h-5 text-white" />
                 </div>
              </div>
            </a>
          )}
          {message.media_type === 'video' && message.media_url && (
            <video 
              src={getMediaSrc()} 
              controls 
              className="rounded-xl max-w-full max-h-72 shadow-lg outline-none"
            />
          )}
          {hasAudio && (
            <VoicePlayer src={getMediaSrc()} isOwn={isOwn} />
          )}
          {hasDoc && (
            <a
              href={getMediaSrc()}
              target="_blank"
              rel="noopener noreferrer"
              className={`group/doc flex items-center gap-4 min-w-[240px] p-2 rounded-[1.4rem] transition-all duration-500 overflow-hidden relative ${
                isOwn 
                  ? "bg-white/10 hover:bg-white/20 border border-white/10" 
                  : "bg-[#0F111A]/40 hover:bg-[#0F111A]/60 border border-white/[0.08] backdrop-blur-md"
              }`}
            >
              {/* Animated glass shine on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover/doc:translate-x-full transition-transform duration-1000" />
              
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center relative shrink-0 overflow-hidden transition-transform group-hover/doc:scale-105 duration-500 ${
                isOwn ? "bg-white/10" : "bg-primary/20"
              }`}>
                {/* specialized file icons based on extension */}
                {(() => {
                  const ext = getDocIcon(message.media_url!);
                  if (ext === 'pdf') return <div className="text-red-400 font-black text-[10px] scale-150 drop-shadow-lg">PDF</div>;
                  if (['doc', 'docx'].includes(ext)) return <div className="text-blue-400 font-black text-[10px] scale-150 drop-shadow-lg">DOC</div>;
                  if (['xls', 'xlsx'].includes(ext)) return <div className="text-green-400 font-black text-[10px] scale-150 drop-shadow-lg">XLS</div>;
                  if (ext === 'zip' || ext === 'rar') return <div className="text-yellow-400 font-black text-[10px] scale-150 drop-shadow-lg">ZIP</div>;
                  return <FileText className={`w-7 h-7 ${isOwn ? "text-white/40" : "text-primary/60"}`} />;
                })()}
                {/* subtle pulse glow for documents */}
                <div className="absolute inset-0 bg-primary/10 animate-pulse-slow opacity-0 group-hover/doc:opacity-100 transition-opacity" />
              </div>

              <div className="flex-1 min-w-0 pr-2">
                <p className={`text-[13px] font-black truncate tracking-tight mb-0.5 ${isOwn ? "text-white" : "text-foreground"}`}>
                  {getDocName(message)}
                </p>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 ${isOwn ? "text-white/40" : "text-primary/60"}`}>
                    NODE_ASSET
                  </span>
                </div>
              </div>

              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                isOwn ? "bg-white/5 text-white/40 group-hover/doc:bg-white/20 group-hover/doc:text-white" : "bg-white/5 text-primary/40 group-hover/doc:bg-primary/20 group-hover/doc:text-primary"
              }`}>
                <Download className="w-4 h-4" />
              </div>
            </a>
          )}
          {hasCall && (
            <button 
              onClick={() => onStartCall?.(message.media_type === 'call_video' ? 'video' : 'audio')}
              className={`flex items-center gap-4 min-w-[200px] p-2 rounded-2xl group/call transition-all hover:bg-black/5 active:scale-[0.98] text-left`}
              title={`Call back (${message.media_type === 'call_video' ? 'Video' : 'Voice'})`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all group-hover/call:scale-105 shadow-md ${
                isOwn ? "bg-white/20" : "bg-primary/20"
              }`}>
                {message.media_type === 'call_video' ? (
                  <Video className={`w-6 h-6 ${isOwn ? "text-white" : "text-primary brightness-125"}`} />
                ) : (
                  <Phone className={`w-6 h-6 ${isOwn ? "text-white" : "text-primary brightness-125"}`} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-black tracking-tight ${isOwn ? "text-white" : "text-foreground"}`}>
                  {message.media_type === 'call_video' ? 'VIDEO CALL' : 'VOICE CALL'}
                </p>
                <p className={`text-[10px] mt-1 font-medium font-mono truncate uppercase tracking-tighter ${isOwn ? "text-white/70" : "text-muted-foreground/60"}`}>
                  {message.call_duration && message.call_duration > 0 
                    ? `TRANS: ${formatDuration(message.call_duration)}` 
                    : message.content}
                </p>
              </div>
            </button>
          )}
          {!isImageOnly && !isAudioOnly && !isDocOnly && !isCallOnly && (
            <p className={`text-sm leading-relaxed font-medium break-words whitespace-pre-wrap ${hasImage ? "px-3 py-2" : hasAudio || hasDoc ? "mt-2 px-1" : ""}`}>
              {message.content}
            </p>
          )}
          {/* Reactions inside or attached to the bubble */}
          {message.reactions && message.reactions.length > 0 && (
            <div className={`absolute -bottom-3 ${isOwn ? "right-2" : "left-2"} flex -space-x-1.5`}>
              {Array.from(new Set(message.reactions.map(r => r.emoji))).slice(0, 3).map((emoji, i) => (
                <div key={i} className="w-6 h-6 rounded-full bg-white/[0.08] backdrop-blur-xl border border-white/[0.1] flex items-center justify-center text-xs shadow-xl transform hover:scale-125 transition-transform cursor-default animate-pop-in z-20" title={`${message.reactions?.length} reactions`}>
                  {emoji}
                </div>
              ))}
              {message.reactions.length > 3 && (
                 <div className="w-6 h-6 rounded-full bg-white/[0.08] backdrop-blur-xl border border-white/[0.1] flex items-center justify-center text-[8px] font-black text-white/50 shadow-sm z-10">
                   +{message.reactions.length - 3}
                 </div>
              )}
            </div>
          )}
          </div>
          {/* Timestamp BELOW the bubble completely */}
          <div className={`flex flex-row items-center gap-1 mt-1 text-[10px] opacity-60 px-1 ${isOwn ? "justify-end text-right" : "justify-start text-left"}`}>
              {message.is_edited && <span className="italic mr-1">edited</span>}
              {timeLeft !== null && (
                <span className="flex items-center gap-1 text-orange-400 font-bold bg-orange-500/10 px-1.5 py-0.5 rounded-md animate-pulse">
                  <Clock className="w-2.5 h-2.5" />
                  {timeLeft > 60 ? `${Math.ceil(timeLeft / 60)}m` : `${timeLeft}s`}
                </span>
              )}
              {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              {isOwn && <StatusIcon status={message.status} />}
           </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => setShowConfirm(false)}>
          <div className="bg-card border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-foreground font-semibold text-lg mb-2">Delete Message?</h3>
            <p className="text-muted-foreground/60 text-sm mb-6">
              Choose how you want to remove this message.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  onDeleteForMe(message._id);
                  setShowConfirm(false);
                }}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm font-medium text-foreground hover:bg-white/[0.08] transition-all text-center active:scale-[0.98]"
              >
                Delete for me
              </button>
              
              {isOwn && (
                <button
                  onClick={() => {
                    onDelete(message._id);
                    setShowConfirm(false);
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/10 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-all text-center active:scale-[0.98]"
                >
                  Delete for everyone
                </button>
              )}

              <button
                onClick={() => setShowConfirm(false)}
                className="w-full px-4 py-3 rounded-xl border border-white/[0.05] text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/[0.03] transition-all text-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default MessageBubble;
