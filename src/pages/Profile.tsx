import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/layout/Navbar';
import { User, X, Plus, CheckCircle, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface CompletedProject {
  id: string;
  title: string;
  category: string;
  updated_at: string;
  budget_min: number | null;
  budget_max: number | null;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [completedProjects, setCompletedProjects] = useState<CompletedProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setBio(profile.bio || '');
      setHourlyRate(profile.hourly_rate?.toString() || '');
      setSkills(profile.skills || []);
      fetchCompletedProjects();
    }
  }, [profile]);

  const fetchCompletedProjects = async () => {
    if (!profile) return;
    
    setLoadingProjects(true);
    
    if (profile.user_type === 'client') {
      // Fetch projects owned by the client that are completed
      const { data } = await supabase
        .from('projects')
        .select('id, title, category, updated_at, budget_min, budget_max')
        .eq('client_id', profile.id)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false });
      
      setCompletedProjects(data || []);
    } else {
      // Fetch projects where freelancer has accepted proposals that are completed
      const { data: proposals } = await supabase
        .from('proposals')
        .select('project_id')
        .eq('freelancer_id', profile.id)
        .eq('status', 'accepted');
      
      if (proposals && proposals.length > 0) {
        const projectIds = proposals.map(p => p.project_id);
        const { data: projects } = await supabase
          .from('projects')
          .select('id, title, category, updated_at, budget_min, budget_max')
          .in('id', projectIds)
          .eq('status', 'completed')
          .order('updated_at', { ascending: false });
        
        setCompletedProjects(projects || []);
      } else {
        setCompletedProjects([]);
      }
    }
    
    setLoadingProjects(false);
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((skill) => skill !== skillToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile) return;

    setLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        bio: bio.trim() || null,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
        skills: skills.length > 0 ? skills : null,
      })
      .eq('id', profile.id);

    setLoading(false);

    if (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحديث الملف الشخصي',
        variant: 'destructive',
      });
      return;
    }

    await refreshProfile();
    toast({
      title: 'تم الحفظ',
      description: 'تم تحديث ملفك الشخصي بنجاح',
    });
  };

  // Currency based on user type
  const currency = profile?.user_type === 'freelancer' ? 'جنيه مصري' : 'ريال';

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      
      <main className="container py-8 max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-6 w-6" />
              الملف الشخصي
            </CardTitle>
            <CardDescription>
              تحديث معلوماتك الشخصية
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fullName">الاسم الكامل</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">نبذة عنك</Label>
                <Textarea
                  id="bio"
                  placeholder="اكتب نبذة مختصرة عن خبراتك ومهاراتك..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                />
              </div>

              {profile?.user_type === 'freelancer' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="hourlyRate">السعر بالساعة ({currency})</Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      placeholder="25"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>المهارات</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="أضف مهارة..."
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                      />
                      <Button type="button" onClick={handleAddSkill} variant="outline">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {skills.map((skill) => (
                          <Badge key={skill} variant="secondary" className="gap-1">
                            {skill}
                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(skill)}
                              className="hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>نوع الحساب:</span>
                <Badge variant="outline">
                  {profile?.user_type === 'client' ? 'عميل' : 'مختص'}
                </Badge>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Completed Projects Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              المشاريع المكتملة
            </CardTitle>
            <CardDescription>
              {profile?.user_type === 'client' 
                ? 'المشاريع التي أتممتها مع المستقلين'
                : 'المشاريع التي أنجزتها للعملاء'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingProjects ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="animate-pulse flex gap-4 p-4 border rounded-lg">
                    <div className="h-10 w-10 bg-muted rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : completedProjects.length === 0 ? (
              <div className="text-center py-8">
                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">لا توجد مشاريع مكتملة حتى الآن</p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedProjects.map((project) => (
                  <Link 
                    key={project.id} 
                    to={`/projects/${project.id}`}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{project.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">{project.category}</Badge>
                        {project.budget_min && project.budget_max && (
                          <span>{project.budget_min} - {project.budget_max} {currency}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(project.updated_at), 'dd MMM yyyy', { locale: ar })}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Profile;
