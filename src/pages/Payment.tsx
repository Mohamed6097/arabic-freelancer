import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, CheckCircle, Clock, XCircle, CreditCard, Building2, Copy, Smartphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import paymentQR from '@/assets/payment-qr.jpeg';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Payment = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: receipts, refetch: refetchReceipts } = useQuery({
    queryKey: ['payment-receipts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('payment_receipts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);
    try {
      const fileName = `${user.id}/${Date.now()}_${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('payment-receipts')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('payment_receipts')
        .insert({
          user_id: user.id,
          receipt_url: urlData.publicUrl,
          receipt_name: selectedFile.name,
          status: 'pending',
        });

      if (insertError) throw insertError;

      toast({
        title: 'تم رفع الإيصال بنجاح',
        description: 'سيتم مراجعة إيصالك قريباً',
      });

      setSelectedFile(null);
      refetchReceipts();
    } catch (error: any) {
      toast({
        title: 'خطأ في رفع الإيصال',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'تم النسخ',
      description: 'تم نسخ النص إلى الحافظة',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600 hover:bg-green-700"><CheckCircle className="h-3 w-3 ml-1" /> مقبول</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 ml-1" /> مرفوض</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 ml-1" /> قيد المراجعة</Badge>;
    }
  };

  // Redirect freelancers away from this page
  if (!authLoading && profile?.user_type === 'freelancer') {
    navigate('/dashboard');
    return null;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <Navbar />
        <div className="container py-8">
          <p>جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <div className="container py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">الدفع والتحويل</h1>
            <p className="text-muted-foreground mt-2">
              قم بتحويل المبلغ إلى حسابنا البنكي ثم ارفع إيصال التحويل
            </p>
          </div>

          {/* Payment Methods Tabs */}
          <Tabs defaultValue="bank" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="bank" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                تحويل بنكي
              </TabsTrigger>
              <TabsTrigger value="vodafone" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                فودافون كاش (مصر)
              </TabsTrigger>
            </TabsList>

            {/* Bank Transfer Tab */}
            <TabsContent value="bank">
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    بيانات الحساب البنكي
                  </CardTitle>
                  <CardDescription>
                    امسح رمز QR أو قم بالتحويل إلى الحساب التالي
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* QR Code */}
                  <div className="flex justify-center">
                    <div className="bg-[#0f2744] p-6 rounded-2xl">
                      <img 
                        src={paymentQR} 
                        alt="QR Code للدفع" 
                        className="w-64 h-auto rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Bank Details */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>اسم البنك</Label>
                      <div className="flex items-center gap-2">
                        <Input value="بنك الإنماء" readOnly className="bg-muted" />
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard('بنك الإنماء')}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>اسم صاحب الحساب</Label>
                      <div className="flex items-center gap-2">
                        <Input value="حسن يسين سيد" readOnly className="bg-muted" />
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard('حسن يسين سيد')}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>رقم الحساب</Label>
                      <div className="flex items-center gap-2">
                        <Input value="68201760885001" readOnly className="bg-muted font-mono" />
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard('68201760885001')}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>رقم الآيبان (IBAN)</Label>
                      <div className="flex items-center gap-2">
                        <Input value="SA3505000068201760885001" readOnly className="bg-muted font-mono" />
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard('SA3505000068201760885001')}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Vodafone Cash Tab */}
            <TabsContent value="vodafone">
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    فودافون كاش - مصر
                  </CardTitle>
                  <CardDescription>
                    للعملاء المصريين - قم بالتحويل عبر فودافون كاش
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Vodafone Cash Logo/Icon */}
                  <div className="flex justify-center">
                    <div className="bg-gradient-to-br from-red-500 to-red-600 p-8 rounded-2xl text-white text-center">
                      <Smartphone className="h-16 w-16 mx-auto mb-3" />
                      <p className="text-xl font-bold">Vodafone Cash</p>
                      <p className="text-sm opacity-90">فودافون كاش</p>
                    </div>
                  </div>

                  {/* Vodafone Cash Details */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>رقم فودافون كاش</Label>
                      <div className="flex items-center gap-2">
                        <Input value="01020801921" readOnly className="bg-muted font-mono text-lg text-center" dir="ltr" />
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard('01020801921')}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        <strong>ملاحظة:</strong> بعد إتمام التحويل عبر فودافون كاش، يرجى رفع صورة إيصال التحويل أدناه للتحقق.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Upload Receipt */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                رفع إيصال التحويل
              </CardTitle>
              <CardDescription>
                بعد إتمام التحويل، قم برفع صورة الإيصال للتحقق
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="receipt">اختر ملف الإيصال</Label>
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                />
              </div>
              {selectedFile && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm">{selectedFile.name}</span>
                  <Button onClick={handleUpload} disabled={uploading}>
                    {uploading ? 'جاري الرفع...' : 'رفع الإيصال'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Previous Receipts */}
          {receipts && receipts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  الإيصالات السابقة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {receipts.map((receipt) => (
                    <div
                      key={receipt.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{receipt.receipt_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(receipt.created_at).toLocaleDateString('ar-SA')}
                        </span>
                      </div>
                      {getStatusBadge(receipt.status)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Payment;
