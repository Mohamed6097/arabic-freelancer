-- Add phone_number to profiles table
ALTER TABLE public.profiles ADD COLUMN phone_number text;

-- Add attachment columns to messages table
ALTER TABLE public.messages ADD COLUMN attachment_url text;
ALTER TABLE public.messages ADD COLUMN attachment_name text;
ALTER TABLE public.messages ADD COLUMN attachment_type text;

-- Create attachments storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for viewing attachments
CREATE POLICY "Anyone can view message attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'message-attachments');

-- Create payment_receipts table
CREATE TABLE public.payment_receipts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  receipt_url text NOT NULL,
  receipt_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on payment_receipts
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;

-- Users can view their own receipts
CREATE POLICY "Users can view their own receipts"
ON public.payment_receipts FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own receipts
CREATE POLICY "Users can insert their own receipts"
ON public.payment_receipts FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create receipts storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Create policy for users to upload their own receipts
CREATE POLICY "Users can upload their own receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy for users to view their own receipts
CREATE POLICY "Users can view their own receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);