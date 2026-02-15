import { memo } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Check, CheckCheck, FileIcon, Image as ImageIcon, FileText, Download } from 'lucide-react';
import VoiceMessagePlayer from './VoiceMessagePlayer';
import MessageActions from './MessageActions';

interface MessageBubbleProps {
  id: string;
  content: string;
  messageType: 'text' | 'voice' | 'attachment';
  audioUrl?: string | null;
  audioDuration?: number | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  timestamp: string;
  isOwn: boolean;
  isRead: boolean;
  isDeleted?: boolean;
  onUpdate?: () => void;
}

const MessageBubble = ({
  id,
  content,
  messageType,
  audioUrl,
  audioDuration,
  attachmentUrl,
  attachmentName,
  attachmentType,
  timestamp,
  isOwn,
  isRead,
  isDeleted = false,
  onUpdate
}: MessageBubbleProps) => {
  const renderAttachment = () => {
    if (!attachmentUrl) return null;

    const isImage = attachmentType === 'image';
    
    if (isImage) {
      return (
        <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="block">
          <img 
            src={attachmentUrl} 
            alt={attachmentName || 'صورة'} 
            className="max-w-full rounded-lg max-h-64 object-cover"
          />
        </a>
      );
    }

    const getIcon = () => {
      if (attachmentType === 'pdf') return <FileText className="h-8 w-8" />;
      if (attachmentType === 'document') return <FileIcon className="h-8 w-8" />;
      return <FileIcon className="h-8 w-8" />;
    };

    return (
      <a 
        href={attachmentUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg",
          isOwn ? "bg-primary-foreground/10" : "bg-background"
        )}
      >
        <div className={cn(
          "shrink-0",
          isOwn ? "text-primary-foreground" : "text-primary"
        )}>
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-medium truncate",
            isOwn ? "text-primary-foreground" : "text-foreground"
          )}>
            {attachmentName || 'ملف'}
          </p>
          <p className={cn(
            "text-xs",
            isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            اضغط للتحميل
          </p>
        </div>
        <Download className={cn(
          "h-4 w-4 shrink-0",
          isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
        )} />
      </a>
    );
  };

  // Render deleted message placeholder
  if (isDeleted) {
    return (
      <div className={cn("flex group", isOwn ? "justify-start" : "justify-end")}>
        <div className="flex items-start gap-1">
          <div
            className={cn(
              "max-w-[85%] sm:max-w-[75%] rounded-2xl px-3 py-2 sm:px-4 shadow-sm",
              isOwn
                ? "bg-muted text-muted-foreground rounded-tl-sm"
                : "bg-muted text-muted-foreground rounded-tr-sm"
            )}
          >
            <p className="text-sm italic">🚫 تم حذف هذه الرسالة</p>
            <div className={cn(
              "flex items-center gap-1 mt-1",
              isOwn ? "justify-start" : "justify-end"
            )}>
              <span className="text-[10px] text-muted-foreground">
                {format(new Date(timestamp), 'HH:mm', { locale: ar })}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex group", isOwn ? "justify-start" : "justify-end")}>
      <div className="flex items-start gap-1">
        {isOwn && onUpdate && (
          <MessageActions
            messageId={id}
            content={content}
            messageType={messageType}
            onUpdate={onUpdate}
          />
        )}
        <div
          className={cn(
            "max-w-[85%] sm:max-w-[75%] rounded-2xl px-3 py-2 sm:px-4 shadow-sm",
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
          ) : messageType === 'attachment' ? (
            renderAttachment()
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
    </div>
  );
};

export default memo(MessageBubble);
