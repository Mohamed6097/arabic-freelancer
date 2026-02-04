import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Briefcase, User, LogOut, MessageSquare, PlusCircle, LayoutDashboard, CreditCard, ListOrdered, Menu } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
const Navbar = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const NavLinks = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      <Link to="/projects" onClick={isMobile ? closeMobileMenu : undefined}>
        <Button variant="ghost" className={isMobile ? "w-full justify-start" : ""}>المشاريع</Button>
      </Link>
      <Link to="/catalog" onClick={isMobile ? closeMobileMenu : undefined}>
        <Button variant="ghost" className={isMobile ? "w-full justify-start" : ""}>
          <ListOrdered className="h-4 w-4 ml-2" />
          الأسعار
        </Button>
      </Link>
      <Link to="/payment" onClick={isMobile ? closeMobileMenu : undefined}>
        <Button variant="ghost" className={isMobile ? "w-full justify-start" : ""}>
          <CreditCard className="h-4 w-4 ml-2" />
          الدفع
        </Button>
      </Link>
    </>
  );

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" dir="rtl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
          <Briefcase className="h-6 w-6" />
          <span className="hidden sm:inline">منصة تاسكاتى</span>
          <span className="sm:hidden">تاسكاتى</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4">
          <NavLinks />
          
          {user ? (
            <>
              {profile?.user_type === 'client' && (
                <Link to="/projects/new">
                  <Button variant="outline" size="sm">
                    <PlusCircle className="h-4 w-4 ml-2" />
                    أضف مشروع
                  </Button>
                </Link>
              )}
              
              <NotificationBell />
              
              <Link to="/messages">
                <Button variant="ghost" size="icon">
                  <MessageSquare className="h-5 w-5" />
                </Button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {profile?.full_name?.charAt(0) || 'م'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{profile?.full_name}</p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {profile?.user_type === 'client' ? 'عميل' : 'مختص'}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                    <LayoutDashboard className="ml-2 h-4 w-4" />
                    لوحة التحكم
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="ml-2 h-4 w-4" />
                    الملف الشخصي
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="ml-2 h-4 w-4" />
                    تسجيل الخروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="ghost">تسجيل الدخول</Button>
              </Link>
              <Link to="/auth">
                <Button>إنشاء حساب</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Navigation */}
        <div className="flex md:hidden items-center gap-2">
          {user && (
            <>
              <NotificationBell />
              <Link to="/messages">
                <Button variant="ghost" size="icon">
                  <MessageSquare className="h-5 w-5" />
                </Button>
              </Link>
            </>
          )}
          
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[350px]">
              <SheetHeader>
                <SheetTitle className="text-right">القائمة</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-2 mt-6">
                <NavLinks isMobile />
                
                {user ? (
                  <>
                    <div className="border-t my-4" />
                    
                    {profile?.user_type === 'client' && (
                      <Link to="/projects/new" onClick={closeMobileMenu}>
                        <Button variant="outline" className="w-full justify-start">
                          <PlusCircle className="h-4 w-4 ml-2" />
                          أضف مشروع
                        </Button>
                      </Link>
                    )}
                    
                    <Link to="/dashboard" onClick={closeMobileMenu}>
                      <Button variant="ghost" className="w-full justify-start">
                        <LayoutDashboard className="h-4 w-4 ml-2" />
                        لوحة التحكم
                      </Button>
                    </Link>
                    
                    <Link to="/profile" onClick={closeMobileMenu}>
                      <Button variant="ghost" className="w-full justify-start">
                        <User className="h-4 w-4 ml-2" />
                        الملف الشخصي
                      </Button>
                    </Link>
                    
                    <div className="border-t my-4" />
                    
                    <div className="flex items-center gap-3 p-2">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {profile?.full_name?.charAt(0) || 'م'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{profile?.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {profile?.user_type === 'client' ? 'عميل' : 'مختص'}
                        </p>
                      </div>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-destructive hover:text-destructive"
                      onClick={() => {
                        closeMobileMenu();
                        handleSignOut();
                      }}
                    >
                      <LogOut className="h-4 w-4 ml-2" />
                      تسجيل الخروج
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="border-t my-4" />
                    <Link to="/auth" onClick={closeMobileMenu}>
                      <Button variant="ghost" className="w-full justify-start">تسجيل الدخول</Button>
                    </Link>
                    <Link to="/auth" onClick={closeMobileMenu}>
                      <Button className="w-full">إنشاء حساب</Button>
                    </Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;