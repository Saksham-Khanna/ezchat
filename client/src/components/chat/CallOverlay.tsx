import { useState, useEffect, useRef } from "react";
import { Phone, PhoneOff, Mic, MicOff, User, Video, VideoOff, Volume2, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CallOverlayProps {
  status: "calling" | "incoming" | "connected";
  callType: "audio" | "video";
  callerName: string;
  callerAvatar?: string;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
  remoteStream?: MediaStream | null;
  localStream?: MediaStream | null;
  onToggleVideo?: (enabled: boolean) => void;
}

const CallOverlay = ({ 
  status, 
  callType,
  callerName, 
  callerAvatar, 
  onAccept, 
  onReject, 
  onEnd,
  remoteStream,
  localStream,
  onToggleVideo
}: CallOverlayProps) => {
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const remoteMediaRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (status === "incoming") {
      ringtoneRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3");
      ringtoneRef.current.loop = true;
      ringtoneRef.current.play().catch(e => console.error("Ringtone failed", e));
    } else {
      ringtoneRef.current?.pause();
      ringtoneRef.current = null;
    }

    let interval: ReturnType<typeof setInterval>;
    if (status === "connected") {
      interval = setInterval(() => setDuration(prev => prev + 1), 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
      ringtoneRef.current?.pause();
    };
  }, [status]);

  // Robustly attach streams
  useEffect(() => {
    const remoteVideo = remoteMediaRef.current;
    if (status === "connected" && remoteStream && remoteVideo) {
        console.log("Attaching remote stream:", remoteStream.id, "Tracks:", remoteStream.getTracks().length);
        
        if (remoteVideo.srcObject !== remoteStream) {
          remoteVideo.srcObject = remoteStream;
        }

        remoteVideo.muted = false;
        
        const playVideo = async () => {
          try {
            await remoteVideo.play();
            console.log("Remote video playing successfully");
          } catch (e) {
            console.warn("Remote play failed, trying muted fallback...", e);
            // If autoplay is blocked, sometimes we HAVE to start muted then unmute on click
            // But usually User Acceptance of call counts as a gesture.
          }
        };

        remoteVideo.onloadedmetadata = playVideo;
        // Periodic check to ensure it's still playing if it's supposed to be
        const playInterval = setInterval(() => {
          if (remoteVideo.paused && isRemoteVideoActive) {
            playVideo();
          }
        }, 2000);

        return () => {
          clearInterval(playInterval);
          remoteVideo.onloadedmetadata = null;
        }
    }
  }, [status, remoteStream, isRemoteVideoActive]);

  // Listener for track enablement changes (WebRTC specific)
  useEffect(() => {
    if (!remoteStream) return;
    
    // We want to re-evaluate isRemoteVideoActive if tracks change
    const handleTrackEvent = () => {
      console.log("Track event detected (mute/unmute/ended)");
      setDuration(d => d); 
    };

    const tracks = remoteStream.getTracks();
    tracks.forEach(track => {
      track.onmute = handleTrackEvent;
      track.onunmute = handleTrackEvent;
      track.onended = handleTrackEvent;
    });

    return () => {
      tracks.forEach(track => {
        track.onmute = null;
        track.onunmute = null;
        track.onended = null;
      });
    };
  }, [remoteStream]);

  useEffect(() => {
    if (status === "connected" && localStream && localVideoRef.current) {
        if (localVideoRef.current.srcObject !== localStream) {
          localVideoRef.current.srcObject = localStream;
        }
        localVideoRef.current.muted = true;
        localVideoRef.current.play().catch(e => console.error("Local video play failed", e));
    }
  }, [status, localStream, isVideoOff]);

  const toggleMute = () => {
    if (localStream) {
      const current = localStream.getAudioTracks()[0]?.enabled ?? true;
      localStream.getAudioTracks().forEach(track => track.enabled = !current);
      setIsMuted(current);
    }
  };

  const toggleVideo = () => {
    const hasVideo = localStream && localStream.getVideoTracks().length > 0;
    if (onToggleVideo) {
      onToggleVideo(isVideoOff);
      setIsVideoOff(!isVideoOff);
    } else if (localStream && hasVideo) {
      localStream.getVideoTracks().forEach(track => track.enabled = isVideoOff);
      setIsVideoOff(!isVideoOff);
    }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60).toString().padStart(2, "0");
    const secs = (s % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const isRemoteVideoActive = remoteStream && remoteStream.getVideoTracks().some(t => t.enabled && t.readyState !== 'ended');

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#020617] overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none">
         <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/5 opacity-50" />
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,rgba(var(--primary-rgb),0.1)_0%,transparent_70%)] animate-pulse-slow" />
      </div>

      {/* Media Layer */}
      <AnimatePresence>
        {status === "connected" && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-10 w-full h-full bg-black flex items-center justify-center"
          >
            {/* Remote Media (Video or Placeholder for Audio) */}
            <video
              ref={remoteMediaRef}
              autoPlay
              playsInline
              className={`w-full h-full min-w-full min-h-full object-cover transition-opacity duration-300 ${isRemoteVideoActive ? 'opacity-100' : 'opacity-0'}`}
            />
            {!isRemoteVideoActive && (
                 <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 backdrop-blur-2xl z-20">
                    <div className="relative">
                        <div className="w-48 h-48 rounded-full border-2 border-primary/20 flex items-center justify-center animate-pulse-glow">
                             {callerAvatar ? (
                                <img src={callerAvatar} className="w-40 h-40 rounded-full object-cover grayscale opacity-50" alt="" />
                             ) : (
                                <User className="w-20 h-20 text-primary/20" />
                             )}
                        </div>
                        <Volume2 className="absolute -bottom-2 -right-2 w-8 h-8 text-primary animate-bounce" />
                    </div>
                 </div>
            )}

            {/* Local Media (PIP) */}
            <motion.div 
              drag
              dragConstraints={{ left: -300, right: 300, top: -300, bottom: 300 }}
              className="absolute top-8 right-8 w-36 md:w-56 aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-2xl glass-strong z-30 cursor-move active:scale-95 transition-transform"
            >
               <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : 'opacity-100'}`}
              />
              {isVideoOff && (
                 <div className="w-full h-full bg-secondary/30 flex flex-col items-center justify-center gap-2">
                    <VideoOff className="w-6 h-6 text-white/20" />
                    <span className="text-[8px] font-black uppercase tracking-tighter text-white/20">Cam Private</span>
                 </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Functional Interface */}
      <div className="relative z-40 w-full h-full flex flex-col items-center justify-between py-20 px-10">
        
        {/* Top bar */}
        <div className="w-full flex justify-between items-start">
            <div className="flex items-center gap-3 glass-strong px-4 py-2 rounded-2xl border border-white/5">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Secure Mesh Stream</span>
            </div>
            {status === "connected" && (
                <div className="glass-strong px-4 py-2 rounded-2xl border border-white/5 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[10px] font-black text-white font-mono">{formatTime(duration)}</span>
                </div>
            )}
        </div>

        {/* Profile Info (Hidden when video is active) */}
        {!isRemoteVideoActive && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-8"
            >
                <div className="relative">
                    <div className="w-40 h-40 rounded-[3rem] overflow-hidden border-2 border-primary/20 shadow-[0_0_80px_rgba(var(--primary-rgb),0.2)] rotate-3 hover:rotate-0 transition-transform duration-500">
                        {callerAvatar ? (
                            <img src={callerAvatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                <User className="w-20 h-20 text-white/10" />
                            </div>
                        )}
                    </div>
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-4xl font-black text-white tracking-tight">{callerName}</h2>
                    <p className="text-primary font-bold uppercase tracking-[0.3em] text-[11px] h-4">
                        {status === "calling" ? "Initiating Node Link..." : status === "incoming" ? "Inbound Connection" : "Connected"}
                    </p>
                </div>
            </motion.div>
        )}

        {/* Dynamic Controls Container */}
        <div className="w-full max-w-lg flex flex-col items-center gap-12">
            {status === "incoming" ? (
                <div className="flex items-center gap-16">
                    <button onClick={onReject} className="group relative">
                        <div className="absolute inset-0 bg-red-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
                        <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center text-white ring-4 ring-red-500/20 group-hover:scale-110 transition-transform shadow-2xl relative z-10">
                            <PhoneOff className="w-8 h-8" />
                        </div>
                        <p className="text-[10px] font-black text-white/40 mt-4 uppercase tracking-[0.2em]">Decline</p>
                    </button>
                    <button onClick={onAccept} className="group relative">
                        <div className="absolute inset-0 bg-green-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
                        <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center text-white ring-4 ring-green-500/20 group-hover:scale-110 transition-transform shadow-2xl relative z-10 animate-bounce">
                            {callType === 'video' ? <Video className="w-8 h-8" /> : <Phone className="w-8 h-8" />}
                        </div>
                        <p className="text-[10px] font-black text-white/40 mt-4 uppercase tracking-[0.2em]">Accept Link</p>
                    </button>
                </div>
            ) : (
                <div className="glass-strong p-6 rounded-[2.5rem] border border-white/10 flex items-center gap-6 shadow-2xl">
                    <button 
                        onClick={toggleMute}
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isMuted ? "bg-white text-black" : "bg-white/5 text-white hover:bg-white/10"}`}
                    >
                        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>

                    <button 
                        onClick={toggleVideo}
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isVideoOff ? "bg-white/5 text-white/30" : "bg-white/5 text-white hover:bg-white/10"}`}
                    >
                        {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                    </button>

                    <div className="w-[1px] h-8 bg-white/10 mx-2" />

                    <button 
                        onClick={onEnd}
                        className="w-16 h-16 rounded-3xl bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-red-500/30"
                    >
                        <PhoneOff className="w-7 h-7" />
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default CallOverlay;
