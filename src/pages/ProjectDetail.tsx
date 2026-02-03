import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/layout/Navbar';
import { Calendar, DollarSign, Clock, User, Send, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  budget_min: number | null;
  budget_max: number | null;
  deadline: string | null;
  status: string;
  created_at: string;
  client_id: string;
  profiles: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    user_id: string;
  };
}

interface Proposal {
  id: string;
  cover_letter: string;
  proposed_budget: number;
  estimated_days: number;
  status: string;
  created_at: string;
  profiles: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    bio: string | null;
    skills: string[] | null;
  };
}

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  const [coverLetter, setCoverLetter] = useState('');
  const [proposedBudget, setProposedBudget] = useState('');
  const [estimatedDays, setEstimatedDays] = useState('');

  const isOwner = user && project?.profiles.user_id === user.id;
  const isFreelancer = profile?.user_type === 'freelancer';

  useEffect(() => {
    fetchProject();
  }, [id]);

  useEffect(() => {
    if (project && profile) {
      checkIfApplied();
      if (isOwner) {
        fetchProposals();
      }
    }
  }, [project, profile]);

  const fetchProject = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        profiles:client_id (
          id,
          full_name,
          avatar_url,
          user_id
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      toast({
        title: 'خطأ',
        description: 'لم يتم العثور على المشروع',
        variant: 'destructive',
      });
      navigate('/projects');
      return;
    }

    setProject(data as unknown as Project);
    setLoading(false);
  };

  const fetchProposals = async () => {
    const { data } = await supabase
      .from('proposals')
      .select(`
        *,
        profiles:freelancer_id (
          id,
          full_name,
          avatar_url,
          bio,
          skills
        )
      `)
      .eq('project_id', id)
      .order('created_at', { ascending: false });

    if (data) {
      setProposals(data as unknown as Proposal[]);
    }
  };

  const checkIfApplied = async () => {
    if (!profile) return;
    
    const { data } = await supabase
      .from('proposals')
      .select('id')
      .eq('project_id', id)
      .eq('freelancer_id', profile.id)
      .single();

    setHasApplied(!!data);
  };

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) {
      navigate('/auth');
      return;
    }

    if (!coverLetter.trim() || !proposedBudget || !estimatedDays) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from('proposals').insert({
      project_id: id,
      freelancer_id: profile.id,
      cover_letter: coverLetter.trim(),
      proposed_budget: parseFloat(proposedBudget),
      estimated_days: parseInt(estimatedDays),
    });

    setSubmitting(false);

    if (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تقديم العرض',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'تم تقديم العرض',
      description: 'سيتم إشعارك عند مراجعة صاحب المشروع لعرضك',
    });
    setHasApplied(true);
    setCoverLetter('');
    setProposedBudget('');
    setEstimatedDays('');
  };

  const handleProposalAction = async (proposalId: string, status: 'accepted' | 'rejected', freelancerId?: string) => {
    const { error } = await supabase
      .from('proposals')
      .update({ status })
      .eq('id', proposalId);

    if (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحديث العرض',
        variant: 'destructive',
      });
      return;
    }

    if (status === 'accepted') {
      // Update project status
      await supabase
        .from('projects')
        .update({ status: 'in_progress' })
        .eq('id', id);

      // Auto-send message to freelancer
      if (freelancerId && profile) {
        await supabase.from('messages').insert({
          sender_id: profile.id,
          receiver_id: freelancerId,
          content: 'السلام عليكم',
          project_id: id,
          message_type: 'text',
        });

        toast({
          title: 'تم قبول العرض',
          description: 'تم إرسال رسالة للمستقل لبدء العمل',
        });

        // Navigate to messages with the freelancer
        navigate(`/messages?recipient=${freelancerId}`);
        return;
      }
    }

    toast({
      title: status === 'accepted' ? 'تم قبول العرض' : 'تم رفض العرض',
    });
    fetchProposals();
    fetchProject();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <Navbar />
        <div className="container py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-40 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      
      <main className="container py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">{project.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={project.profiles.avatar_url || ''} />
                        <AvatarFallback>{project.profiles.full_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span>{project.profiles.full_name}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">
                        {format(new Date(project.created_at), 'dd MMM yyyy', { locale: ar })}
                      </span>
                    </CardDescription>
                  </div>
                  <Badge variant={project.status === 'open' ? 'default' : 'secondary'}>
                    {project.status === 'open' ? 'مفتوح' : project.status === 'in_progress' ? 'قيد التنفيذ' : 'مكتمل'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4 text-sm">
                  <Badge variant="outline">{project.category}</Badge>
                  {project.budget_min && project.budget_max && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <span>${project.budget_min} - ${project.budget_max}</span>
                    </div>
                  )}
                  {project.deadline && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{format(new Date(project.deadline), 'dd MMM yyyy', { locale: ar })}</span>
                    </div>
                  )}
                </div>
                <div className="prose prose-sm max-w-none">
                  <h3 className="text-lg font-semibold mb-2">وصف المشروع</h3>
                  <p className="whitespace-pre-wrap text-muted-foreground">{project.description}</p>
                </div>
              </CardContent>
            </Card>

            {isOwner && proposals.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>العروض المقدمة ({proposals.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {proposals.map((proposal) => (
                    <Card key={proposal.id} className="border">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <Avatar>
                              <AvatarImage src={proposal.profiles.avatar_url || ''} />
                              <AvatarFallback>{proposal.profiles.full_name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{proposal.profiles.full_name}</p>
                              {proposal.profiles.bio && (
                                <p className="text-sm text-muted-foreground line-clamp-1">{proposal.profiles.bio}</p>
                              )}
                              {proposal.profiles.skills && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {proposal.profiles.skills.slice(0, 3).map((skill) => (
                                    <Badge key={skill} variant="secondary" className="text-xs">
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <Badge
                            variant={
                              proposal.status === 'accepted'
                                ? 'default'
                                : proposal.status === 'rejected'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {proposal.status === 'pending' ? 'قيد المراجعة' : proposal.status === 'accepted' ? 'مقبول' : 'مرفوض'}
                          </Badge>
                        </div>
                        <div className="mt-4 space-y-2">
                          <p className="text-sm">{proposal.cover_letter}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              ${proposal.proposed_budget}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {proposal.estimated_days} يوم
                            </span>
                          </div>
                        </div>
                        {proposal.status === 'pending' && project.status === 'open' && (
                          <div className="flex gap-2 mt-4">
                            <Button
                              size="sm"
                              onClick={() => handleProposalAction(proposal.id, 'accepted', proposal.profiles.id)}
                            >
                              <CheckCircle className="h-4 w-4 ml-1" />
                              قبول
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleProposalAction(proposal.id, 'rejected')}
                            >
                              <XCircle className="h-4 w-4 ml-1" />
                              رفض
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {isFreelancer && project.status === 'open' && !isOwner && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    تقديم عرض
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {hasApplied ? (
                    <div className="text-center py-4">
                      <CheckCircle className="h-12 w-12 mx-auto text-primary mb-2" />
                      <p className="font-medium">تم تقديم عرضك</p>
                      <p className="text-sm text-muted-foreground">سيتم إشعارك عند مراجعة العرض</p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitProposal} className="space-y-4">
                      <div className="space-y-2">
                        <Label>رسالة العرض</Label>
                        <Textarea
                          placeholder="اشرح لماذا أنت المناسب لهذا المشروع..."
                          value={coverLetter}
                          onChange={(e) => setCoverLetter(e.target.value)}
                          rows={4}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>الميزانية المقترحة ($)</Label>
                          <Input
                            type="number"
                            placeholder="500"
                            value={proposedBudget}
                            onChange={(e) => setProposedBudget(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>مدة التنفيذ (أيام)</Label>
                          <Input
                            type="number"
                            placeholder="14"
                            value={estimatedDays}
                            onChange={(e) => setEstimatedDays(e.target.value)}
                          />
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={submitting}>
                        {submitting ? 'جاري الإرسال...' : 'تقديم العرض'}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            )}

            {!user && project.status === 'open' && (
              <Card>
                <CardContent className="pt-6 text-center">
                  <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="font-medium mb-2">تريد تقديم عرض؟</p>
                  <p className="text-sm text-muted-foreground mb-4">سجل دخولك أو أنشئ حساباً جديداً</p>
                  <Button onClick={() => navigate('/auth')} className="w-full">
                    تسجيل الدخول
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProjectDetail;
