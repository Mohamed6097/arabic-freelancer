import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Phone, Video, ArrowRight, CheckCircle2, Loader2, Shield } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ChatHeaderProps {
  name: string;
  avatar: string | null;
  onBack?: () => void;
  onVoiceCall: () => void;
  onVideoCall: () => void;
  showCompleteButton?: boolean;
  hasConfirmedComplete?: boolean;
  otherPartyConfirmed?: boolean;
  onConfirmComplete?: () => Promise<void>;
  isProjectCompleted?: boolean;
}

const ChatHeader = ({ 
  name, 
  avatar, 
  onBack, 
  onVoiceCall, 
  onVideoCall,
  showCompleteButton = false,
  hasConfirmedComplete = false,
  otherPartyConfirmed = false,
  onConfirmComplete,
  isProjectCompleted = false,
}: ChatHeaderProps) => {
  const [confirming, setConfirming] = useState(false);

  const handleConfirmComplete = async () => {
    if (!onConfirmComplete) return;
    setConfirming(true);
    try {
      await onConfirmComplete();
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-2 sm:p-4 border-b bg-card">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="lg:hidden h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
            <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        )}
        <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
          <AvatarImage src={avatar || ''} />
          <AvatarFallback>{name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-semibold text-sm sm:text-base truncate">{name}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            {isProjectCompleted ? 'مشروع مكتمل ✓' : 'متصل'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        {showCompleteButton && !isProjectCompleted && (
          <Tooltip>
            <TooltipTrigger asChild>
              {hasConfirmedComplete ? (
                <Button 
                  variant="ghost" 
                  size="icon"
                  disabled
                  className={cn(
                    "h-8 w-8 sm:h-10 sm:w-10 text-green-600 bg-green-50 dark:bg-green-950/30",
                    otherPartyConfirmed && "animate-pulse"
                  )}
                >
                  <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className={cn(
                        "h-8 w-8 sm:h-10 sm:w-10 border-2 border-dashed border-green-400 rounded-full",
                        otherPartyConfirmed && "text-green-600 animate-pulse bg-green-50 dark:bg-green-950/30 border-solid"
                      )}
                    >
                      {confirming ? (
                        <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent dir="rtl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>تأكيد إتمام المشروع</AlertDialogTitle>
                      <AlertDialogDescription>
                        {otherPartyConfirmed 
                          ? 'الطرف الآخر أكد إتمام المشروع. هل تريد تأكيد الإتمام أيضاً؟ سيتم تحويل المشروع إلى "مكتمل".'
                          : 'هل أنت متأكد من إتمام هذا المشروع؟ سيتم إشعار الطرف الآخر للتأكيد.'
                        }
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-row-reverse gap-2">
                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleConfirmComplete}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        تأكيد الإتمام
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </TooltipTrigger>
            <TooltipContent>
              {hasConfirmedComplete 
                ? otherPartyConfirmed 
                  ? 'في انتظار تأكيد الطرف الآخر...'
                  : 'تم تأكيد الإتمام - في انتظار الطرف الآخر'
                : otherPartyConfirmed
                  ? 'الطرف الآخر أكد الإتمام - اضغط للتأكيد'
                  : 'تأكيد إتمام المشروع'
              }
            </TooltipContent>
          </Tooltip>
        )}
        
        {isProjectCompleted && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                <Shield className="h-4 w-4" />
                مكتمل
              </div>
            </TooltipTrigger>
            <TooltipContent>تم إتمام المشروع بنجاح</TooltipContent>
          </Tooltip>
        )}
        
        <Button variant="ghost" size="icon" onClick={onVoiceCall} className="h-8 w-8 sm:h-10 sm:w-10">
          <Phone className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onVideoCall} className="h-8 w-8 sm:h-10 sm:w-10">
          <Video className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>
    </div>
  );
};

export default ChatHeader;
