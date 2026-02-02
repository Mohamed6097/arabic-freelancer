import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { User, X, Plus } from 'lucide-react';

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
    }
  }, [profile]);

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
      
      <main className="container py-8 max-w-2xl">
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
                    <Label htmlFor="hourlyRate">السعر بالساعة ($)</Label>
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
      </main>
    </div>
  );
};

export default Profile;
