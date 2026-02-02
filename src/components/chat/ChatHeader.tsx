import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Phone, Video, ArrowRight } from 'lucide-react';

interface ChatHeaderProps {
  name: string;
  avatar: string | null;
  onBack?: () => void;
  onVoiceCall: () => void;
  onVideoCall: () => void;
}

const ChatHeader = ({ name, avatar, onBack, onVoiceCall, onVideoCall }: ChatHeaderProps) => {
  return (
    <div className="flex items-center justify-between p-4 border-b bg-card">
      <div className="flex items-center gap-3">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="lg:hidden">
            <ArrowRight className="h-5 w-5" />
          </Button>
        )}
        <Avatar className="h-10 w-10">
          <AvatarImage src={avatar || ''} />
          <AvatarFallback>{name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground">متصل</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onVoiceCall}>
          <Phone className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onVideoCall}>
          <Video className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default ChatHeader;
