
-- Allow freelancers with accepted proposals to confirm project completion
CREATE POLICY "Freelancers can confirm project completion"
ON public.projects
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM proposals p
    JOIN profiles pr ON pr.id = p.freelancer_id
    WHERE p.project_id = projects.id
      AND p.status = 'accepted'
      AND pr.user_id = auth.uid()
  )
);
