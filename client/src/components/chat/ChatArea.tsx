import { useState, useRef, useEffect, RefObject } from "react";
import {
  Send, Smile, Paperclip, MoreVertical, Phone, Video,
  Search, Info, Image as ImageIcon, FileText, X,
  File, Download, Play, Check, CheckCheck, Trash2,
  Reply, Forward, SmilePlus, Edit2, CornerUpRight,
  Mic, Square, Loader2, Wifi, WifiOff, Globe, UserCircle,
  Pencil, Lock as LockIcon, SendHorizonal, Plus, RotateCcw, Clock
} from "lucide-react";
import type { Friend, Message } from "@/pages/Dashboard";
import MessageBubble from "./MessageBubble";
import VoicePlayer from "./VoicePlayer";
import ImageEditor from "./ImageEditor";
import ConfirmDialog from "./ConfirmDialog";
import { motion, AnimatePresence } from "framer-motion";
import EmojiPicker, { Theme } from "emoji-picker-react";

import { SOCKET_URL } from "@/lib/config";

interface ChatAreaProps {
  selectedFriend: Friend | null;
  messages: Message[];
  newMessage: string;
  onNewMessageChange: (msg: string) => void;
  onSendMessage: () => void;
  onSendImage: (mediaUrl: string, caption?: string) => void;
  onSendVideo: (mediaUrl: string, caption?: string) => void;
  onSendAudio: (mediaUrl: string, caption?: string) => void;
  onSendDocument: (mediaUrl: string, fileName: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onDeleteForMe: (messageId: string) => void;
  onEditMessage: (messageId: string, newContent: string) => void;
  onReactToMessage: (messageId: string, emoji: string) => void;
  onForwardMessage: (message: Message) => void;
  onStartCall: (type: "audio" | "video") => void;
  replyTo: Message | null;
  setReplyTo: (msg: Message | null) => void;
  editingMsg: Message | null;
  setEditingMsg: (msg: Message | null) => void;
  onToggleProfile: () => void;
  onBlock: (friendId: string) => void;
  onUnfriend: (friendId: string) => void;
  onClearChat?: (friendId: string) => void;
  messagesEndRef: RefObject<HTMLDivElement>;
  isTyping?: boolean;
  isSelfTyping?: boolean;
  currentUserId: string;
  chatMode?: "internet" | "wifi";
  onSetChatMode?: (mode: "internet" | "wifi") => void;
  wifiStatus?: string;
  wifiTransferProgress?: Map<string, number>;
  onSendP2PFile?: (file: File) => Promise<void>;
  isDisappearing?: boolean;
  onToggleDisappearing?: (duration: number) => void;
  currentUserRole?: string;
  groupTypingUsers?: {username: string; avatar_url?: string}[];
}

const ChatArea = ({
  selectedFriend,
  messages,
  newMessage,
  onNewMessageChange,
  onSendMessage,
  onSendImage,
  onSendVideo,
  onSendAudio,
  onSendDocument,
  onDeleteMessage,
  onDeleteForMe,
  onEditMessage,
  onReactToMessage,
  onForwardMessage,
  onStartCall,
  replyTo,
  setReplyTo,
  editingMsg,
  setEditingMsg,
  onToggleProfile,
  onBlock,
  onUnfriend,
  onClearChat,
  messagesEndRef,
  isTyping,
  isSelfTyping,
  currentUserId,
  chatMode = "internet",
  onSetChatMode,
  wifiStatus = "offline",
  wifiTransferProgress = new Map(),
  onSendP2PFile,
  isDisappearing = false,
  onToggleDisappearing,
  currentUserRole,
  groupTypingUsers = [],
}: ChatAreaProps) => {
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'unfriend' | 'block' | 'clear'; friendId: string; friendName: string } | null>(null);
  const [previewFiles, setPreviewFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [imageCaption, setImageCaption] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);

