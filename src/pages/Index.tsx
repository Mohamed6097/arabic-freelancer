import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Navbar from '@/components/layout/Navbar';
import { Briefcase, Users, MessageSquare, Shield, ArrowLeft } from 'lucide-react';

const features = [
  {
    icon: Briefcase,
    title: 'مشاريع متنوعة',
    description: 'تصفح مئات المشاريع في مختلف المجالات وتقدم بعروضك',
  },
  {
    icon: Users,
    title: 'مختصون محترفون',
    description: 'تواصل مع أفضل المختصين لتنفيذ مشاريعك بجودة عالية',
  },
  {
    icon: MessageSquare,
    title: 'تواصل مباشر',
    description: 'نظام رسائل متكامل للتواصل الفعال بين العملاء والمختصين',
  },
  {
    icon: Shield,
    title: 'أمان وثقة',
    description: 'منصة آمنة وموثوقة لضمان حقوق جميع الأطراف',
  },
];

const Index = () => {
  const { user, profile } = useAuth();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background py-12 sm:py-20 lg:py-32">
        <div className="container relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
              منصة <span className="text-primary">العمل الحر</span> العربية
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              المكان الأمثل للتواصل بين العملاء والمختصين. أنشئ مشروعك أو تقدم بعروضك الآن!
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              {user ? (
                <>
                  <Link to="/projects">
                    <Button size="lg" className="w-full sm:w-auto">
                      تصفح المشاريع
                      <ArrowLeft className="mr-2 h-5 w-5" />
                    </Button>
                  </Link>
                  {profile?.user_type === 'client' && (
                    <Link to="/projects/new">
                      <Button size="lg" variant="outline" className="w-full sm:w-auto">
                        أضف مشروع جديد
                      </Button>
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Link to="/auth">
                    <Button size="lg" className="w-full sm:w-auto">
                      ابدأ الآن مجاناً
                      <ArrowLeft className="mr-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link to="/projects">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto">
                      تصفح المشاريع
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute right-0 bottom-0 h-[300px] w-[300px] rounded-full bg-primary/5 blur-3xl" />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-20">
        <div className="container">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">لماذا تختارنا؟</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card key={feature.title} className="text-center border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                    <feature.icon className="h-7 w-7 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-20 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">جاهز للانطلاق؟</h2>
          <p className="text-lg mb-8 opacity-90">
            انضم إلى آلاف المستخدمين وابدأ رحلتك في العمل الحر اليوم
          </p>
          {!user && (
            <Link to="/auth">
              <Button size="lg" variant="secondary">
                إنشاء حساب مجاني
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container text-center text-muted-foreground">
          <p>© 2024 منصة العمل الحر العربية. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
