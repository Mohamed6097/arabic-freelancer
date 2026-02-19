import { Trophy, Linkedin, X, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface CompletionCelebrationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectTitle: string;
  completedCount: number; // how many projects completed so far
  onOpenReview: () => void;
}

const getOrdinal = (n: number): string => {
  if (n === 1) return 'الأول';
  if (n === 2) return 'الثاني';
  if (n === 3) return 'الثالث';
  if (n === 4) return 'الرابع';
  if (n === 5) return 'الخامس';
  return `رقم ${n}`;
};

const CompletionCelebration = ({
  open,
  onOpenChange,
  projectTitle,
  completedCount,
  onOpenReview,
}: CompletionCelebrationProps) => {
  const ordinal = getOrdinal(completedCount);

  const linkedInText = encodeURIComponent(
    `🎉 أتممت مشروعي ${ordinal} "${projectTitle}" على منصة تاسكاتي!\n\n` +
    `سعيد بإنجاز ${completedCount} مشروع على المنصة. شكراً لثقة العملاء! 🚀\n\n` +
    `#تاسكاتي #عمل_حر #إنجاز #freelance`
  );

  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://arabic-freelancer.lovable.app')}&summary=${linkedInText}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-md overflow-hidden">
        {/* Celebration background */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 via-background to-green-50 dark:from-yellow-950/20 dark:via-background dark:to-green-950/20" />
        
        <div className="relative">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl flex items-center justify-center gap-2">
              <Sparkles className="h-6 w-6 text-yellow-500" />
              تهانينا! 🎉
              <Sparkles className="h-6 w-6 text-yellow-500" />
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-6">
            {/* Trophy icon */}
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg">
                <Trophy className="h-10 w-10 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 h-8 w-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm shadow">
                {completedCount}
              </div>
            </div>

            <div className="text-center space-y-2">
              <p className="text-lg font-semibold">
                أتممت مشروعك {ordinal} بنجاح!
              </p>
              <p className="text-sm text-muted-foreground">
                "{projectTitle}"
              </p>
              <p className="text-sm text-muted-foreground">
                استمر في العمل الرائع! 💪
              </p>
            </div>

            {/* Share on LinkedIn */}
            <Button
              className="w-full bg-[#0077B5] hover:bg-[#006097] text-white gap-2"
              onClick={() => window.open(linkedInUrl, '_blank')}
            >
              <Linkedin className="h-5 w-5" />
              شارك إنجازك على LinkedIn
            </Button>

            {/* Open review */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                onOpenChange(false);
                onOpenReview();
              }}
            >
              ⭐ قيّم تجربتك
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => onOpenChange(false)}
            >
              إغلاق
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompletionCelebration;
