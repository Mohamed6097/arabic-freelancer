-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

-- Create a more secure insert policy - only authenticated users can receive notifications
-- Edge functions use service role which bypasses RLS anyway
CREATE POLICY "Authenticated users can receive notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = notifications.user_id
  )
);