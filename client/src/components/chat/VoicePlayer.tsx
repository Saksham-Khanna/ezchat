import { useState, useRef, useEffect } from "react";
import { Play, Pause, Mic } from "lucide-react";

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
      audio.play();
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

  // Generate static waveform bars (deterministic from src hash)
  const bars = 28;
  const waveform = Array.from({ length: bars }, (_, i) => {
    const seed = (i * 7 + src.length * 3 + i * i) % 100;
    return 20 + (seed % 60); // height between 20% and 80%
  });

  return (
    <div className="flex items-center gap-2.5 min-w-[220px]">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95 ${
          isOwn
            ? "bg-white/20 hover:bg-white/30 text-white"
            : "bg-primary/15 hover:bg-primary/25 text-primary"
        }`}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" fill="currentColor" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
        )}
      </button>

      {/* Waveform + progress */}
      <div className="flex-1 flex flex-col gap-1">
        <div
          ref={progressRef}
          onClick={handleSeek}
          className="relative flex items-end gap-[2px] h-6 cursor-pointer group"
        >
          {waveform.map((h, i) => {
            const barProgress = (i / bars) * 100;
            const isActive = barProgress < progress;
            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-colors duration-150 ${
                  isActive
                    ? isOwn
                      ? "bg-white/90"
                      : "bg-primary"
                    : isOwn
                      ? "bg-white/25"
                      : "bg-primary/25"
                }`}
                style={{ height: `${h}%`, minWidth: "2px" }}
              />
            );
          })}
        </div>

        {/* Time */}
        <div className="flex items-center justify-between">
          <span
            className={`text-[10px] font-mono tabular-nums ${
              isOwn ? "text-white/60" : "text-muted-foreground"
            }`}
          >
            {isPlaying || currentTime > 0 ? fmt(currentTime) : fmt(duration)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default VoicePlayer;
