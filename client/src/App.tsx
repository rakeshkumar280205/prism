import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import { I18nContext, Language, translations } from "./lib/i18n";
import { useState, useEffect } from "react";

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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <I18nContext.Provider value={{ language, setLanguage, t }}>
          <Router />
          <Toaster />
        </I18nContext.Provider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
