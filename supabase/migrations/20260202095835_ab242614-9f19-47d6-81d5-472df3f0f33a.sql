-- Create user types enum
CREATE TYPE public.user_type AS ENUM ('client', 'freelancer');

-- Create project status enum
CREATE TYPE public.project_status AS ENUM ('open', 'in_progress', 'completed', 'cancelled');

-- Create proposal status enum
CREATE TYPE public.proposal_status AS ENUM ('pending', 'accepted', 'rejected');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  user_type public.user_type NOT NULL DEFAULT 'freelancer',
  bio TEXT,
  skills TEXT[],
  avatar_url TEXT,
  hourly_rate DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  budget_min DECIMAL(10,2),
  budget_max DECIMAL(10,2),
  deadline DATE,
  status public.project_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create proposals table
CREATE TABLE public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  freelancer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  cover_letter TEXT NOT NULL,
  proposed_budget DECIMAL(10,2) NOT NULL,
  estimated_days INTEGER NOT NULL,
  status public.proposal_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, freelancer_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Projects policies
CREATE POLICY "Projects are viewable by everyone"
ON public.projects FOR SELECT
USING (true);

CREATE POLICY "Clients can create projects"
ON public.projects FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = client_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Clients can update their own projects"
ON public.projects FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = client_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Clients can delete their own projects"
ON public.projects FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = client_id AND user_id = auth.uid()
  )
);

-- Proposals policies
CREATE POLICY "Proposals viewable by project owner and freelancer"
ON public.proposals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = freelancer_id AND user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON p.client_id = pr.id
    WHERE p.id = project_id AND pr.user_id = auth.uid()
  )
);

CREATE POLICY "Freelancers can create proposals"
ON public.proposals FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = freelancer_id AND user_id = auth.uid() AND user_type = 'freelancer'
  )
);

CREATE POLICY "Freelancers can update their proposals"
ON public.proposals FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = freelancer_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Project owners can update proposal status"
ON public.proposals FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles pr ON p.client_id = pr.id
    WHERE p.id = project_id AND pr.user_id = auth.uid()
  )
);

-- Messages policies
CREATE POLICY "Users can view their own messages"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE (id = sender_id OR id = receiver_id) AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = sender_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update read status of received messages"
ON public.messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = receiver_id AND user_id = auth.uid()
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_proposals_updated_at
BEFORE UPDATE ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();