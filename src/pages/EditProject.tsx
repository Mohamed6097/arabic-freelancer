import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { Edit, Upload, X, FileText, Image } from 'lucide-react';

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

const EditProject = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [deadline, setDeadline] = useState('');
  const [existingAttachmentUrl, setExistingAttachmentUrl] = useState<string | null>(null);
  const [existingAttachmentName, setExistingAttachmentName] = useState<string | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [removeExistingAttachment, setRemoveExistingAttachment] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select(`*, profiles:client_id (id, user_id)`)
      .eq('id', id)
      .single();

    if (error || !data) {
      toast({ title: 'خطأ', description: 'لم يتم العثور على المشروع', variant: 'destructive' });
      navigate('/projects');
      return;
    }

    // Check ownership
    if ((data as any).profiles?.user_id !== user?.id) {
      toast({ title: 'خطأ', description: 'غير مصرح لك بتعديل هذا المشروع', variant: 'destructive' });
      navigate(`/projects/${id}`);
      return;
    }

    setTitle(data.title);
    setDescription(data.description);
    setCategory(data.category);
    setBudgetMin(data.budget_min?.toString() || '');
    setBudgetMax(data.budget_max?.toString() || '');
    setDeadline(data.deadline || '');
    setExistingAttachmentUrl(data.attachment_url);
    setExistingAttachmentName(data.attachment_name);
    setFetching(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: 'خطأ', description: 'حجم الملف يجب أن يكون أقل من 10 ميجابايت', variant: 'destructive' });
        return;
      }
      setAttachmentFile(file);
      setRemoveExistingAttachment(true);
    }
  };

  const removeAttachment = () => {
    setAttachmentFile(null);
    setRemoveExistingAttachment(true);
  };

  const getFileIcon = (name: string) => {
    if (name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
      return <Image className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile) {
      navigate('/auth');
      return;
    }

    if (!title.trim() || !description.trim() || !category) {
      toast({ title: 'خطأ', description: 'يرجى ملء الحقول المطلوبة', variant: 'destructive' });
      return;
    }

    setLoading(true);

    let attachmentUrl = removeExistingAttachment ? null : existingAttachmentUrl;
    let attachmentName = removeExistingAttachment ? null : existingAttachmentName;

    if (attachmentFile) {
      setUploadingAttachment(true);
      const fileExt = attachmentFile.name.split('.').pop();
      const fileName = `${profile.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(fileName, attachmentFile);

      if (uploadError) {
        setLoading(false);
        setUploadingAttachment(false);
        toast({ title: 'خطأ', description: 'حدث خطأ أثناء رفع المرفق', variant: 'destructive' });
        return;
      }

      const { data: urlData } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(fileName);

      attachmentUrl = urlData.publicUrl;
      attachmentName = attachmentFile.name;
      setUploadingAttachment(false);
    }

    const { error } = await supabase
      .from('projects')
      .update({
        title: title.trim(),
        description: description.trim(),
        category,
        budget_min: budgetMin ? parseFloat(budgetMin) : null,
        budget_max: budgetMax ? parseFloat(budgetMax) : null,
        deadline: deadline || null,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
      })
      .eq('id', id);

    setLoading(false);

    if (error) {
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء تحديث المشروع', variant: 'destructive' });
      return;
    }

    toast({ title: 'تم تحديث المشروع بنجاح' });
    navigate(`/projects/${id}`);
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <Navbar />
        <div className="container py-8 max-w-2xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/2"></div>
            <div className="h-40 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const showExistingAttachment = existingAttachmentUrl && !removeExistingAttachment && !attachmentFile;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />

      <main className="container py-4 sm:py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit className="h-6 w-6" />
              تعديل المشروع
            </CardTitle>
            <CardDescription>قم بتعديل تفاصيل المشروع</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">عنوان المشروع *</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">وصف المشروع *</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={6} />
              </div>

              <div className="space-y-2">
                <Label>التصنيف *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر تصنيف المشروع" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budgetMin">الميزانية الأدنى ($)</Label>
                  <Input id="budgetMin" type="number" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budgetMax">الميزانية الأعلى ($)</Label>
                  <Input id="budgetMax" type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">الموعد النهائي</Label>
                <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>

              {/* Attachment */}
              <div className="space-y-2">
                <Label>مرفقات (صور أو ملفات)</Label>
                {showExistingAttachment ? (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      {getFileIcon(existingAttachmentName || '')}
                      <span className="text-sm truncate max-w-[200px]">{existingAttachmentName}</span>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={removeAttachment}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : attachmentFile ? (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      {getFileIcon(attachmentFile.name)}
                      <span className="text-sm truncate max-w-[200px]">{attachmentFile.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(attachmentFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => { setAttachmentFile(null); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    <Input id="attachment-edit" type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar" onChange={handleFileChange} className="hidden" />
                    <label htmlFor="attachment-edit" className="cursor-pointer">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">اضغط لرفع ملف أو صورة</p>
                      <p className="text-xs text-muted-foreground mt-1">الحد الأقصى: 10 ميجابايت</p>
                    </label>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button type="submit" className="flex-1" disabled={loading || uploadingAttachment}>
                  {loading || uploadingAttachment ? 'جاري التحديث...' : 'حفظ التعديلات'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate(`/projects/${id}`)}>
                  إلغاء
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default EditProject;
