import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Check, CheckCheck } from 'lucide-react';
import VoiceMessagePlayer from './VoiceMessagePlayer';

interface MessageBubbleProps {
  content: string;
  messageType: 'text' | 'voice';
  audioUrl?: string | null;
  audioDuration?: number | null;
  timestamp: string;
  isOwn: boolean;
  isRead: boolean;
}

const MessageBubble = ({
  content,
  messageType,
  audioUrl,
  audioDuration,
  timestamp,
  isOwn,
  isRead
}: MessageBubbleProps) => {
  return (
    <div className={cn("flex", isOwn ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2 shadow-sm",
          isOwn
            ? "bg-primary text-primary-foreground rounded-tl-sm"
            : "bg-muted rounded-tr-sm"
        )}
      >
        {messageType === 'voice' && audioUrl ? (
          <VoiceMessagePlayer 
            audioUrl={audioUrl} 
            duration={audioDuration || 0}
            isOwn={isOwn}
          />
        ) : (
          <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        )}
        
        <div className={cn(
          "flex items-center gap-1 mt-1",
          isOwn ? "justify-start" : "justify-end"
        )}>
          <span className={cn(
            "text-[10px]",
            isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            {format(new Date(timestamp), 'HH:mm', { locale: ar })}
          </span>
          {isOwn && (
            isRead ? (
              <CheckCheck className="h-3 w-3 text-primary-foreground/70" />
            ) : (
              <Check className="h-3 w-3 text-primary-foreground/70" />
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
