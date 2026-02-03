-- Add policy for users to delete their own messages
CREATE POLICY "Users can delete their own messages" 
ON public.messages 
FOR DELETE 
USING (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = messages.sender_id) AND (profiles.user_id = auth.uid()))));

-- Add policy for users to update their own messages
CREATE POLICY "Users can update their own messages" 
ON public.messages 
FOR UPDATE 
USING (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = messages.sender_id) AND (profiles.user_id = auth.uid()))));