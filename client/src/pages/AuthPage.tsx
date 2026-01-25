import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MapPin, ShieldCheck, User, Building2, Eye, EyeOff } from "lucide-react";
import { useI18n } from "@/lib/i18n";

import prismLogo from "@assets/image_1767338273702.jpeg";

export default function AuthPage() {
  const { loginUser, loginAdmin, user, admin, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { language, t } = useI18n();

  const [userCreds, setUserCreds] = useState({ mobile: "", password: "" });
  const [adminCreds, setAdminCreds] = useState({ adminId: "", password: "" });
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Redirect to /home after successful login
  const [cookieError, setCookieError] = useState<string | null>(null);
  useEffect(() => {
    if (!isLoading && (user || admin)) {
      // Role-based redirect after /api/me resolves
      if (user && user.role === "user") {
        setLocation("/home");
      } else if (admin && admin.role === "admin") {
        setLocation("/admin/dashboard");
      } else if (admin && admin.role === "super-admin") {
        setLocation("/super-admin/dashboard");
      } else {
        // Unknown role, fallback to home
        setLocation("/home");
      }
    } else if (
      !isLoading &&
      (loginUser.isSuccess || loginAdmin.isSuccess) &&
      !user &&
      !admin
    ) {
      setCookieError(
        "Login succeeded, but your browser blocked session cookies.\n" +
        "This commonly happens in Incognito or when third-party cookies are disabled.\n" +
        "Please use a normal browser window or allow cookies for this site."
      );
    } else {
      setCookieError(null);
    }
  }, [isLoading, user, admin, setLocation, loginUser.isSuccess, loginAdmin.isSuccess]);

  const handleUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginUser.mutateAsync(userCreds);
    } catch (err: any) {
      toast({
        title: "Login Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginAdmin.mutateAsync(adminCreds);
    } catch (err: any) {
      toast({
        title: "Access Denied",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className={`min-h-screen grid lg:grid-cols-2 ${language === 'kn' ? 'font-kannada' : ''}`}>
      {cookieError && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 mb-4">
          <strong>Session Error:</strong>
          <br />
          {cookieError.split("\n").map((line, i) => (
            <span key={i}>{line}<br /></span>
          ))}
        </div>
      )}
      {/* Left Panel - Branding */}
      <div className="relative hidden lg:flex flex-col justify-between bg-primary p-10 text-primary-foreground overflow-hidden">
        <div className="z-10 flex items-center gap-3">
          <img src={prismLogo} alt="Prism Logo" className="h-12 w-12 object-cover bg-white rounded-full p-0.5" />
          <h1 className="text-3xl font-display font-bold">{t("app.name")}</h1>
        </div>

        <div className="z-10 max-w-lg space-y-6">
          <h2 className="text-4xl font-display font-bold leading-tight">
            {language === 'en' ? (
              <>Bengaluru Prism.<br />Civic Engagement Platform.</>
            ) : (
              <>ಬೆಂಗಳೂರು ಪ್ರಿಸಮ್.<br />ನಾಗರಿಕ ಸಹಭಾಗಿತ್ವದ ವೇದಿಕೆ.</>
            )}
          </h2>
          <p className="text-lg text-primary-foreground/80">
            {language === 'en'
              ? "A transparent lens into civic issues. Report problems, track resolutions, and help build a better city together."
              : "ನಾಗರಿಕ ಸಮಸ್ಯೆಗಳ ಮೇಲೆ ಪಾರದರ್ಶಕ ದೃಷ್ಟಿ. ಸಮಸ್ಯೆಗಳನ್ನು ವರದಿ ಮಾಡಿ, ಪರಿಹಾರಗಳನ್ನು ಗಮನಿಸಿ ಮತ್ತು ಒಟ್ಟಾಗಿ ಉತ್ತಮ ನಗರವನ್ನು ನಿರ್ಮಿಸಲು ಸಹಾಯ ಮಾಡಿ."
            }
          </p>
          <div className="flex gap-4 pt-4">
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm text-sm">
              <ShieldCheck className="h-5 w-5" />
              <span className="font-medium">{language === 'en' ? 'Secure' : 'ಸುರಕ್ಷಿತ'}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm text-sm">
              <Building2 className="h-5 w-5" />
              <span className="font-medium">{language === 'en' ? 'Direct to Govt' : 'ನೇರವಾಗಿ ಸರ್ಕಾರಕ್ಕೆ'}</span>
            </div>
          </div>
        </div>

        {/* Abstract Background Shapes */}
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-blue-400 opacity-20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-full w-full bg-gradient-to-t from-black/20 to-transparent" />
        <div className="z-10 text-sm opacity-60">© 2024 Municipal Corporation</div>
      </div>

      {/* Right Panel - Login Forms */}
      <div className="flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-3 justify-center mb-8">
            <img src={prismLogo} alt="Prism Logo" className="h-12 w-12 object-cover rounded-full border border-slate-200" />
            <h1 className="text-3xl font-display font-bold text-slate-900">{t("app.name")}</h1>
          </div>

          <Tabs defaultValue="citizen" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 h-12">
              <TabsTrigger value="citizen" className={`${language === 'kn' ? 'text-sm' : 'text-base'}`}>{t("auth.citizen_login")}</TabsTrigger>
              <TabsTrigger value="admin" className={`${language === 'kn' ? 'text-sm' : 'text-base'}`}>{t("auth.admin_login")}</TabsTrigger>
            </TabsList>

            <TabsContent value="citizen">
              <Card className="border-none shadow-xl">
                <CardHeader className="space-y-1">
                  <CardTitle className={`font-display ${language === 'kn' ? 'text-xl' : 'text-2xl'}`}>{t("auth.welcome_back")}</CardTitle>
                  <CardDescription className={language === 'kn' ? 'text-xs' : 'text-sm'}>{t("auth.mobile_desc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUserLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="mobile" className={language === 'kn' ? 'text-xs' : 'text-sm'}>{t("auth.mobile")}</Label>
                      <Input
                        id="mobile"
                        placeholder="e.g. 9876543210"
                        value={userCreds.mobile}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                          setUserCreds({ ...userCreds, mobile: value });
                        }}
                        maxLength={10}
                        inputMode="numeric"
                        required
                        className="h-11"
                        data-testid="input-mobile"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className={language === 'kn' ? 'text-xs' : 'text-sm'}>{t("auth.password")}</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showUserPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={userCreds.password}
                          onChange={(e) => setUserCreds({ ...userCreds, password: e.target.value })}
                          required
                          className="h-11 pr-10"
                          data-testid="input-user-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-500 hover:text-slate-700"
                          onClick={() => setShowUserPassword(!showUserPassword)}
                          data-testid="button-toggle-user-password"
                        >
                          {showUserPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <Button type="submit" className={`w-full h-11 ${language === 'kn' ? 'text-sm px-2' : 'text-base'}`} disabled={loginUser.isPending}>
                      {loginUser.isPending ? t("common.loading") : t("auth.login")}
                    </Button>
                    <div className="text-center text-sm text-muted-foreground mt-4">
                      {t("auth.no_account")} {" "}
                      <Link
                        href="/register"
                        className="text-primary hover:underline cursor-pointer font-medium"
                      >
                        {t("auth.register")}
                      </Link>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="admin">
              <Card className="border-none shadow-xl border-t-4 border-t-slate-800">
                <CardHeader className="space-y-1">
                  <CardTitle className={`font-display ${language === 'kn' ? 'text-xl' : 'text-2xl'}`}>{t("auth.admin_access")}</CardTitle>
                  <CardDescription className={language === 'kn' ? 'text-xs' : 'text-sm'}>{t("auth.admin_desc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAdminLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="adminId" className={language === 'kn' ? 'text-xs' : 'text-sm'}>{t("auth.admin_id")}</Label>
                      <Input
                        id="adminId"
                        placeholder="e.g. ADM-2024-001"
                        value={adminCreds.adminId}
                        onChange={(e) => setAdminCreds({ ...adminCreds, adminId: e.target.value })}
                        required
                        className="h-11 font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adminPass" className={language === 'kn' ? 'text-xs' : 'text-sm'}>{t("auth.password")}</Label>
                      <div className="relative">
                        <Input
                          id="adminPass"
                          type={showAdminPassword ? "text" : "password"}
                          value={adminCreds.password}
                          onChange={(e) => setAdminCreds({ ...adminCreds, password: e.target.value })}
                          required
                          className="h-11 pr-10"
                          data-testid="input-admin-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-500 hover:text-slate-700"
                          onClick={() => setShowAdminPassword(!showAdminPassword)}
                          data-testid="button-toggle-admin-password"
                        >
                          {showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <Button type="submit" className={`w-full h-11 bg-slate-900 hover:bg-slate-800 ${language === 'kn' ? 'text-sm px-2' : 'text-base'}`} disabled={loginAdmin.isPending}>
                      {loginAdmin.isPending ? t("common.loading") : t("auth.admin_login_btn")}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
