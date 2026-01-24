import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  Menu,
  X,
  Home,
  PlusCircle,
  User,
  ShieldCheck,
  MapPin,
  AlertTriangle,
  ClipboardList,
  BarChart3,
  Languages
} from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useI18n } from "@/lib/i18n";

import prismLogo from "@assets/image_1767338273702.jpeg";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, admin, logout, isLoading } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { language, setLanguage, t } = useI18n();

  // Define navigation based on role (only after auth loading completes)
  const navItems = !isLoading && user ? [
    { label: t("nav.home"), href: "/home", icon: Home },
    { label: t("nav.report"), href: "/report", icon: PlusCircle },
    { label: t("nav.my_issues"), href: "/my-issues", icon: ClipboardList },
    { label: t("nav.analytics"), href: "/analytics", icon: BarChart3 },
    { label: t("nav.profile"), href: "/profile", icon: User },
  ] : !isLoading && admin ? [
    { label: t("nav.dashboard"), href: "/admin/dashboard", icon: ShieldCheck },
    { label: t("nav.analytics"), href: "/analytics", icon: BarChart3 },
    ...(admin.role === 'SUPER_ADMIN' ? [
      { label: t("nav.admins"), href: "/super-admin/dashboard", icon: User },
      { label: t("nav.audit_logs"), href: "/super-admin/audit-logs", icon: ClipboardList }
    ] : [])
  ] : [];

  const handleLogout = () => {
    logout.mutate();
  };

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "kn" : "en");
  };

  const LanguageToggle = () => (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-2 border-slate-200 hover:border-primary hover:text-primary transition-all px-3 h-9"
      data-testid="button-language-toggle"
    >
      <Languages className="h-4 w-4" />
      <span className="font-medium">{language === "en" ? "ಕನ್ನಡ" : "English"}</span>
    </Button>
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-16 items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-2">
            <Link href={user ? "/home" : (admin ? "/admin/dashboard" : "/")} className="flex items-center gap-2">
              <img src={prismLogo} alt="Prism Logo" className="h-10 w-10 object-cover rounded-full border border-slate-200" />
              <span className="font-display font-bold text-lg md:text-xl tracking-tight text-slate-900 whitespace-nowrap">
                {t("app.name")}
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-4 lg:gap-6 overflow-x-auto no-scrollbar">
            <nav className="flex items-center gap-4 lg:gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary
                    ${location === item.href ? "text-primary" : "text-muted-foreground"}`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="h-6 w-px bg-slate-200 mx-2" />
            <div className="flex items-center gap-4">
              <LanguageToggle />
              {!isLoading && (user || admin) && (
                <>
                  <span className="text-sm text-slate-600 font-medium hidden lg:block">
                    {t("nav.hi")}, {user?.name || admin?.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="text-slate-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {t("nav.logout")}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Mobile Menu Trigger & Non-logged-in Language Toggle */}
          <div className="flex md:hidden items-center gap-3">
            {!user && !admin && <LanguageToggle />}
            {(user || admin) && (
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                  <div className="flex flex-col gap-6 mt-8">
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-2">
                        <img src={prismLogo} alt="Prism Logo" className="h-10 w-10 object-cover rounded-full border border-slate-200" />
                        <span className="font-display font-bold text-xl">{t("app.name")}</span>
                      </div>
                      <LanguageToggle />
                    </div>

                    <div className="flex flex-col gap-1">
                      {navItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                            ${location === item.href ? "bg-primary/10 text-primary" : "hover:bg-slate-100 text-slate-600"}`}
                        >
                          <item.icon className="h-5 w-5" />
                          {item.label}
                        </Link>
                      ))}
                    </div>

                    <div className="mt-auto border-t pt-6">
                      <div className="flex items-center gap-3 px-2 mb-4">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{user?.name || admin?.name}</p>
                          <p className="text-xs text-muted-foreground">{user ? "Resident" : "Administrator"}</p>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        className="w-full justify-start"
                        onClick={handleLogout}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        {t("nav.logout")}
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 md:px-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-6 md:py-8">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left text-sm text-muted-foreground px-4 md:px-8">
          <p>{t("footer.rights")}</p>
          <div className="flex items-center gap-4">
            <Link href="#" className="hover:text-primary transition-colors">{t("footer.privacy")}</Link>
            <Link href="#" className="hover:text-primary transition-colors">{t("footer.terms")}</Link>
            <Link href="#" className="hover:text-primary transition-colors">{t("footer.contact")}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
