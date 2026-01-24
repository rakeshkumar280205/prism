import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import { I18nContext, Language, translations } from "./lib/i18n";
import { useState, useEffect, Component, ErrorInfo, ReactNode } from "react";

// Pages
import AuthPage from "@/pages/AuthPage";
import RegisterPage from "@/pages/RegisterPage";
import Home from "@/pages/Home";
import ReportIssue from "@/pages/ReportIssue";
import ProfilePage from "@/pages/ProfilePage";
import MyIssuesPage from "@/pages/MyIssuesPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import AdminDashboard from "@/pages/AdminDashboard";
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";
import AuditLogs from "@/pages/AuditLogs";
import NotFound from "@/pages/not-found";

// Error Boundary to prevent blank pages from crashes
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error Boundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h1>
            <p className="text-slate-600 mb-4">An unexpected error occurred. Please try refreshing the page.</p>
            <button
              onClick={() => window.location.href = "/"}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={AuthPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/home" component={Home} />
        <Route path="/report" component={ReportIssue} />
        <Route path="/my-issues" component={MyIssuesPage} />
        <Route path="/analytics" component={AnalyticsPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/super-admin/dashboard" component={SuperAdminDashboard} />
        <Route path="/super-admin/audit-logs" component={AuditLogs} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("app_lang");
    // Validate language value is one of supported languages
    const validLanguages: Language[] = ["en", "kn"];
    return (saved && validLanguages.includes(saved as Language)) ? (saved as Language) : "en";
  });

  useEffect(() => {
    localStorage.setItem("app_lang", language);
  }, [language]);

  const t = (key: keyof typeof translations.en) => {
    return translations[language][key] || translations.en[key] || key;
  };

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <I18nContext.Provider value={{ language, setLanguage, t }}>
            <Router />
            <Toaster />
          </I18nContext.Provider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
