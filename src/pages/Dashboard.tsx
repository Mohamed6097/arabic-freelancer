import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Navbar from '@/components/layout/Navbar';
import { Briefcase, FileText, Clock, CheckCircle, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Project {
  id: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
  budget_min: number | null;
  budget_max: number | null;
  proposals_count?: number;
}

interface Proposal {
  id: string;
  status: string;
  proposed_budget: number;
  estimated_days: number;
  created_at: string;
  projects: {
    id: string;
    title: string;
    category: string;
    status: string;
  };
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      if (profile.user_type === 'client') {
        fetchClientProjects();
      } else {
        fetchFreelancerProposals();
      }
    }
  }, [profile]);

  const fetchClientProjects = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('client_id', profile.id)
      .order('created_at', { ascending: false });

    if (data) {
      const projectsWithCount = await Promise.all(
        data.map(async (project) => {
          const { count } = await supabase
            .from('proposals')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id);
          return { ...project, proposals_count: count || 0 };
        })
      );
      setProjects(projectsWithCount);
    }
    setLoading(false);
  };

  const fetchFreelancerProposals = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('proposals')
      .select(`
        *,
        projects (
          id,
          title,
          category,
          status
        )
      `)
      .eq('freelancer_id', profile.id)
      .order('created_at', { ascending: false });

    if (data) {
      setProposals(data as unknown as Proposal[]);
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
      case 'pending':
        return 'secondary';
      case 'in_progress':
        return 'default';
      case 'accepted':
        return 'default';
      case 'completed':
        return 'outline';
      case 'rejected':
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open':
        return 'مفتوح';
      case 'pending':
        return 'قيد المراجعة';
      case 'in_progress':
        return 'قيد التنفيذ';
      case 'accepted':
        return 'مقبول';
      case 'completed':
        return 'مكتمل';
      case 'rejected':
        return 'مرفوض';
      case 'cancelled':
        return 'ملغي';
      default:
        return status;
    }
  };

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
      
      <main className="container py-4 sm:py-8">
        <div className="flex flex-col gap-4 sm:gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">مرحباً، {profile?.full_name}</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              {profile?.user_type === 'client' ? 'إدارة مشاريعك' : 'إدارة عروضك'}
            </p>
          </div>

          {profile?.user_type === 'client' ? (
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4 h-auto gap-1 p-1">
                <TabsTrigger value="all" className="text-xs sm:text-sm py-2">جميع المشاريع</TabsTrigger>
                <TabsTrigger value="open" className="text-xs sm:text-sm py-2">مفتوحة</TabsTrigger>
                <TabsTrigger value="in_progress" className="text-xs sm:text-sm py-2">قيد التنفيذ</TabsTrigger>
                <TabsTrigger value="completed" className="text-xs sm:text-sm py-2">مكتملة</TabsTrigger>
              </TabsList>

              {['all', 'open', 'in_progress', 'completed'].map((tab) => (
                <TabsContent key={tab} value={tab}>
                  {loading ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {[1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse">
                          <CardHeader>
                            <div className="h-6 bg-muted rounded w-3/4"></div>
                          </CardHeader>
                          <CardContent>
                            <div className="h-16 bg-muted rounded"></div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {projects
                        .filter((p) => tab === 'all' || p.status === tab)
                        .map((project) => (
                          <Link key={project.id} to={`/projects/${project.id}`}>
                            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                              <CardHeader>
                                <div className="flex items-start justify-between">
                                  <CardTitle className="text-lg line-clamp-1">{project.title}</CardTitle>
                                  <Badge variant={getStatusColor(project.status)}>
                                    {getStatusText(project.status)}
                                  </Badge>
                                </div>
                                <CardDescription>{project.category}</CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-1">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <span>{project.proposals_count} عرض</span>
                                  </div>
                                  {project.budget_min && project.budget_max && (
                                    <div className="flex items-center gap-1 text-primary">
                                      <DollarSign className="h-4 w-4" />
                                      <span>${project.budget_min} - ${project.budget_max}</span>
                                    </div>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {format(new Date(project.created_at), 'dd MMM yyyy', { locale: ar })}
                                </p>
                              </CardContent>
                            </Card>
                          </Link>
                        ))}
                      {projects.filter((p) => tab === 'all' || p.status === tab).length === 0 && (
                        <Card className="col-span-full text-center py-12">
                          <CardContent>
                            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">لا توجد مشاريع</h3>
                            <p className="text-muted-foreground">ابدأ بإنشاء مشروع جديد</p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4 h-auto gap-1 p-1">
                <TabsTrigger value="all" className="text-xs sm:text-sm py-2">جميع العروض</TabsTrigger>
                <TabsTrigger value="pending" className="text-xs sm:text-sm py-2">قيد المراجعة</TabsTrigger>
                <TabsTrigger value="accepted" className="text-xs sm:text-sm py-2">مقبولة</TabsTrigger>
                <TabsTrigger value="rejected" className="text-xs sm:text-sm py-2">مرفوضة</TabsTrigger>
              </TabsList>

              {['all', 'pending', 'accepted', 'rejected'].map((tab) => (
                <TabsContent key={tab} value={tab}>
                  {loading ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {[1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse">
                          <CardHeader>
                            <div className="h-6 bg-muted rounded w-3/4"></div>
                          </CardHeader>
                          <CardContent>
                            <div className="h-16 bg-muted rounded"></div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {proposals
                        .filter((p) => tab === 'all' || p.status === tab)
                        .map((proposal) => (
                          <Link key={proposal.id} to={`/projects/${proposal.projects.id}`}>
                            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                              <CardHeader>
                                <div className="flex items-start justify-between">
                                  <CardTitle className="text-lg line-clamp-1">
                                    {proposal.projects.title}
                                  </CardTitle>
                                  <Badge variant={getStatusColor(proposal.status)}>
                                    {getStatusText(proposal.status)}
                                  </Badge>
                                </div>
                                <CardDescription>{proposal.projects.category}</CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="h-4 w-4 text-primary" />
                                    <span>${proposal.proposed_budget}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    <span>{proposal.estimated_days} يوم</span>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {format(new Date(proposal.created_at), 'dd MMM yyyy', { locale: ar })}
                                </p>
                              </CardContent>
                            </Card>
                          </Link>
                        ))}
                      {proposals.filter((p) => tab === 'all' || p.status === tab).length === 0 && (
                        <Card className="col-span-full text-center py-12">
                          <CardContent>
                            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">لا توجد عروض</h3>
                            <p className="text-muted-foreground">تصفح المشاريع وقدم عروضك</p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
