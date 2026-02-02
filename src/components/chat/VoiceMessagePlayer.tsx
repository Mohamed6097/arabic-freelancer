import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceMessagePlayerProps {
  audioUrl: string;
  duration: number;
  isOwn: boolean;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const VoiceMessagePlayer = ({ audioUrl, duration, isOwn }: VoiceMessagePlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      setAudioDuration(Math.floor(audio.duration));
    });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(Math.floor(audio.currentTime));
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={togglePlay}
        className={cn(
          "h-8 w-8 rounded-full",
          isOwn ? "hover:bg-primary-foreground/20" : "hover:bg-muted"
        )}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      <div className="flex-1 flex flex-col gap-1">
        <div className={cn(
          "h-1 rounded-full overflow-hidden",
          isOwn ? "bg-primary-foreground/30" : "bg-muted-foreground/30"
        )}>
          <div
            className={cn(
              "h-full transition-all duration-100",
              isOwn ? "bg-primary-foreground" : "bg-primary"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className={cn(
          "text-xs",
          isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          {isPlaying ? formatDuration(currentTime) : formatDuration(audioDuration || duration)}
        </span>
      </div>
    </div>
  );
};

export default VoiceMessagePlayer;
