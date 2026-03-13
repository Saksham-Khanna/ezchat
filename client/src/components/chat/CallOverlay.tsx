import { useState, useEffect, useRef } from "react";
import { Phone, PhoneOff, Mic, MicOff, User, Video, VideoOff } from "lucide-react";

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
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

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

  useEffect(() => {
    if (status === "connected") {
      const hasRemoteVideo = remoteStream && remoteStream.getVideoTracks().length > 0;
      if (hasRemoteVideo && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch(e => console.error("Remote video play failed", e));
      } else if (remoteAudioRef.current && remoteStream && remoteStream.getAudioTracks().length > 0) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(e => console.error("Remote audio play failed", e));
      }
    }
  }, [status, remoteStream]);

  useEffect(() => {
    const hasLocalVideo = localStream && localStream.getVideoTracks().length > 0;
    if (status === "connected" && hasLocalVideo && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(e => console.error("Local video play failed", e));
    }
  }, [status, localStream]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    const currentlyHasVideo = localStream && localStream.getVideoTracks().length > 0;
    if (onToggleVideo) {
      onToggleVideo(!currentlyHasVideo || isVideoOff);
      setIsVideoOff(!isVideoOff);
    } else if (localStream && currentlyHasVideo) {
      localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
      setIsVideoOff(!isVideoOff);
    }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60).toString().padStart(2, "0");
    const secs = (s % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const showVideoLayout = status === "connected" && (
    (localStream && localStream.getVideoTracks().length > 0 && !isVideoOff) || 
    (remoteStream && remoteStream.getVideoTracks().length > 0)
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black animate-fade-in overflow-hidden">
      {/* Hidden Audio for Audio/Hybrid Calls */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* Background/Video Area */}
      {showVideoLayout ? (
        <div className="absolute inset-0 w-full h-full bg-black">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute top-6 right-6 w-32 md:w-48 aspect-video rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl glass z-10">
             <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
            />
            {isVideoOff && (
               <div className="w-full h-full bg-secondary/50 flex items-center justify-center">
                  <User className="w-10 h-10 text-white/30" />
               </div>
            )}
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-zinc-950" />
      )}

      {/* Main Content Overlay */}
      <div className={`relative z-20 flex flex-col items-center justify-between h-full py-16 px-8 transition-all duration-500 ${showVideoLayout ? "bg-gradient-to-t from-black/80 via-transparent to-black/40 w-full" : ""}`}>
        
        {/* Profile Info */}
        <div className={`flex flex-col items-center gap-6 transition-all duration-500 ${showVideoLayout ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"}`}>
          <div className="relative">
            <div className={`w-32 h-32 rounded-full overflow-hidden border-4 border-primary/20 shadow-[0_0_50px_rgba(var(--primary-rgb),0.3)] ${status === 'calling' || status === 'incoming' ? 'animate-pulse' : ''}`}>
              {callerAvatar ? (
                <img src={callerAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-secondary/50 flex items-center justify-center">
                  <User className="w-16 h-16 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white drop-shadow-md">{callerName}</h2>
            <p className="text-primary-foreground font-medium mt-2 flex items-center justify-center gap-2">
              {status === "calling" ? "Ringing..." : status === "incoming" ? (callType === 'video' ? "Incoming Video Call" : "Incoming Voice Call") : formatTime(duration)}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col items-center gap-10 w-full">
           {status === "incoming" ? (
             <div className="flex items-center gap-12">
                <button 
                  onClick={onReject}
                  className="group flex flex-col items-center gap-3"
                >
                  <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white group-hover:bg-red-600 transition-all group-hover:scale-110 shadow-lg shadow-red-500/30">
                    <PhoneOff className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-medium text-white/70">Decline</span>
                </button>
                <button 
                  onClick={onAccept}
                  className="group flex flex-col items-center gap-3"
                >
                  <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white group-hover:bg-green-600 transition-all group-hover:scale-110 shadow-lg shadow-green-500/30 animate-bounce">
                    {callType === 'video' ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
                  </div>
                  <span className="text-xs font-medium text-white/70 tracking-wide">Accept</span>
                </button>
             </div>
           ) : (
             <div className="flex items-center gap-6 md:gap-8">
                <button 
                  onClick={toggleMute}
                  className={`flex flex-col items-center gap-2 group`}
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all border-2 border-white/10 ${isMuted ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20"}`}>
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </div>
                  <span className="text-[10px] text-white/50">{isMuted ? "Unmute" : "Mute"}</span>
                </button>

                <button 
                  onClick={toggleVideo}
                  className={`flex flex-col items-center gap-2 group`}
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all border-2 border-white/10 ${isVideoOff || callType === 'audio' && !localStream?.getVideoTracks().length ? "bg-white/10 text-white hover:bg-white/20" : isVideoOff ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20"}`}>
                    {isVideoOff || (callType === 'audio' && (!localStream || !localStream.getVideoTracks().length)) ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                  </div>
                  <span className="text-[10px] text-white/50">{isVideoOff ? "Cam On" : "Cam Off"}</span>
                </button>
                
                <button 
                  onClick={onEnd}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-all hover:scale-110 shadow-lg shadow-red-500/40">
                    <PhoneOff className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] text-white/50">End Call</span>
                </button>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default CallOverlay;
