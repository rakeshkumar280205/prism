import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft } from "lucide-react";

export default function RegisterPage() {
  const { register } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    password: "",
    email: "",
    address: "",
    ward: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register.mutateAsync(formData);
      toast({
        title: "Registration Successful",
        description: "Please login with your credentials.",
      });
      setLocation("/");
    } catch (err: any) {
      toast({
        title: "Registration Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-2xl shadow-xl border-slate-200">
        <CardHeader className="space-y-2 border-b bg-white rounded-t-xl pb-6">
          <div className="flex items-center gap-4 mb-2">
             <Link href="/" className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors">
               <ChevronLeft className="h-5 w-5 text-slate-500" />
             </Link>
             <div>
               <CardTitle className="text-2xl font-display text-slate-900">Citizen Registration</CardTitle>
               <CardDescription>Join CityVoice to report issues and improve your neighborhood</CardDescription>
             </div>
          </div>
        </CardHeader>
        <CardContent className="pt-8">
          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
              <Input 
                id="name" 
                required 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Number <span className="text-red-500">*</span></Label>
              <Input 
                id="mobile" 
                required 
                value={formData.mobile}
                onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                placeholder="9876543210"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="john@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ward">Ward Number <span className="text-red-500">*</span></Label>
              <Select 
                onValueChange={(val) => setFormData({...formData, ward: val})}
                value={formData.ward}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Ward" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 15 }, (_, i) => i + 1).map(n => (
                    <SelectItem key={n} value={String(n)}>Ward {n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Residential Address</Label>
              <Input 
                id="address" 
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                placeholder="House No, Street, Landmark"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="password">Create Password <span className="text-red-500">*</span></Label>
              <Input 
                id="password" 
                type="password" 
                required 
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="Min 6 characters"
              />
            </div>

            <div className="md:col-span-2 pt-4">
              <Button type="submit" className="w-full h-11 text-base" disabled={register.isPending}>
                {register.isPending ? "Creating Account..." : "Create Account"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
