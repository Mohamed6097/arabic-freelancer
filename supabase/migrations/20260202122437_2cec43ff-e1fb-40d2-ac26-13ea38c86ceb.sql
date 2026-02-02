-- Add message_type column to messages table for voice messages
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text',
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS audio_duration INTEGER;

-- Create call_logs table for tracking voice/video calls
CREATE TABLE public.call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL CHECK (call_type IN ('voice', 'video')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ringing', 'ongoing', 'ended', 'missed', 'rejected')),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on call_logs
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own calls
CREATE POLICY "Users can view their own calls"
ON public.call_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE (profiles.id = call_logs.caller_id OR profiles.id = call_logs.receiver_id)
    AND profiles.user_id = auth.uid()
  )
);

-- Users can create calls
CREATE POLICY "Users can create calls"
ON public.call_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = call_logs.caller_id
    AND profiles.user_id = auth.uid()
  )
);

-- Users can update their calls
CREATE POLICY "Users can update their calls"
ON public.call_logs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE (profiles.id = call_logs.caller_id OR profiles.id = call_logs.receiver_id)
    AND profiles.user_id = auth.uid()
  )
);

-- Create storage bucket for voice messages
INSERT INTO storage.buckets (id, name, public) VALUES ('voice-messages', 'voice-messages', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload voice messages
CREATE POLICY "Users can upload voice messages"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'voice-messages' AND auth.uid() IS NOT NULL);

-- Allow public read access to voice messages
CREATE POLICY "Public can read voice messages"
ON storage.objects
FOR SELECT
USING (bucket_id = 'voice-messages');

-- Enable realtime for call_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_logs;