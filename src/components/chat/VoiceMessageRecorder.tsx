import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Send, X } from 'lucide-react';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { cn } from '@/lib/utils';

interface VoiceMessageRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => void;
  disabled?: boolean;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const VoiceMessageRecorder = ({ onSend, disabled }: VoiceMessageRecorderProps) => {
  const { isRecording, recordingDuration, startRecording, stopRecording, cancelRecording } = useVoiceRecorder();
  const [showRecorder, setShowRecorder] = useState(false);

  const handleStartRecording = async () => {
    try {
      await startRecording();
      setShowRecorder(true);
    } catch (error) {
      console.error('Could not start recording:', error);
    }
  };

  const handleStopAndSend = async () => {
    const blob = await stopRecording();
    if (blob) {
      onSend(blob, recordingDuration);
    }
    setShowRecorder(false);
  };

  const handleCancel = () => {
    cancelRecording();
    setShowRecorder(false);
  };

  if (showRecorder && isRecording) {
    return (
      <div className="flex items-center gap-2 bg-destructive/10 rounded-lg px-3 py-2 flex-1">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleCancel}
          className="h-8 w-8 text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center gap-2 flex-1">
          <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
          <span className="text-sm font-medium text-destructive">
            {formatDuration(recordingDuration)}
          </span>
          <div className="flex-1 h-1 bg-destructive/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-destructive animate-pulse"
              style={{ width: `${Math.min((recordingDuration / 60) * 100, 100)}%` }}
            />
          </div>
        </div>

        <Button
          type="button"
          size="icon"
          onClick={handleStopAndSend}
          className="h-8 w-8 bg-primary"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      onClick={handleStartRecording}
      disabled={disabled}
      className={cn("h-10 w-10", isRecording && "text-destructive")}
    >
      <Mic className="h-5 w-5" />
    </Button>
  );
};

export default VoiceMessageRecorder;
