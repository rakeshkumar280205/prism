import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    address: "",
    ward: "",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isMounted, setIsMounted] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    if (!user) {
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
  }, [user, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMounted) return;
    try {
      await (updateProfile as any).mutateAsync(formData);
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      if (isMounted) {
        setIsEditing(false);
      }
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
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

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
          <CardDescription>Manage your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Mobile - Read Only */}
              <div>
                <Label htmlFor="mobile" className="text-slate-600">Mobile Number</Label>
                <Input
                  id="mobile"
                  type="text"
                  value={user.mobile}
                  disabled
                  className="bg-slate-50 text-slate-500"
                />
                <p className="text-xs text-slate-400 mt-1">Cannot be changed</p>
              </div>

              {/* Name */}
              <div>
                <Label htmlFor="name" className="text-slate-700">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => isEditing && setFormData({ ...formData, name: e.target.value })}
                  disabled={!isEditing}
                  className={isEditing ? "" : "bg-slate-50"}
                  data-testid="input-name"
                />
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email" className="text-slate-700">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => isEditing && setFormData({ ...formData, email: e.target.value })}
                  disabled={!isEditing}
                  className={isEditing ? "" : "bg-slate-50"}
                  data-testid="input-email"
                />
              </div>

              {/* Ward */}
              <div>
                <Label htmlFor="ward" className="text-slate-700">Ward</Label>
                <Input
                  id="ward"
                  type="text"
                  value={formData.ward}
                  onChange={(e) => isEditing && setFormData({ ...formData, ward: e.target.value })}
                  disabled={!isEditing}
                  className={isEditing ? "" : "bg-slate-50"}
                  placeholder="e.g., Ward 5"
                  data-testid="input-ward"
                />
              </div>
            </div>

            {/* Address - Full Width */}
            <div>
              <Label htmlFor="address" className="text-slate-700">Address</Label>
              <textarea
                id="address"
                value={formData.address}
                onChange={(e) => isEditing && setFormData({ ...formData, address: e.target.value })}
                disabled={!isEditing}
                className={`w-full px-3 py-2 border rounded-md text-sm resize-none h-24 ${
                  isEditing
                    ? "border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary"
                    : "bg-slate-50"
                }`}
                placeholder="Your street address"
                data-testid="textarea-address"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {!isEditing ? (
                <Button
                  type="button"
                  onClick={handleEdit}
                  className="gap-2"
                  data-testid="button-edit-profile"
                >
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button
                    type="submit"
                    disabled={(updateProfile as any).isPending}
                    className="gap-2"
                    data-testid="button-save-profile"
                  >
                    {(updateProfile as any).isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
