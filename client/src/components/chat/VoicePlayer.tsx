import { useState, useRef, useEffect } from "react";
import { Play, Pause, Mic, Volume2 } from "lucide-react";
import { motion } from "framer-motion";

interface VoicePlayerProps {
  src: string;
  isOwn: boolean;
}

const VoicePlayer = ({ src, isOwn }: VoicePlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => setDuration(audio.duration || 0);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(e => console.error("Voice playback failed", e));
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const bar = progressRef.current;
    if (!audio || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  };

  const fmt = (s: number) => {
    if (!isFinite(s) || s < 0) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Generate responsive waveform bars
  const bars = 36;
  const waveform = Array.from({ length: bars }, (_, i) => {
    const seed = (i * 13 + src.length * 7 + i * i) % 100;
    return 30 + (seed % 60); 
  });

  return (
    <div className={`flex items-center gap-4 min-w-[260px] p-3 rounded-2xl transition-all duration-300 ${
      isOwn ? "bg-white/5" : "bg-black/20"
    } border border-white/5`}>
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={togglePlay}
        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all shadow-xl relative overflow-hidden ${
          isOwn
            ? "bg-white text-primary"
            : "bg-primary text-white"
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50" />
        {isPlaying ? (
          <Pause className="w-5 h-5 relative z-10" fill="currentColor" />
        ) : (
          <Play className="w-5 h-5 ml-1 relative z-10" fill="currentColor" />
        )}
      </motion.button>

      {/* Waveform + Information */}
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
             <div className="flex items-center gap-1.5">
                <Mic className={`w-3 h-3 ${isOwn ? "text-white/40" : "text-primary/60"}`} />
                <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isOwn ? "text-white/40" : "text-primary/60"}`}>
                    VOICE_MESSAGE
                </span>
             </div>
             <span className={`text-[10px] font-mono font-black tabular-nums ${isOwn ? "text-white/60" : "text-primary/80"}`}>
                {fmt(currentTime)} / {fmt(duration)}
             </span>
        </div>

        <div
          ref={progressRef}
          onClick={handleSeek}
          className="relative flex items-center gap-[3px] h-8 cursor-pointer group"
        >
          {waveform.map((h, i) => {
            const barProgress = (i / bars) * 100;
            const isActive = barProgress < progress;
            return (
              <motion.div
                key={i}
                initial={{ height: "30%" }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.5, delay: i * 0.01 }}
                className={`flex-1 rounded-full transition-all duration-300 ${
                  isActive
                    ? isOwn
                      ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                      : "bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]"
                    : isOwn
                      ? "bg-white/10"
                      : "bg-white/5"
                }`}
                style={{ minWidth: "3px" }}
              />
            );
          })}
          
          {/* Progress Overlay Glow */}
          <div 
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default VoicePlayer;
