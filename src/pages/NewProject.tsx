import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/layout/Navbar';
import { PlusCircle } from 'lucide-react';

const categories = [
  'تطوير الويب',
  'تطوير التطبيقات',
  'التصميم',
  'الكتابة والترجمة',
  'التسويق',
  'الفيديو والصوت',
  'البيانات والتحليل',
  'أخرى',
];

const NewProject = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [deadline, setDeadline] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile) {
      navigate('/auth');
      return;
    }

    if (!title.trim() || !description.trim() || !category) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء الحقول المطلوبة',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('projects')
      .insert({
        client_id: profile.id,
        title: title.trim(),
        description: description.trim(),
        category,
        budget_min: budgetMin ? parseFloat(budgetMin) : null,
        budget_max: budgetMax ? parseFloat(budgetMax) : null,
        deadline: deadline || null,
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إنشاء المشروع',
        variant: 'destructive',
      });
      return;
    }

    // Send notification to freelancers
    try {
      await supabase.functions.invoke('notify-job-posted', {
        body: {
          projectId: data.id,
          projectTitle: title.trim(),
          projectCategory: category,
          clientName: profile.full_name,
        },
      });
    } catch (notifyError) {
      console.error('Failed to notify freelancers:', notifyError);
    }

    toast({
      title: 'تم إنشاء المشروع',
      description: 'يمكن للمختصين الآن تقديم عروضهم',
    });
    navigate(`/projects/${data.id}`);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      
      <main className="container py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="h-6 w-6" />
              أضف مشروع جديد
            </CardTitle>
            <CardDescription>
              أضف تفاصيل مشروعك وسيتمكن المختصون من تقديم عروضهم
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">عنوان المشروع *</Label>
                <Input
                  id="title"
                  placeholder="مثال: تصميم موقع إلكتروني لشركة عقارية"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">وصف المشروع *</Label>
                <Textarea
                  id="description"
                  placeholder="اشرح تفاصيل المشروع والمتطلبات..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label>التصنيف *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر تصنيف المشروع" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budgetMin">الميزانية الأدنى ($)</Label>
                  <Input
                    id="budgetMin"
                    type="number"
                    placeholder="100"
                    value={budgetMin}
                    onChange={(e) => setBudgetMin(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budgetMax">الميزانية الأعلى ($)</Label>
                  <Input
                    id="budgetMax"
                    type="number"
                    placeholder="500"
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">الموعد النهائي</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'جاري الإنشاء...' : 'نشر المشروع'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default NewProject;