  // Document state
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Voice note state
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [audioCaption, setAudioCaption] = useState("");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    };
  }, []);

  const [featureIndex, setFeatureIndex] = useState(0);
  const features = [
    "Real-time Messaging",
    "Secure End-to-End Encryption",
    "High-Quality Voice & Video Calls",
    "Instant File & Image Sharing",
    "Dynamic Profile Customization"
  ];

  useEffect(() => {
    if (isTyping || (groupTypingUsers && groupTypingUsers.length > 0)) {
       messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isTyping, groupTypingUsers?.length, messagesEndRef]);

  useEffect(() => {
    if (!selectedFriend) {
      const interval = setInterval(() => {
        setFeatureIndex((prev) => (prev + 1) % features.length);
      }, 3000); // Increased to 3s for better readability
      return () => clearInterval(interval);
    }
  }, [selectedFriend, features.length]);

  if (!selectedFriend) {
    return (
      <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-[#030712]">
        {/* Immersive Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[50%] h-[50%] bg-primary/20 blur-[180px] rounded-full animate-pulse opacity-20" />
          <div className="absolute bottom-1/4 right-1/4 w-[40%] h-[40%] bg-accent/10 blur-[160px] rounded-full animate-pulse opacity-15" style={{ animationDelay: '3s' }} />
          
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        </div>
        
        <div className="text-center w-full max-w-2xl px-8 relative z-10 mt-[-4vh]">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative mb-8 pt-4"
          >
            <div className="absolute inset-0 flex items- center justify-center">
              <div className="w-64 h-64 rounded-full bg-primary/20 blur-[100px] animate-pulse" />
            </div>
            
            <div className="relative flex justify-center">
              <div className="relative w-80 h-80 flex items-center justify-center">
                <img 
                  src="/full-logo.png" 
                  alt="ezchat" 
                  className="w-full h-full object-contain relative z-20 brand-logo drop-shadow-[0_0_35px_rgba(59,130,246,0.2)] transition-transform hover:scale-110 duration-700"
                />
              </div>
            </div>
          </motion.div>

          <div className="space-y-6">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center justify-center gap-3">
                <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-primary/50" />
                <p className="text-[11px] font-black uppercase tracking-[0.5em] text-primary brightness-125 drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                  The Mesh Protocol
                </p>
                <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-primary/50" />
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="h-16 flex items-center justify-center overflow-hidden"
            >
              <AnimatePresence mode="wait">
                <motion.p 
                  key={featureIndex}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  className="text-base font-bold text-white/70 tracking-wide"
                >
                  {features[featureIndex]}
                </motion.p>
              </AnimatePresence>
            </motion.div>

            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="grid grid-cols-2 gap-4 max-w-sm mx-auto"
            >
               {[
                 { icon: Globe, label: "E2EE Verified", col: "text-green-400" },
                 { icon: Wifi, label: "Mesh Ready", col: "text-blue-400" }
               ].map((badge, bi) => (
                 <div key={bi} className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/[0.03] border border-white/5 shadow-sm">
                   <badge.icon className={`w-3.5 h-3.5 ${badge.col}`} />
                   <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{badge.label}</span>
                 </div>
               ))}
            </motion.div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="flex items-center justify-center gap-4 mt-6"
          >
            {features.map((_, idx) => (
              <button 
                key={idx}
                onMouseEnter={() => setFeatureIndex(idx)}
                className={`transition-all duration-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.1)] ${
                  idx === featureIndex 
                    ? "w-10 h-1.5 bg-primary shadow-lg shadow-primary/40 ring-1 ring-primary/20" 
                    : "w-2.5 h-2.5 bg-white/5 hover:bg-white/20 hover:scale-125"
                }`} 
              />
            ))}
          </motion.div>
        </div>
      </div>
    );
  }

  const filteredMessages = messages.filter(m => {
    const matchesSearch = m.content?.toLowerCase().includes(chatSearchQuery.toLowerCase());
    if (m.type === 'system') {
      // System messages only for admin/manager
      return matchesSearch && (currentUserRole === 'admin' || currentUserRole === 'manager');
    }
    return matchesSearch;
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (editingMsg) {
        onEditMessage(editingMsg._id, newMessage);
      } else {
        onSendMessage();
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    setPreviewFiles(prev => [...prev, ...newFiles]);
    setPreviewUrls(prev => [...prev, ...newFiles.map(f => URL.createObjectURL(f))]);
    setImageCaption("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemovePreviewImage = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setPreviewFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleCancelPreview = () => {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setPreviewFiles([]);
    setPreviewUrls([]);
    setImageCaption("");
  };

  const uploadFile = (file: File, endpoint: string, fieldName: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append(fieldName, file);

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percent);
        }
      });

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));
      
      xhr.open("POST", `${SOCKET_URL}${endpoint}`);
      xhr.send(formData);
    });
  };

  const handleConfirmSend = async () => {
    if (previewFiles.length === 0) return;
    setUploading(true);
    setUploadProgress(0);
    const caption = imageCaption.trim() || undefined;
    
    for (let i = 0; i < previewFiles.length; i++) {
       const file = previewFiles[i];
       const isVideo = file.type.startsWith("video/");
       const endpoint = isVideo ? "/api/messages/upload-video" : "/api/messages/upload-media";
       const fieldName = isVideo ? "video" : "media";
       
       try {
        if (chatMode === "wifi" && onSendP2PFile) {
          await onSendP2PFile(file);
        } else {
          const data = await uploadFile(file, endpoint, fieldName);
          if (isVideo) {
            onSendVideo(data.media_url, i === 0 ? caption : undefined);
          } else {
            onSendImage(data.media_url, i === 0 ? caption : undefined);
          }
        }
      } catch (error) {
        console.error("Media upload error:", error);
      }
    }
    setUploading(false);
    setUploadProgress(null);
    handleCancelPreview();
  };

  // --- Voice recording ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioPreviewUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleCancelAudio = () => {
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    setAudioBlob(null);
    setAudioPreviewUrl(null);
    setAudioCaption("");
    setRecordingDuration(0);
  };

  const handleConfirmAudioSend = async () => {
    if (!audioBlob) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "voice_note.webm");
      const response = await fetch(`${SOCKET_URL}/api/messages/upload-audio`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        onSendAudio(data.media_url, audioCaption.trim() || undefined);
      }
    } catch (error) {
      console.error("Audio upload error:", error);
    }
    setUploading(false);
    handleCancelAudio();
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // --- Document handlers ---
  const handleDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setDocFiles(prev => [...prev, ...Array.from(files)]);
    if (docInputRef.current) docInputRef.current.value = "";
  };

  const handleRemoveDoc = (index: number) => {
    setDocFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCancelDoc = () => {
    setDocFiles([]);
  };

  const handleConfirmDocSend = async () => {
    if (docFiles.length === 0) return;
    setUploading(true);
    setUploadProgress(0);
    for (const file of docFiles) {
      try {
        const data = await uploadFile(file, "/api/messages/upload-doc", "document");
        onSendDocument(data.media_url, file.name);
      } catch (error) {
        console.error("Document upload error:", error);
      }
    }
    setUploading(false);
    setUploadProgress(null);
    handleCancelDoc();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDocIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return '📕';
    if (ext === 'doc' || ext === 'docx') return '📘';
    if (ext === 'xls' || ext === 'xlsx') return '📗';
    if (ext === 'txt') return '📄';
    return '📄';
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 relative">
      <div 
        onClick={onToggleProfile} 
        className="glass relative z-50 border-b border-white/[0.05] shrink-0 cursor-pointer hover:bg-white/[0.02] transition-all duration-300"
      >
        <div className="max-w-4xl mx-auto w-full px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            {selectedFriend.cv_id === 'Group' ? (
              /* Group icon */
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-black text-lg">
                {selectedFriend.username?.charAt(0).toUpperCase()}
              </div>
            ) : (
              <div className={`w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground font-medium overflow-hidden ring-2 transition-all duration-500 ${
                selectedFriend.is_online ? 'ring-online/30' : 'ring-white/[0.06]'
              }`}>
                  {selectedFriend.avatar_url ? (
                    <img 
                      src={selectedFriend.avatar_url.startsWith("http") ? selectedFriend.avatar_url : `${SOCKET_URL}${selectedFriend.avatar_url}`} 
                      alt="" 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).parentElement?.insertAdjacentHTML('beforeend', `<span class="flex items-center justify-center w-full h-full bg-primary/10 text-primary font-bold text-sm">${selectedFriend.username?.charAt(0).toUpperCase() || '?'}</span>`);
                      }}
                    />
                  ) : (
                    <span className="text-primary font-bold text-sm">{selectedFriend.username?.charAt(0).toUpperCase() || '?'}</span>
                  )}
              </div>
            )}
            {selectedFriend.cv_id !== 'Group' && (
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background transition-colors duration-300 ${
                  selectedFriend.is_online ? "bg-online" : "bg-offline"
                }`}
              />
            )}
          </div>
          <div className="text-left">
            <p className="font-semibold text-foreground text-[15px]">{selectedFriend.username}</p>
            <p className={`text-xs transition-colors duration-300 ${isTyping ? 'text-primary font-medium' : 'text-muted-foreground/60'}`}>
              {selectedFriend.cv_id === 'Group'
                ? `Group Chat • Click to manage`
                : (isTyping ? "typing..." : (chatMode === "wifi" ? `Mesh Network` : (selectedFriend.is_online ? "Online" : "Offline")))
              }
            </p>
          </div>
          {chatMode === "wifi" && (
            <div className="ml-3 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 flex items-center gap-1.5 animate-pulse-glow">
              <Wifi className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">WiFi Mode</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${isSearchOpen ? "bg-primary/15 text-primary" : "bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"}`}
          >
            <Search className="w-4 h-4" />
          </button>
          
          {/* Only show call buttons for direct friend chats */}
          {selectedFriend.cv_id !== 'Group' && (
            <>
              <button
                onClick={() => onStartCall("audio")}
                className="w-9 h-9 rounded-xl bg-white/[0.03] flex items-center justify-center text-muted-foreground hover:text-green-400 hover:bg-green-500/10 transition-all duration-300 hover:scale-105 active:scale-95"
                title="Voice Call"
              >
                <Phone className="w-4 h-4" />
              </button>

              <button
                onClick={() => onStartCall("video")}
                className="w-9 h-9 rounded-xl bg-white/[0.03] flex items-center justify-center text-muted-foreground hover:text-blue-400 hover:bg-blue-500/10 transition-all duration-300 hover:scale-105 active:scale-95"
                title="Video Call"
              >
                <Video className="w-4 h-4" />
              </button>
            </>
          )}

          {onSetChatMode && selectedFriend.cv_id !== 'Group' && (
            <button
              onClick={() => onSetChatMode(chatMode === "internet" ? "wifi" : "internet")}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 border ${
                chatMode === "wifi" 
                  ? "bg-primary/20 text-primary border-primary/30" 
                  : "bg-white/[0.03] text-muted-foreground border-white/[0.05] hover:bg-white/[0.06]"
              }`}
              title={chatMode === "wifi" ? "Switch to Internet Mode" : "Switch to WiFi Mode"}
            >
              <Wifi className="w-4 h-4" />
            </button>
          )}

          {selectedFriend.cv_id === 'Group' ? (
            /* Group: show Members toggle button in place of 3-dot menu */
            <button
              onClick={() => onToggleProfile()}
              className="w-9 h-9 rounded-xl bg-white/[0.03] flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-300"
              title="Toggle Members Panel"
            >
              <Info className="w-4 h-4" />
            </button>
          ) : (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${showMenu ? "bg-white/10 text-foreground" : "bg-white/[0.03] text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"}`}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-48 glass border border-white/[0.08] rounded-2xl shadow-2xl py-2 z-50 animate-scale-in origin-top-right">
                  <button
                    onClick={() => { onToggleProfile(); setShowMenu(false); }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-foreground hover:bg-white/[0.05] transition-colors text-left"
                  >
                    <UserCircle className="w-4 h-4 text-primary" />
                    View Profile
                  </button>
                  <button
                    onClick={() => { 
                      setConfirmAction({ type: 'clear', friendId: selectedFriend._id, friendName: selectedFriend.username });
                      setShowMenu(false); 
                    }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-foreground hover:bg-white/[0.05] transition-colors text-left"
                  >
                    <Trash2 className="w-4 h-4 text-orange-400" />
                    Clear Chat
                  </button>
                  <button
                    onClick={() => { 
                      onToggleDisappearing?.(isDisappearing ? 0 : 3600); // Default to 1 hour
                      setShowMenu(false); 
                    }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-foreground hover:bg-white/[0.05] transition-colors text-left"
                  >
                    <Clock className={`w-4 h-4 ${isDisappearing ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
                    {isDisappearing ? "Disappearing: ON" : "Disappearing Messages"}
                  </button>
                  <div className="h-[1px] bg-white/[0.05] my-1 mx-2" />
                  <button
                    onClick={() => { 
                      setConfirmAction({ type: 'unfriend', friendId: selectedFriend._id, friendName: selectedFriend.username });
                      setShowMenu(false); 
                    }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-muted-foreground hover:bg-white/[0.05] transition-colors text-left"
                  >
                    <UserCircle className="w-4 h-4 text-muted-foreground" />
                    Unfriend
                  </button>
                  <button
                    onClick={() => { 
                      setConfirmAction({ type: 'block', friendId: selectedFriend._id, friendName: selectedFriend.username });
                      setShowMenu(false); 
                    }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left"
                  >
                    <LockIcon className="w-4 h-4" />
                    Block User
                  </button>
                </div>
              </>
            )}
          </div>
          )}
        </div>
        </div>
      </div>

      {/* Internal Chat Search */}
      {isSearchOpen && (
        <div className="border-b border-white/[0.05] bg-white/[0.02] animate-fade-in">
          <div className="max-w-4xl mx-auto w-full px-6 py-2.5 flex items-center gap-2.5">
            <Search className="w-3.5 h-3.5 text-primary/60" />
            <input
              type="text"
              placeholder="Search messages..."
              value={chatSearchQuery}
              onChange={(e) => setChatSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-foreground focus:outline-none placeholder:text-muted-foreground/40"
              autoFocus
            />
            <button onClick={() => { setIsSearchOpen(false); setChatSearchQuery(""); }} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 min-h-0 relative flex flex-col">
        {/* WiFi Transfer Progress Overlay */}
        {selectedFriend && Array.from(wifiTransferProgress.entries()).some(([key]) => key.startsWith(selectedFriend._id)) && (
          <div className="absolute top-2 right-2 left-2 z-20 animate-in fade-in slide-in-from-top-2">
            <div className="glass-strong border border-white/10 rounded-xl p-3 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Receiving File</p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                      {Array.from(wifiTransferProgress.entries()).find(([key]) => key.startsWith(selectedFriend._id))?.[0].split('-').slice(1).join('-')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-primary">
                    {Array.from(wifiTransferProgress.entries()).find(([key]) => key.startsWith(selectedFriend._id))?.[1] || 0}%
                  </p>
                </div>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300 shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                  style={{ width: `${Array.from(wifiTransferProgress.entries()).find(([key]) => key.startsWith(selectedFriend._id))?.[1] || 0}%` }}
                />
              </div>
            </div>
          </div>
        )}
        {/* Messages Container */}
        <div className="flex-1 overflow-hidden relative">
          <div className="h-full flex flex-col max-w-4xl mx-auto w-full px-4 md:px-9">
            <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin py-6 flex flex-col scroll-smooth">
              <div className="flex-1" />
              <div className="space-y-6">
                {filteredMessages.map((msg) => (
                  <MessageBubble 
                    key={msg._id} 
                    message={msg} 
                    isOwn={msg.sender_id === currentUserId} 
                    onDelete={onDeleteMessage} 
                    onDeleteForMe={onDeleteForMe}
                    onReply={() => setReplyTo(msg)}
                    onEdit={() => { setEditingMsg(msg); onNewMessageChange(msg.content); }}
                    onReact={(emoji) => onReactToMessage(msg._id, emoji)}
                    onForward={() => onForwardMessage(msg)}
                    onStartCall={onStartCall}
                    currentUserId={currentUserId}
                  />
                ))}
                {/* Typing Indicators */}
                {/* Group typing: premium floating styling */}
                {groupTypingUsers.length > 0 && (
                  <div className="flex items-center gap-2 animate-fade-in py-2 pl-2">
                    <div className="flex px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-full items-center shadow-lg backdrop-blur-md">
                      <div className="flex -space-x-2 mr-3">
                        {groupTypingUsers.slice(0, 4).map((u, i) => (
                          <div
                            key={i}
                            className="relative avatar-float z-10"
                            style={{ animationDelay: `${i * 150}ms` }}
                            title={u.username}
                          >
                            <div className="w-7 h-7 rounded-full overflow-hidden bg-secondary flex items-center justify-center ring-2 ring-background border border-primary/20 shadow-md">
                              {u.avatar_url ? (
                                <img
                                  src={u.avatar_url.startsWith('http') ? u.avatar_url : `${SOCKET_URL}${u.avatar_url}`}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-[10px] font-black text-primary">
                                  {u.username.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5 pr-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/80 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                {/* 1-on-1 typing */}
                {isTyping && (
                  <div className="flex flex-col gap-2 animate-fade-in py-2">
                    <div className="flex items-center gap-1.5 px-3.5 py-3 rounded-2xl glass border border-white/[0.05] w-fit">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/80 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Preview Overlay */}
      {previewUrls.length > 0 && (
        <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col animate-fade-in">
          <div className="flex items-center justify-between p-4 border-b border-white/[0.05]">
            <h3 className="text-sm font-semibold text-foreground">
              Send {previewFiles.length} {previewFiles.length === 1 ? 'Image' : 'Images'}
            </h3>
            <button
              onClick={handleCancelPreview}
              className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-3">
              {previewUrls.map((url, i) => (
                <div key={i} className="relative group rounded-xl overflow-hidden">
                  {previewFiles[i].type.startsWith("video/") ? (
                    <video
                      src={url}
                      className="w-full aspect-square object-cover"
                    />
                  ) : (
                    <img
                      src={url}
                      alt={`Preview ${i + 1}`}
                      className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                  <button
                    onClick={() => handleRemovePreviewImage(i)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-500/80"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {!previewFiles[i].type.startsWith("video/") && (
                    <button
                      onClick={() => setEditingImageIndex(i)}
                      className="absolute bottom-2 right-2 w-7 h-7 rounded-lg bg-black/60 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-primary/80"
                      title="Edit image"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 border-t border-white/[0.05]">
            <div className="glass rounded-2xl flex items-center gap-2 px-4 py-2 neon-focus border border-white/[0.05]">
              <input
                type="text"
                value={imageCaption}
                onChange={(e) => setImageCaption(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleConfirmSend();
                  }
                }}
                placeholder="Add a caption..."
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/40 focus:outline-none py-2 text-sm"
                autoFocus
              />
              <button
                onClick={handleConfirmSend}
                disabled={uploading}
                className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground hover:opacity-90 active:scale-95 transition-all shrink-0 disabled:opacity-50 shadow-lg shadow-primary/20 relative"
              >
                {uploading ? (
                  <div className="relative flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {uploadProgress !== null && (
                      <span className="absolute -top-8 text-[10px] font-bold bg-background/80 backdrop-blur-sm px-1.5 py-0.5 rounded border border-white/10">
                        {uploadProgress}%
                      </span>
                    )}
                  </div>
                ) : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Image Editor */}
          {editingImageIndex !== null && previewUrls[editingImageIndex] && (
            <ImageEditor
              imageUrl={previewUrls[editingImageIndex]}
              onSave={(editedFile, editedUrl) => {
                URL.revokeObjectURL(previewUrls[editingImageIndex]);
                setPreviewFiles(prev => prev.map((f, i) => i === editingImageIndex ? editedFile : f));
                setPreviewUrls(prev => prev.map((u, i) => i === editingImageIndex ? editedUrl : u));
                setEditingImageIndex(null);
              }}
              onCancel={() => setEditingImageIndex(null)}
            />
          )}
        </div>
      )}

      {/* Audio Preview Overlay */}
      {audioPreviewUrl && (
        <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col animate-fade-in">
          <div className="flex items-center justify-between p-4 border-b border-white/[0.05]">
            <h3 className="text-sm font-semibold text-foreground">Preview Voice Note</h3>
            <button
              onClick={handleCancelAudio}
              className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
            <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center shadow-2xl shadow-primary/30 animate-pulse-glow">
              <Mic className="w-10 h-10 text-primary-foreground" />
            </div>
            <p className="text-sm text-muted-foreground font-mono">{formatDuration(recordingDuration)}</p>
            <div className="w-full max-w-md glass rounded-2xl px-4 py-3 border border-white/[0.05]">
              <VoicePlayer src={audioPreviewUrl} isOwn={false} />
            </div>
          </div>
          <div className="p-4 border-t border-white/[0.05]">
            <div className="glass rounded-2xl flex items-center gap-2 px-4 py-2 neon-focus border border-white/[0.05]">
              <input
                type="text"
                value={audioCaption}
                onChange={(e) => setAudioCaption(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleConfirmAudioSend();
                  }
                }}
                placeholder="Add a caption..."
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/40 focus:outline-none py-2 text-sm"
                autoFocus
              />
              <button
                onClick={handleConfirmAudioSend}
                disabled={uploading}
                className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground hover:opacity-90 active:scale-95 transition-all shrink-0 disabled:opacity-50 shadow-lg shadow-primary/20"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Overlay */}
      {docFiles.length > 0 && (
        <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col animate-fade-in">
          <div className="flex items-center justify-between p-4 border-b border-white/[0.05]">
            <h3 className="text-sm font-semibold text-foreground">
              Send {docFiles.length} {docFiles.length === 1 ? 'Document' : 'Documents'}
            </h3>
            <button
              onClick={handleCancelDoc}
              className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-col gap-2">
              {docFiles.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] group hover:bg-white/[0.05] transition-all duration-300"
                >
                  <span className="text-2xl shrink-0">{getDocIcon(file.name)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground/60">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveDoc(i)}
                    className="w-6 h-6 rounded-full bg-white/[0.04] flex items-center justify-center text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 border-t border-white/[0.05] flex items-center justify-center gap-3">
            <button
              onClick={handleCancelDoc}
              className="px-6 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/[0.08] transition-all active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDocSend}
              disabled={uploading}
              className="px-6 py-2.5 rounded-xl gradient-primary text-sm font-medium text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2 active:scale-[0.98] shadow-lg shadow-primary/15 relative"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {uploadProgress !== null ? `${uploadProgress}%` : 'Uploading...'}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send {docFiles.length > 1 ? `(${docFiles.length})` : ''}
                </>
              )}
            </button>
          </div>
        </div>
      )}



      {/* Emoji Picker */}
      {showEmoji && (
        <div className="relative px-4">
          <div className="absolute bottom-0 left-4 z-50 shadow-2xl rounded-xl overflow-hidden animate-scale-in">
            <EmojiPicker
              theme={Theme.DARK}
              width={350}
              height={400}
              onEmojiClick={(emojiData) => {
                onNewMessageChange(newMessage + emojiData.emoji);
                setShowEmoji(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Reply/Edit Bar */}
      {(replyTo || editingMsg) && (
        <div className="px-6 py-2.5 border-t border-white/[0.05] bg-white/[0.02] flex items-center justify-between animate-slide-up">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-1 h-8 rounded-full gradient-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-primary uppercase tracking-wide">{editingMsg ? "Editing Message" : `Replying to ${replyTo?.sender_id === currentUserId ? "Yourself" : selectedFriend.username}`}</p>
              <p className="text-xs text-muted-foreground/60 truncate">{editingMsg ? editingMsg.content : replyTo?.content}</p>
            </div>
          </div>
          <button 
            onClick={() => { setReplyTo(null); setEditingMsg(null); if(editingMsg) onNewMessageChange(""); }}
            className="w-6 h-6 rounded-full bg-white/[0.04] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Input Section */}
      <div className="border-t border-white/[0.05] bg-white/[0.01]">
        <div className="max-w-4xl mx-auto w-full px-6 py-4">
          <div className={`rounded-2xl flex items-center gap-1.5 px-3 py-1.5 transition-all duration-300 border ${
            isInputFocused 
              ? 'bg-white/[0.04] border-primary/30 shadow-[0_0_0_3px_hsla(200,80%,45%,0.06)]' 
              : 'glass border-white/[0.05]'
          }`}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
              multiple
            />
            <input
              ref={docInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain"
              onChange={handleDocSelect}
              className="hidden"
              multiple
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-white/[0.05] transition-all shrink-0"
              title="Send image"
            >
              <ImageIcon className="w-[18px] h-[18px]" />
            </button>
            <button
              onClick={() => docInputRef.current?.click()}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-white/[0.05] transition-all shrink-0"
              title="Send document"
            >
              <Paperclip className="w-[18px] h-[18px]" />
            </button>
            <button
              onClick={() => setShowEmoji(!showEmoji)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/[0.05] transition-all shrink-0 ${showEmoji ? "text-primary" : "text-muted-foreground/60 hover:text-foreground"}`}
            >
              {showEmoji ? <X className="w-[18px] h-[18px]" /> : <Smile className="w-[18px] h-[18px]" />}
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => onNewMessageChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => { setShowEmoji(false); setIsInputFocused(true); }}
              onBlur={() => setIsInputFocused(false)}
              placeholder="Type a message..."
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/40 focus:outline-none py-2 text-sm"
            />
            {/* Mic button */}
            <button
              onClick={handleMicClick}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                isRecording
                  ? "bg-red-500/20 text-red-400 animate-pulse"
                  : "text-muted-foreground/60 hover:text-foreground hover:bg-white/[0.05]"
              }`}
              title={isRecording ? "Stop recording" : "Record voice note"}
            >
              <Mic className="w-4 h-4" />
            </button>
            {/* Recording indicator */}
            {isRecording && (
              <span className="text-[11px] text-red-400 font-mono shrink-0">{formatDuration(recordingDuration)}</span>
            )}
            <button
              onClick={editingMsg ? () => onEditMessage(editingMsg._id, newMessage) : onSendMessage}
              disabled={!newMessage.trim()}
              className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground disabled:opacity-20 hover:opacity-90 active:scale-90 transition-all shrink-0 shadow-lg shadow-primary/15"
            >
              {editingMsg ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
        title={
          confirmAction?.type === 'unfriend' ? 'Unfriend' 
          : confirmAction?.type === 'block' ? 'Block User' 
          : 'Clear Chat'
        }
        description={
          confirmAction?.type === 'unfriend'
            ? `Are you sure you want to unfriend ${confirmAction.friendName}?`
            : confirmAction?.type === 'block'
            ? `Are you sure you want to block ${confirmAction?.friendName}? They won't be able to message you.`
            : `Are you sure you want to clear your chat history with ${confirmAction?.friendName}? This cannot be undone.`
        }
        confirmLabel="Yes"
        cancelLabel="No"
        variant="danger"
        onConfirm={() => {
          if (confirmAction?.type === 'unfriend') {
            onUnfriend(confirmAction.friendId);
          } else if (confirmAction?.type === 'block') {
            onBlock(confirmAction.friendId);
          } else if (confirmAction?.type === 'clear') {
            onClearChat?.(confirmAction.friendId);
          }
        }}
      />
    </div>
  );
};

export default ChatArea;
