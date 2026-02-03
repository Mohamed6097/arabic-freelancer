import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { MoreVertical, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MessageActionsProps {
  messageId: string;
  content: string;
  messageType: string;
  onUpdate: () => void;
}

const MessageActions = ({ messageId, content, messageType, onUpdate }: MessageActionsProps) => {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleEdit = async () => {
    if (!editedContent.trim()) return;
    
    setLoading(true);
    const { error } = await supabase
      .from('messages')
      .update({ content: editedContent.trim() })
      .eq('id', messageId);

    setLoading(false);

    if (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تعديل الرسالة',
        variant: 'destructive',
      });
      return;
    }

    toast({ title: 'تم تعديل الرسالة' });
    setShowEditDialog(false);
    onUpdate();
  };

  const handleDelete = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    setLoading(false);

    if (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حذف الرسالة',
        variant: 'destructive',
      });
      return;
    }

    toast({ title: 'تم حذف الرسالة' });
    setShowDeleteDialog(false);
    onUpdate();
  };

  // Only allow editing text messages
  const canEdit = messageType === 'text';

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreVertical className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canEdit && (
            <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
              <Edit className="h-4 w-4 ml-2" />
              تعديل
            </DropdownMenuItem>
          )}
          <DropdownMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 ml-2" />
            حذف
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل الرسالة</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleEdit} disabled={loading}>
              {loading ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>حذف الرسالة</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف هذه الرسالة؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? 'جاري الحذف...' : 'حذف'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MessageActions;
