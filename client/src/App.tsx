import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
import Layout from "@/components/Layout";

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
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
