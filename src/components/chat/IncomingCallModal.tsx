import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface IncomingCallModalProps {
  isOpen: boolean;
  callerName: string;
  callerAvatar: string | null;
  callType: 'voice' | 'video';
  onAnswer: () => void;
  onReject: () => void;
}

const IncomingCallModal = ({
  isOpen,
  callerName,
  callerAvatar,
  callType,
  onAnswer,
  onReject
}: IncomingCallModalProps) => {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <div className="flex flex-col items-center py-6 space-y-6">
          <div className="relative">
            <Avatar className="h-24 w-24 ring-4 ring-primary/20 animate-pulse">
              <AvatarImage src={callerAvatar || ''} />
              <AvatarFallback className="text-2xl">{callerName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-2">
              {callType === 'video' ? (
                <Video className="h-4 w-4" />
              ) : (
                <Phone className="h-4 w-4" />
              )}
            </div>
          </div>

          <div className="text-center space-y-1">
            <h3 className="text-lg font-semibold">{callerName}</h3>
            <p className="text-muted-foreground">
              {callType === 'video' ? 'مكالمة فيديو واردة...' : 'مكالمة صوتية واردة...'}
            </p>
          </div>

          <div className="flex items-center gap-6">
            <Button
              size="lg"
              variant="destructive"
              className="rounded-full h-14 w-14"
              onClick={onReject}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
            <Button
              size="lg"
              className="rounded-full h-14 w-14 bg-green-500 hover:bg-green-600"
              onClick={onAnswer}
            >
              <Phone className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IncomingCallModal;
