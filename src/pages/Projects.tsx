import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Navbar from '@/components/layout/Navbar';
import { Search, Calendar, DollarSign, Briefcase } from 'lucide-react';
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
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

const categories = [
  'الكل',
  'تطوير الويب',
  'تطوير التطبيقات',
  'التصميم',
  'الكتابة والترجمة',
  'التسويق',
  'الفيديو والصوت',
  'البيانات والتحليل',
  'أخرى',
];

const Projects = () => {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  
  // Currency based on user type
  const currency = profile?.user_type === 'freelancer' ? 'جنيه مصري' : 'ريال';

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        profiles:client_id (
          full_name,
          avatar_url
        )
      `)
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProjects(data as unknown as Project[]);
    }
    setLoading(false);
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'الكل' || project.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      
      <main className="container py-4 sm:py-8">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold">تصفح المشاريع</h1>
            <p className="text-muted-foreground">اعثر على المشروع المناسب لمهاراتك وتقدم بعرضك</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث في المشاريع..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="اختر التصنيف" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-20 bg-muted rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">لا توجد مشاريع</h3>
                <p className="text-muted-foreground">لم يتم العثور على مشاريع تطابق بحثك</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => (
                <Link key={project.id} to={`/projects/${project.id}`}>
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary/50">
                    <CardHeader className="p-3 sm:p-6">
                      <div className="flex flex-col gap-1">
                        <Badge variant="secondary" className="text-xs w-fit">{project.category}</Badge>
                        <CardTitle className="text-sm sm:text-lg line-clamp-2">{project.title}</CardTitle>
                      </div>
                      <CardDescription>
                        <span className="truncate block text-xs sm:text-sm">{project.profiles.full_name}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 p-3 pt-0 sm:p-6 sm:pt-0">
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                        {project.description}
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs gap-1 sm:gap-2">
                        {project.budget_min && project.budget_max && (
                          <div className="flex items-center gap-1 text-primary">
                            <DollarSign className="h-4 w-4" />
                            <span>{project.budget_min} - {project.budget_max} {currency}</span>
                          </div>
                        )}
                        {project.deadline && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>{format(new Date(project.deadline), 'dd MMM yyyy', { locale: ar })}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Projects;
