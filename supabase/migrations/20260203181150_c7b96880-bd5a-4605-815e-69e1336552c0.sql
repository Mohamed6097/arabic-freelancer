-- Add completion confirmation columns to projects table
ALTER TABLE public.projects 
ADD COLUMN client_confirmed_complete BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN freelancer_confirmed_complete BOOLEAN NOT NULL DEFAULT false;

-- Create a function to auto-complete project when both parties confirm
CREATE OR REPLACE FUNCTION public.check_project_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.client_confirmed_complete = true AND NEW.freelancer_confirmed_complete = true THEN
    NEW.status = 'completed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-complete project
CREATE TRIGGER trigger_check_project_completion
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.check_project_completion();