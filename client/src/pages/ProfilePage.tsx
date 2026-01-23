import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function ProfilePage() {
  const { language, t } = useI18n();
  const { user, updateProfile, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    address: "",
    ward: "",
  });

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/");
      return;
    }
    setFormData({
      name: user.name || "",
      email: user.email || "",
      address: user.address || "",
      ward: user.ward || "",
    });
    setIsEditing(false);
  }, [isLoading, user, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing) return;

    try {
      await (updateProfile as any).mutateAsync(formData);
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      setIsEditing(false);
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(false);
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        address: user.address || "",
        ward: user.ward || "",
      });
    }
  };

  if (isLoading || !user) return null;

  return (
    <div className={`max-w-2xl mx-auto py-8 ${language === 'kn' ? 'font-kannada' : ''}`}>
      <Card>
        <CardHeader>
          <CardTitle className={language === 'kn' ? 'text-xl' : ''}>{t("profile.title")}</CardTitle>
          <CardDescription className={language === 'kn' ? 'text-xs' : ''}>{t("profile.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {!isEditing ? (
            // VIEW MODE
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Mobile - Read Only */}
                <div>
                  <Label className={`text-slate-600 ${language === 'kn' ? 'text-xs' : ''}`}>{t("reg.mobile")}</Label>
                  <div className="px-3 py-2 bg-slate-50 rounded border border-slate-200 text-slate-700">
                    {user.mobile}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{t("profile.mobile_help")}</p>
                </div>

                {/* Name */}
                <div>
                  <Label className={`text-slate-700 ${language === 'kn' ? 'text-xs' : ''}`}>{t("reg.name")}</Label>
                  <div className="px-3 py-2 bg-slate-50 rounded border border-slate-200 text-slate-700">
                    {formData.name || "Not provided"}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <Label className={`text-slate-700 ${language === 'kn' ? 'text-xs' : ''}`}>{t("reg.email")}</Label>
                  <div className="px-3 py-2 bg-slate-50 rounded border border-slate-200 text-slate-700">
                    {formData.email || "Not provided"}
                  </div>
                </div>

                {/* Ward */}
                <div>
                  <Label className={`text-slate-700 ${language === 'kn' ? 'text-xs' : ''}`}>{t("reg.ward")}</Label>
                  <div className="px-3 py-2 bg-slate-50 rounded border border-slate-200 text-slate-700">
                    {formData.ward || "Not provided"}
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <Label className={`text-slate-700 ${language === 'kn' ? 'text-xs' : ''}`}>{t("reg.address")}</Label>
                <div className="px-3 py-2 bg-slate-50 rounded border border-slate-200 text-slate-700 min-h-24 whitespace-pre-wrap">
                  {formData.address || "Not provided"}
                </div>
              </div>

              {/* Edit Button */}
              <Button
                onClick={handleEdit}
                className={`gap-2 ${language === 'kn' ? 'text-xs' : ''}`}
                data-testid="button-edit-profile"
              >
                {t("profile.edit")}
              </Button>
            </div>
          ) : (
            // EDIT MODE
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Mobile - Read Only */}
                <div>
                  <Label htmlFor="mobile" className={`text-slate-600 ${language === 'kn' ? 'text-xs' : ''}`}>{t("reg.mobile")}</Label>
                  <Input
                    id="mobile"
                    type="text"
                    value={user.mobile}
                    disabled
                    className="bg-slate-50 text-slate-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">{t("profile.mobile_help")}</p>
                </div>

                {/* Name */}
                <div>
                  <Label htmlFor="name" className={`text-slate-700 ${language === 'kn' ? 'text-xs' : ''}`}>{t("reg.name")}</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className=""
                    data-testid="input-name"
                    autoFocus
                  />
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="email" className={`text-slate-700 ${language === 'kn' ? 'text-xs' : ''}`}>{t("reg.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className=""
                    data-testid="input-email"
                  />
                </div>

                {/* Ward */}
                <div>
                  <Label htmlFor="ward" className={`text-slate-700 ${language === 'kn' ? 'text-xs' : ''}`}>{t("reg.ward")}</Label>
                  <Input
                    id="ward"
                    type="text"
                    value={formData.ward}
                    onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                    className=""
                    placeholder="e.g., Ward 5"
                    data-testid="input-ward"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <Label htmlFor="address" className={`text-slate-700 ${language === 'kn' ? 'text-xs' : ''}`}>{t("reg.address")}</Label>
                <textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Your street address"
                  data-testid="textarea-address"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={(updateProfile as any).isPending}
                  className={`gap-2 ${language === 'kn' ? 'text-xs' : ''}`}
                  data-testid="button-save-profile"
                >
                  {(updateProfile as any).isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("profile.save")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className={language === 'kn' ? 'text-xs' : ''}
                  data-testid="button-cancel-edit"
                >
                  {t("profile.cancel")}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
