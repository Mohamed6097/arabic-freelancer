import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/layout/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  FileIcon, 
  GraduationCap, 
  Palette, 
  Globe,
  ArrowLeft
} from 'lucide-react';

interface ServiceItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  clientPrice: string;
  freelancerPrice: string;
  unit?: string;
  alternative?: {
    clientPrice: string;
    freelancerPrice: string;
  };
}

const services: ServiceItem[] = [
  {
    id: 'ppt',
    icon: <FileText className="h-8 w-8" />,
    title: 'تصميم عرض PowerPoint',
    description: 'تصميم شرائح احترافية لعروضك التقديمية',
    clientPrice: '2',
    freelancerPrice: '10',
    unit: 'للصفحة',
  },
  {
    id: 'word',
    icon: <FileIcon className="h-8 w-8" />,
    title: 'تنسيق مستندات Word',
    description: 'تنسيق وتصميم مستندات Word بشكل احترافي',
    clientPrice: '2',
    freelancerPrice: '10',
    unit: 'للصفحة',
  },
  {
    id: 'teaching',
    icon: <GraduationCap className="h-8 w-8" />,
    title: 'الشرح والتدريس',
    description: 'جلسات شرح وتدريس خصوصية',
    clientPrice: '20',
    freelancerPrice: '120',
    unit: 'للساعة',
    alternative: {
      clientPrice: '25',
      freelancerPrice: '150',
    },
  },
  {
    id: 'logo',
    icon: <Palette className="h-8 w-8" />,
    title: 'تصميم لوجو',
    description: 'تصميم شعار احترافي لعلامتك التجارية',
    clientPrice: '15',
    freelancerPrice: '100',
  },
  {
    id: 'webpage',
    icon: <Globe className="h-8 w-8" />,
    title: 'تصميم صفحة ويب',
    description: 'تصميم وتطوير صفحة ويب واحدة',
    clientPrice: '30',
    freelancerPrice: '250',
    unit: 'للصفحة',
  },
];

const Catalog = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isClient = profile?.user_type === 'client';
  const isFreelancer = profile?.user_type === 'freelancer';
  
  // Currency based on user type
  const currency = isFreelancer ? 'جنيه مصري' : 'ريال';

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      
      <main className="container py-4 sm:py-8">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 ml-2" />
            رجوع
          </Button>
          
          <div className="flex items-center gap-4 mb-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold">قائمة الأسعار</h1>
            <Badge variant={isClient ? 'default' : 'secondary'} className="text-sm">
              {isClient ? 'عميل' : 'مستقل'}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {isClient 
              ? 'تصفح الخدمات المتاحة واختر ما يناسب احتياجاتك'
              : 'الأسعار التي ستحصل عليها كمستقل عند تنفيذ الخدمات'
            }
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card 
              key={service.id} 
              className="overflow-hidden hover:shadow-lg transition-shadow"
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-lg bg-primary/10 text-primary">
                    {service.icon}
                  </div>
                </div>
                <CardTitle className="mt-4">{service.title}</CardTitle>
                <CardDescription>{service.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-primary">
                      {isClient ? service.clientPrice : service.freelancerPrice}
                    </span>
                    <span className="text-muted-foreground">{currency}</span>
                    {service.unit && (
                      <span className="text-sm text-muted-foreground">
                        {service.unit}
                      </span>
                    )}
                  </div>
                  
                  {service.alternative && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>أو</span>
                      <span className="font-semibold text-foreground">
                        {isClient 
                          ? service.alternative.clientPrice 
                          : service.alternative.freelancerPrice
                        } {currency}
                      </span>
                    </div>
                  )}

                  {isClient && (
                    <Button 
                      className="w-full mt-4" 
                      onClick={() => navigate('/projects/new')}
                    >
                      طلب الخدمة
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info section */}
        <Card className="mt-8 bg-muted/50">
          <CardContent className="py-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">
                {isClient 
                  ? 'هل تحتاج خدمة مخصصة؟' 
                  : 'ابدأ بتقديم عروضك الآن'
                }
              </h3>
              <p className="text-muted-foreground mb-4">
                {isClient
                  ? 'يمكنك إنشاء مشروع جديد بمتطلبات محددة وسيتقدم المستقلون بعروضهم'
                  : 'تصفح المشاريع المتاحة وقدم عروضك للحصول على فرص عمل'
                }
              </p>
              <Button 
                variant={isClient ? 'default' : 'outline'}
                onClick={() => navigate(isClient ? '/projects/new' : '/projects')}
              >
                {isClient ? 'إنشاء مشروع جديد' : 'تصفح المشاريع'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Catalog;
