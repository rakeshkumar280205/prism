import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";

// Pages
import AuthPage from "@/pages/AuthPage";
import RegisterPage from "@/pages/RegisterPage";
import Home from "@/pages/Home";
import ReportIssue from "@/pages/ReportIssue";
import AdminDashboard from "@/pages/AdminDashboard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={AuthPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/home" component={Home} />
        <Route path="/report" component={ReportIssue} />
        <Route path="/profile" component={() => <div className="p-8 text-center">Profile Page Coming Soon</div>} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/super-admin/dashboard" component={() => <div className="p-8 text-center">Super Admin Dashboard Coming Soon</div>} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
