import { supabase } from '@/integrations/supabase/client';

export type MessageEmailNotificationParams = {
  receiverId: string;
  senderName: string;
  messagePreview: string;
};

export async function sendMessageEmailNotification(params: MessageEmailNotificationParams): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase.functions.invoke('send-message-notification', {
    body: params,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  if (data && typeof data === 'object' && 'error' in (data as any) && (data as any).error) {
    return { ok: false, error: String((data as any).error) };
  }

  return { ok: true };
}
