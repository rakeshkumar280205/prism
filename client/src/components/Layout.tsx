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
  BarChart3
} from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, admin, logout } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Define navigation based on role
  const navItems = user ? [
    { label: "Home", href: "/home", icon: Home },
    { label: "Report Issue", href: "/report", icon: PlusCircle },
    { label: "My Issues", href: "/my-issues", icon: ClipboardList },
    { label: "Analytics", href: "/analytics", icon: BarChart3 },
    { label: "Profile", href: "/profile", icon: User },
  ] : admin ? [
    { label: "Dashboard", href: "/admin/dashboard", icon: ShieldCheck },
    { label: "Analytics", href: "/analytics", icon: BarChart3 },
    ...(admin.role === 'SUPER_ADMIN' ? [{ label: "Admins", href: "/super-admin/dashboard", icon: User }] : [])
  ] : [];

  const handleLogout = () => {
    logout.mutate();
  };

  if (!user && !admin) {
    // For auth pages, still show theme toggle
    return (
      <div className="min-h-screen flex flex-col dark:bg-slate-950">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-16 items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-2">
            <Link href={user ? "/home" : "/admin/dashboard"} className="flex items-center gap-2">
              <div className="bg-primary p-1.5 rounded-lg">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <span className="font-display font-bold text-xl tracking-tight text-slate-900">
                City<span className="text-primary">Voice</span>
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-4">
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
            <div className="h-6 w-px bg-slate-200 mx-2" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 font-medium hidden lg:block">
                Hi, {user?.name || admin?.name}
              </span>
              <ThemeToggle />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="text-slate-500 hover:text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </nav>

          {/* Mobile Controls */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
              <div className="flex flex-col gap-6 mt-8">
                <div className="flex items-center gap-2 px-2">
                  <div className="bg-primary p-1.5 rounded-lg">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-display font-bold text-xl">CityVoice</span>
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
                    Logout
                  </Button>
                </div>
              </div>
            </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 md:px-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-6 md:py-8">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left text-sm text-muted-foreground">
          <p>© 2024 CityVoice Municipal Services. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-primary transition-colors">Contact Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
