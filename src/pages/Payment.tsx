import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Navbar from '@/components/layout/Navbar';
import { Upload, Copy, Check, AlertTriangle, CreditCard, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Payment = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploading, setUploading] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedIban, setCopiedIban] = useState(false);

  const bankInfo = {
    bankName: 'مصرف الإنماء',
    accountHolder: 'حسن يسين سيد',
    accountNumber: '68201760885001',
    iban: 'SA3505000068201760885001',
  };

  const handleCopy = (text: string, type: 'account' | 'iban') => {
    navigator.clipboard.writeText(text);
    if (type === 'account') {
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    } else {
      setCopiedIban(true);
      setTimeout(() => setCopiedIban(false), 2000);
    }
    toast({
      title: 'تم النسخ',
      description: 'تم نسخ الرقم بنجاح',
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      toast({
        title: 'خطأ',
        description: 'يرجى رفع صورة بصيغة PNG أو JPG',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'خطأ',
        description: 'حجم الملف يجب أن يكون أقل من 5 ميجابايت',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      // Upload file
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get URL
      const { data: urlData } = supabase.storage
        .from('payment-receipts')
        .getPublicUrl(fileName);

      // Save receipt record
      const { error: insertError } = await supabase
        .from('payment_receipts')
        .insert({
          user_id: user.id,
          receipt_url: urlData.publicUrl,
          receipt_name: file.name,
          status: 'pending',
        });

      if (insertError) throw insertError;

      toast({
        title: 'تم رفع الإيصال بنجاح',
        description: 'سيتم مراجعة الإيصال في أقرب وقت',
      });

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'خطأ في الرفع',
        description: error.message || 'حدث خطأ أثناء رفع الملف',
        variant: 'destructive',
      });
    }

    setUploading(false);
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
        <Card className="shadow-lg">
          <CardHeader className="text-center border-b">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <CreditCard className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">الدفع</CardTitle>
          </CardHeader>
          
          <CardContent className="p-6 space-y-6">
            {/* Bank Info */}
            <div className="bg-muted rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <Building2 className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">{bankInfo.bankName}</span>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">اسم صاحب الحساب</p>
                <p className="font-semibold text-lg">{bankInfo.accountHolder}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">رقم الحساب</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-background rounded-lg p-3 text-lg font-mono border">
                    {bankInfo.accountNumber}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopy(bankInfo.accountNumber, 'account')}
                  >
                    {copiedAccount ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">الآيبان (IBAN)</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-background rounded-lg p-3 text-lg font-mono border break-all">
                    {bankInfo.iban}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopy(bankInfo.iban, 'iban')}
                  >
                    {copiedIban ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Warning */}
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
              <AlertTriangle className="h-5 w-5" />
              <AlertDescription className="text-sm">
                <strong>تنبيه هام:</strong> نحن غير مسؤولين عن أي عمليات دفع تتم خارج المنصة. أي مبالغ يتم تحويلها خارج هذه القناة الرسمية لن تُحتسب ولن نتحمل مسؤوليتها.
              </AlertDescription>
            </Alert>

            {/* Steps */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg">خطوات الدفع</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">1</span>
                  <p className="text-muted-foreground pt-0.5">امسح رمز QR أو انسخ رقم الحساب/الآيبان</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">2</span>
                  <p className="text-muted-foreground pt-0.5">قم بالتحويل من تطبيق البنك الخاص بك</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">3</span>
                  <p className="text-muted-foreground pt-0.5">احتفظ بإيصال التحويل كإثبات للدفع</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">4</span>
                  <p className="text-muted-foreground pt-0.5">ارفع صورة الإيصال أدناه للتأكيد</p>
                </div>
              </div>
            </div>

            {/* Upload Section */}
            {user ? (
              <div className="space-y-3">
                <h3 className="font-bold text-lg">رفع إيصال الدفع</h3>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="font-medium mb-2">
                    {uploading ? 'جاري الرفع...' : 'اضغط لرفع صورة الإيصال'}
                  </p>
                  <p className="text-sm text-muted-foreground">PNG, JPG حتى 5 ميجابايت</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  يرجى <a href="/auth" className="text-primary font-medium underline">تسجيل الدخول</a> لرفع إيصال الدفع
                </AlertDescription>
              </Alert>
            )}

            {/* Footer */}
            <div className="text-center text-sm text-muted-foreground pt-4 border-t">
              جميع الحقوق محفوظة © 2026
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Payment;
