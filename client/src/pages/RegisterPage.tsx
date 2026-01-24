import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function RegisterPage() {
  const { register } = useAuth();
  const { toast } = useToast();
  const { language, t } = useI18n();

  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    password: "",
    email: "",
    address: "",
    ward: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register.mutateAsync(formData);
      toast({
        title: t("reg.success"),
        description: "Please login with your credentials.",
      });
    } catch (err: any) {
      toast({
        title: t("reg.failed"),
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-slate-50 p-4 ${language === 'kn' ? 'font-kannada' : ''}`}>
      <Card className="w-full max-w-2xl shadow-xl border-slate-200">
        <CardHeader className="space-y-2 border-b bg-white rounded-t-xl pb-6">
          <div className="flex items-center gap-4 mb-2">
            <Link href="/" className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors">
              <ChevronLeft className="h-5 w-5 text-slate-500" />
            </Link>
            <div>
              <CardTitle className={`font-display text-slate-900 ${language === 'kn' ? 'text-xl' : 'text-2xl'}`}>{t("reg.title")}</CardTitle>
              <CardDescription className={language === 'kn' ? 'text-xs' : 'text-sm'}>{t("reg.subtitle")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-8">
          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name" className={language === 'kn' ? 'text-xs' : 'text-sm'}>{t("reg.name")} <span className="text-red-500">*</span></Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile" className={language === 'kn' ? 'text-xs' : 'text-sm'}>{t("reg.mobile")} <span className="text-red-500">*</span></Label>
              <Input
                id="mobile"
                required
                type="tel"
                value={formData.mobile}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setFormData({ ...formData, mobile: value });
                }}
                placeholder="9876543210"
                maxLength={10}
                data-testid="input-mobile"
              />
              <p className="text-xs text-slate-500">{t("reg.mobile_help")}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className={language === 'kn' ? 'text-xs' : 'text-sm'}>{t("reg.email")}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ward" className={language === 'kn' ? 'text-xs' : 'text-sm'}>{t("reg.ward")} <span className="text-red-500">*</span></Label>
              <Input
                id="ward"
                required
                type="number"
                min="1"
                max="200"
                value={formData.ward}
                onChange={(e) => {
                  const value = e.target.value;
                  const num = value ? parseInt(value) : "";
                  if (num === "" || (num >= 1 && num <= 200)) {
                    setFormData({ ...formData, ward: String(num === "" ? "" : num) });
                  }
                }}
                placeholder="Enter ward number (1-200)"
                data-testid="input-ward"
              />
              <p className="text-xs text-slate-500">{t("reg.ward_help")}</p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address" className={language === 'kn' ? 'text-xs' : 'text-sm'}>{t("reg.address")}</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="House No, Street, Landmark"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="password" className={language === 'kn' ? 'text-xs' : 'text-sm'}>{t("reg.create_password")} <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={t("reg.min_chars")}
                  className="pr-10"
                  data-testid="input-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-500 hover:text-slate-700"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="md:col-span-2 pt-4">
              <Button type="submit" className={`w-full h-11 ${language === 'kn' ? 'text-sm' : 'text-base'}`} disabled={register.isPending}>
                {register.isPending ? t("reg.creating") : t("reg.create_account")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
