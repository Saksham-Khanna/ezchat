import { useState } from "react";
import { motion } from "framer-motion";
import type { Message } from "@/pages/Dashboard";
import { Clock, Check, Download, Trash2, Reply, Pencil, Smile, Share2, Phone, Video } from "lucide-react";
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
  const ext = url.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return '📕';
  if (ext === 'doc' || ext === 'docx') return '📘';
  if (ext === 'xls' || ext === 'xlsx') return '📗';
  if (ext === 'txt') return '📄';
  return '📄';
};

const getDocName = (url: string) => {
  const parts = url.split('/');
  const filename = parts[parts.length - 1];
  const match = filename.match(/^doc_\d+_(.+)$/);
  return match ? match[1] : filename;
};

const MessageBubble = ({ message, isOwn, onDelete, onDeleteForMe, onReply, onEdit, onReact, onForward, onStartCall, currentUserId }: MessageBubbleProps) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

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
          <div
            className={`rounded-2xl text-sm leading-relaxed shadow-sm w-fit ${
            isOwn
                ? "gradient-primary text-primary-foreground rounded-br-sm shadow-primary/20"
                : "bg-white/[0.06] border border-white/[0.08] text-foreground rounded-bl-sm"
            } ${hasImage ? "p-1.5" : hasAudio ? "px-3 py-2.5" : hasDoc ? "px-3 py-2.5" : "px-4 py-2"} relative`}
          >
          {/* Sender Name and Avatar for Groups */}
          {!isOwn && message.recipient_id?.startsWith('room_') && (
            <div className="flex items-center gap-2 mb-1.5 px-0.5">
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
          {/* Reply Preview */}
          {message.reply_to && (
            <div className={`mb-2 p-2 rounded-lg border-l-[3px] text-[11px] min-w-[120px] ${isOwn ? "bg-white/10 border-white/30" : "bg-white/[0.04] border-primary/50"}`}>
               <p className="font-bold mb-0.5 opacity-60 text-[10px]">
                 {message.reply_to.sender_id === currentUserId ? "You" : "Them"}
               </p>
               <p className="opacity-70 truncate">{message.reply_to.content}</p>
            </div>
          )}
          {message.is_forwarded && (
            <div className="flex items-center gap-1 mb-1 text-[10px] italic opacity-50">
              <Share2 className="w-2.5 h-2.5" />
              <span>Forwarded</span>
            </div>
          )}
          {hasImage && (
            <a href={getMediaSrc()} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden">
              <img
                src={getMediaSrc()}
                alt="Shared image"
                className="rounded-xl max-w-full max-h-64 object-cover cursor-pointer hover:scale-[1.02] transition-transform duration-500"
              />
            </a>
          )}
          {message.media_type === 'video' && message.media_url && (
            <video 
              src={getMediaSrc()} 
              controls 
              className="rounded-xl max-w-full max-h-64 outline-none"
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
              className={`flex items-center gap-3 min-w-[200px] p-2.5 rounded-xl transition-all duration-300 ${
                isOwn ? "bg-white/10 hover:bg-white/15" : "bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.05]"
              }`}
            >
              <span className="text-2xl shrink-0">{getDocIcon(message.media_url!)}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium truncate ${isOwn ? "text-white" : "text-foreground"}`}>
                  {getDocName(message.media_url!)}
                </p>
                <p className={`text-[10px] mt-0.5 ${isOwn ? "text-white/40" : "text-muted-foreground/50"}`}>
                  Document
                </p>
              </div>
              <Download className={`w-4 h-4 shrink-0 ${isOwn ? "text-white/40" : "text-muted-foreground/50"}`} />
            </a>
          )}
          {hasCall && (
            <button 
              onClick={() => onStartCall?.(message.media_type === 'call_video' ? 'video' : 'audio')}
              className={`flex items-center gap-3 min-w-[180px] p-1 rounded-xl group/call transition-all hover:bg-black/5 active:scale-95 text-left`}
              title={`Call back (${message.media_type === 'call_video' ? 'Video' : 'Voice'})`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover/call:scale-110 ${
                isOwn ? "bg-white/20" : "bg-primary/10"
              }`}>
                {message.media_type === 'call_video' ? (
                  <Video className={`w-5 h-5 ${isOwn ? "text-white" : "text-primary"}`} />
                ) : (
                  <Phone className={`w-5 h-5 ${isOwn ? "text-white" : "text-primary"}`} />
                )}
              </div>
              <div className="flex-1">
                <p className={`text-xs font-bold ${isOwn ? "text-white" : "text-foreground"}`}>
                  {message.media_type === 'call_video' ? 'Video Call' : 'Voice Call'}
                </p>
                <p className={`text-[10px] mt-0.5 ${isOwn ? "text-white/60" : "text-muted-foreground/50"}`}>
                  {message.call_duration && message.call_duration > 0 
                    ? `Duration: ${formatDuration(message.call_duration)}` 
                    : message.content}
                </p>
              </div>
            </button>
          )}
          {!isImageOnly && !isAudioOnly && !isDocOnly && !isCallOnly && (
            <p className={`break-words whitespace-pre-wrap break-all ${hasImage ? "px-2.5 py-1.5" : hasAudio || hasDoc ? "mt-1" : ""}`}>{message.content}</p>
          )}
          {/* Reactions inside or attached to the bubble */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="absolute -bottom-3 right-2 flex -space-x-1">
              {Array.from(new Set(message.reactions.map(r => r.emoji))).slice(0, 3).map((emoji, i) => (
                <div key={i} className="w-5 h-5 rounded-full bg-secondary/90 backdrop-blur-sm border border-white/[0.08] flex items-center justify-center text-[10px] shadow-sm transform hover:scale-125 transition-transform cursor-default animate-pop-in" title={`${message.reactions?.length} reactions`}>
                  {emoji}
                </div>
              ))}
            </div>
          )}
          </div>
        
          {/* Timestamp BELOW the bubble completely */}
          <div className={`flex flex-row items-center gap-1 mt-1 text-[10px] opacity-60 px-1 ${isOwn ? "justify-end text-right" : "justify-start text-left"}`}>
             {message.is_edited && <span className="italic mr-1">edited</span>}
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
