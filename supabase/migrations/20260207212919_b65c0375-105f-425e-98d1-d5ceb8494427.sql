-- Add attachment columns to projects table for job posting attachments
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS attachment_url text,
ADD COLUMN IF NOT EXISTS attachment_name text;