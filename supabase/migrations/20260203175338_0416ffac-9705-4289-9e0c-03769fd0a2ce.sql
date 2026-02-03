-- Add is_deleted column for soft delete functionality
ALTER TABLE public.messages ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;