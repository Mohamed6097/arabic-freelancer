import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Navbar from '@/components/layout/Navbar';
import { User, MessageSquare, Briefcase, DollarSign, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ProfileData {
  id: string;
  user_id: string;
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
  skills: string[] | null;
  hourly_rate: number | null;
  user_type: 'client' | 'freelancer';
  created_at: string;
}

interface CompletedProject {
  id: string;
  title: string;
  category: string;
  updated_at: string;
}

const PublicProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile: currentUserProfile } = useAuth();
  
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [completedProjects, setCompletedProjects] = useState<CompletedProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      navigate('/projects');
      return;
    }

    setProfileData(data as ProfileData);
    await fetchCompletedProjects(data as ProfileData);
    setLoading(false);
  };

  const fetchCompletedProjects = async (profile: ProfileData) => {
    if (profile.user_type === 'client') {
      const { data } = await supabase
        .from('projects')
        .select('id, title, category, updated_at')
        .eq('client_id', profile.id)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(5);
      
      setCompletedProjects(data || []);
    } else {
      const { data: proposals } = await supabase
        .from('proposals')
        .select('project_id')
        .eq('freelancer_id', profile.id)
        .eq('status', 'accepted');
      
      if (proposals && proposals.length > 0) {
        const projectIds = proposals.map(p => p.project_id);
        const { data: projects } = await supabase
          .from('projects')
          .select('id, title, category, updated_at')
          .in('id', projectIds)
          .eq('status', 'completed')
          .order('updated_at', { ascending: false })
          .limit(5);
        
        setCompletedProjects(projects || []);
      }
    }
  };

  const handleSendMessage = () => {
    if (!currentUserProfile) {
      navigate('/auth');
      return;
    }
    navigate(`/messages?recipient=${id}`);
  };

  const isOwnProfile = currentUserProfile?.id === id;

  if (loading) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <Navbar />
        <div className="container py-8">
          <div className="animate-pulse space-y-4 max-w-2xl mx-auto">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 bg-muted rounded-full"></div>
              <div className="space-y-2 flex-1">
                <div className="h-6 bg-muted rounded w-1/3"></div>
                <div className="h-4 bg-muted rounded w-1/4"></div>
              </div>
            </div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!profileData) return null;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      
      <main className="container py-8 max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profileData.avatar_url || ''} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {profileData.full_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-2xl flex items-center gap-2">
                  {profileData.full_name}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">
                    {profileData.user_type === 'client' ? 'عميل' : 'مختص'}
                  </Badge>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground text-sm">
                    عضو منذ {format(new Date(profileData.created_at), 'MMMM yyyy', { locale: ar })}
                  </span>
                </CardDescription>
                
                {profileData.user_type === 'freelancer' && profileData.hourly_rate && (
                  <div className="flex items-center gap-1 mt-2 text-primary">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-medium">{profileData.hourly_rate} جنيه/ساعة</span>
                  </div>
                )}
              </div>
              
              {!isOwnProfile && currentUserProfile && (
                <Button onClick={handleSendMessage}>
                  <MessageSquare className="h-4 w-4 ml-2" />
                  مراسلة
                </Button>
              )}
              
              {isOwnProfile && (
                <Button variant="outline" onClick={() => navigate('/profile')}>
                  <User className="h-4 w-4 ml-2" />
                  تعديل الملف
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {profileData.bio && (
              <div>
                <h3 className="font-semibold mb-2">نبذة</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{profileData.bio}</p>
              </div>
            )}
            
            {profileData.skills && profileData.skills.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">المهارات</h3>
                <div className="flex flex-wrap gap-2">
                  {profileData.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {completedProjects.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                المشاريع المكتملة ({completedProjects.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {completedProjects.map((project) => (
                  <Link 
                    key={project.id} 
                    to={`/projects/${project.id}`}
                    className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Briefcase className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{project.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">{project.category}</Badge>
                        <span>{format(new Date(project.updated_at), 'MMM yyyy', { locale: ar })}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default PublicProfile;
