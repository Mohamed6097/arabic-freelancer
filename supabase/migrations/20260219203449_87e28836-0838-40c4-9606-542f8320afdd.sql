
-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id),
  reviewee_id UUID NOT NULL REFERENCES public.profiles(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: one review per reviewer per project
ALTER TABLE public.reviews ADD CONSTRAINT unique_review_per_project UNIQUE (project_id, reviewer_id);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Everyone can view reviews (public reputation)
CREATE POLICY "Reviews are viewable by everyone"
ON public.reviews FOR SELECT
USING (true);

-- Only participants can create reviews for completed projects
CREATE POLICY "Project participants can create reviews"
ON public.reviews FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = reviews.reviewer_id AND profiles.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM projects WHERE projects.id = reviews.project_id AND projects.status = 'completed'
  )
);

-- Users can update their own reviews
CREATE POLICY "Users can update their own reviews"
ON public.reviews FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = reviews.reviewer_id AND profiles.user_id = auth.uid()
  )
);

-- Add completed_projects_count to profiles for tracking milestones
ALTER TABLE public.profiles ADD COLUMN completed_projects_count INTEGER NOT NULL DEFAULT 0;
