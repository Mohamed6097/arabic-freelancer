import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { sendMessageEmailNotification } from '@/lib/messageEmailNotification';

interface AttachmentButtonProps {
  profileId: string;
  senderName: string;
  receiverId: string;
  onSent: () => void;
  disabled?: boolean;
}

const AttachmentButton = ({ profileId, senderName, receiverId, onSent, disabled }: AttachmentButtonProps) => {
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'خطأ',
        description: 'حجم الملف يجب أن يكون أقل من 10 ميجابايت',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      // Upload file - use userId for folder to match RLS policy
      const fileName = `${userId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(fileName);

      // Determine file type
      let fileType = 'file';
      if (file.type.startsWith('image/')) fileType = 'image';
      else if (file.type === 'application/pdf') fileType = 'pdf';
      else if (file.type.includes('document') || file.type.includes('word')) fileType = 'document';

      // Insert message with attachment
      const messagePreview = `📎 ${file.name}`;
      const { error: insertError } = await supabase.from('messages').insert({
        sender_id: profileId,
        receiver_id: receiverId,
        content: messagePreview,
        message_type: 'attachment',
        attachment_url: urlData.publicUrl,
        attachment_name: file.name,
        attachment_type: fileType,
      });

      if (insertError) throw insertError;

      const notifyResult = await sendMessageEmailNotification({
        receiverId,
        senderName,
        messagePreview,
      });

      if (notifyResult.ok === false) {
        // Silently log error - don't show toast since message was sent successfully
        console.error('Failed to send email notification:', notifyResult.error);
      }

      onSent();

      toast({
        title: 'تم إرسال الملف',
        description: file.name,
      });

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'خطأ في الإرسال',
        description: error.message || 'حدث خطأ أثناء رفع الملف',
        variant: 'destructive',
      });
    }

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled || uploading}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Paperclip className="h-4 w-4" />
        )}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
      />
    </>
  );
};

export default AttachmentButton;
