import { useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff,
  Phone
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CallScreenProps {
  isOpen: boolean;
  callType: 'voice' | 'video';
  callStatus: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';
  remoteName: string;
  remoteAvatar: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  onEndCall: () => void;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
}

const formatCallDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const CallScreen = ({
  isOpen,
  callType,
  callStatus,
  remoteName,
  remoteAvatar,
  localStream,
  remoteStream,
  isAudioMuted,
  isVideoMuted,
  onEndCall,
  onToggleAudio,
  onToggleVideo
}: CallScreenProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  if (!isOpen) return null;

  const getStatusText = () => {
    switch (callStatus) {
      case 'calling':
        return 'جاري الاتصال...';
      case 'ringing':
        return 'يرن...';
      case 'connected':
        return formatCallDuration(callDuration);
      case 'ended':
        return 'انتهت المكالمة';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col" dir="rtl">
      {/* Video area */}
      {callType === 'video' ? (
        <div className="flex-1 relative bg-black">
          {/* Remote video (full screen) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          
          {/* If no remote video, show avatar */}
          {!remoteStream && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <Avatar className="h-32 w-32">
                <AvatarImage src={remoteAvatar || ''} />
                <AvatarFallback className="text-4xl">{remoteName.charAt(0)}</AvatarFallback>
              </Avatar>
            </div>
          )}

          {/* Local video (small, corner) */}
          <div className="absolute top-4 left-4 w-32 h-44 rounded-lg overflow-hidden bg-muted shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={cn(
                "w-full h-full object-cover",
                isVideoMuted && "hidden"
              )}
            />
            {isVideoMuted && (
              <div className="w-full h-full flex items-center justify-center">
                <VideoOff className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Status overlay */}
          <div className="absolute top-4 right-4 bg-background/80 rounded-lg px-4 py-2">
            <p className="font-medium">{remoteName}</p>
            <p className="text-sm text-muted-foreground">{getStatusText()}</p>
          </div>
        </div>
      ) : (
        /* Voice call screen */
        <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-primary/20 to-background">
          <Avatar className="h-32 w-32 mb-6 ring-4 ring-primary/20">
            <AvatarImage src={remoteAvatar || ''} />
            <AvatarFallback className="text-4xl">{remoteName.charAt(0)}</AvatarFallback>
          </Avatar>
          <h2 className="text-2xl font-bold mb-2">{remoteName}</h2>
          <p className="text-muted-foreground">{getStatusText()}</p>
          
          {callStatus === 'connected' && (
            <div className="mt-8 flex items-center gap-2">
              <Phone className="h-5 w-5 text-green-500 animate-pulse" />
              <span className="text-green-500">متصل</span>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="bg-background border-t p-6">
        <div className="flex items-center justify-center gap-6">
          <Button
            size="lg"
            variant="outline"
            className={cn(
              "rounded-full h-14 w-14",
              isAudioMuted && "bg-destructive text-destructive-foreground"
            )}
            onClick={onToggleAudio}
          >
            {isAudioMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>

          {callType === 'video' && (
            <Button
              size="lg"
              variant="outline"
              className={cn(
                "rounded-full h-14 w-14",
                isVideoMuted && "bg-destructive text-destructive-foreground"
              )}
              onClick={onToggleVideo}
            >
              {isVideoMuted ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
            </Button>
          )}

          <Button
            size="lg"
            variant="destructive"
            className="rounded-full h-16 w-16"
            onClick={onEndCall}
          >
            <PhoneOff className="h-7 w-7" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CallScreen;
