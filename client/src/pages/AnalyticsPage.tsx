import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useSocket } from "@/hooks/use-socket";
import { BarChart3, TrendingUp, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { withBase } from "@/lib/api";

interface AnalyticsData {
  totalIssues: number;
  pendingCount: number;
  inProgressCount: number;
  resolvedCount: number;
  categoryDistribution: Array<{ name: string; value: number }>;
  wardDistribution: Array<{ name: string; value: number }>;
  monthlyTrend: Array<{ month: string; count: number }>;
}

const COLORS = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#EC4899"];

export default function AnalyticsPage() {
  const { language, t } = useI18n();
  const { user, admin, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Check authentication after auth finishes loading
  useEffect(() => {
    if (!isLoading && !user && !admin) {
      setLocation("/");
    }
  }, [isLoading, user, admin, setLocation]);

  if (isLoading) {
    return <div className="p-8 text-center text-slate-600">Loading...</div>;
  }

  if (!user && !admin) {
    return <div className="p-8 text-center text-slate-600">Redirecting...</div>;
  }

  // Gate socket connection: only enable when authenticated
  const socket = useSocket({ enabled: !isLoading && (!!user || !!admin) });

  // Fetch analytics only after auth is confirmed
  useEffect(() => {
    if (!isLoading && (user || admin)) {
      fetchAnalytics();
    }
  }, [isLoading, user, admin]);

  // Refresh analytics whenever issue events occur (create/update/delete/vote)
  useEffect(() => {
    if (!socket || !socket.connected) return;

    const events = ["issue:new", "issue:update", "issue:delete", "issue:vote"] as const;
    const handler = () => fetchAnalytics();

    events.forEach((event) => socket.on(event, handler));
    return () => {
      events.forEach((event) => socket.off(event, handler));
    };
  }, [socket]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch(withBase("/api/analytics"), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = () => {
    if (user) return `${t("common.ward")} ${user.ward} ${t("analytics.title")}`;
    if (admin?.role === "SUPER_ADMIN") return `All Issues ${t("analytics.title")}`;
    if (admin?.wardAssigned) return `${t("common.ward")} ${admin.wardAssigned} ${t("analytics.title")}`;
    return `${t("common.ward")} ${t("analytics.title")}`;
  };

  if (loading) {
    return (
      <div className={`space-y-8 ${language === 'kn' ? 'font-kannada' : ''}`}>
        <h1 className={`font-display font-bold ${language === 'kn' ? 'text-2xl' : 'text-3xl'}`}>{getRoleLabel()}</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={`text-center py-10 ${language === 'kn' ? 'font-kannada' : ''}`}>
        <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-600">No analytics data available yet.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${language === 'kn' ? 'font-kannada' : ''}`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-primary p-2 rounded-lg">
          <BarChart3 className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className={`font-display font-bold ${language === 'kn' ? 'text-2xl' : 'text-3xl'}`}>{getRoleLabel()}</h1>
          <p className={`text-slate-600 text-sm ${language === 'kn' ? 'text-xs' : ''}`}>{t("analytics.subtitle")}</p>
        </div>
      </div>

      {/* Key Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200" data-testid="card-total-issues">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className={`font-medium ${language === 'kn' ? 'text-xs' : 'text-sm'}`}>{t("analytics.total")}</CardTitle>
            <div className="bg-blue-100 p-2 rounded-lg">
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" data-testid="stat-total-issues">{analytics.totalIssues}</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200" data-testid="card-pending-issues">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className={`font-medium ${language === 'kn' ? 'text-xs' : 'text-sm'}`}>{t("analytics.pending")}</CardTitle>
            <div className="bg-amber-100 p-2 rounded-lg">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600" data-testid="stat-pending-issues">{analytics.pendingCount}</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200" data-testid="card-in-progress-issues">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className={`font-medium ${language === 'kn' ? 'text-xs' : 'text-sm'}`}>{t("analytics.progress")}</CardTitle>
            <div className="bg-purple-100 p-2 rounded-lg">
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600" data-testid="stat-in-progress-issues">{analytics.inProgressCount}</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200" data-testid="card-resolved-issues">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className={`font-medium ${language === 'kn' ? 'text-xs' : 'text-sm'}`}>{t("analytics.resolved")}</CardTitle>
            <div className="bg-green-100 p-2 rounded-lg">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600" data-testid="stat-resolved-issues">{analytics.resolvedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <Card className="border-slate-200 col-span-1 lg:col-span-2" data-testid="chart-monthly-trend">
          <CardHeader>
            <CardTitle className={language === 'kn' ? 'text-lg' : ''}>{t("analytics.trend")}</CardTitle>
            <CardDescription className={language === 'kn' ? 'text-xs' : ''}>
              {language === 'kn' ? 'ಕಳೆದ 12 ತಿಂಗಳುಗಳ ವರದಿಗಳು' : 'Issue reports over the last 12 months'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: "8px" }}
                  labelStyle={{ color: "#f1f5f9" }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3B82F6"
                  name={language === 'kn' ? 'ವರದಿಯಾದ ಸಮಸ್ಯೆಗಳು' : 'Issues Reported'}
                  strokeWidth={2}
                  dot={{ fill: "#3B82F6", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card className="border-slate-200" data-testid="chart-category-distribution">
          <CardHeader>
            <CardTitle className={language === 'kn' ? 'text-lg' : ''}>{t("analytics.category")}</CardTitle>
            <CardDescription className={language === 'kn' ? 'text-xs' : ''}>
              {language === 'kn' ? 'ವರ್ಗಗಳ ಆಧಾರದ ಮೇಲೆ ಸಮಸ್ಯೆಗಳು' : 'Issues by category'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.categoryDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.categoryDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics.categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-slate-500 py-10">No category data</p>
            )}
          </CardContent>
        </Card>

        {/* Resolution Rate */}
        <Card className="border-slate-200" data-testid="chart-resolution-rate">
          <CardHeader>
            <CardTitle className={language === 'kn' ? 'text-lg' : ''}>{t("analytics.status")}</CardTitle>
            <CardDescription className={language === 'kn' ? 'text-xs' : ''}>
              {language === 'kn' ? 'ವರದಿಯಾದ ಎಲ್ಲಾ ಸಮಸ್ಯೆಗಳ ಪ್ರಸ್ತುತ ಸ್ಥಿತಿ' : 'Current state of all reported problems'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: t("analytics.pending"), value: analytics.pendingCount },
                    { name: t("analytics.progress"), value: analytics.inProgressCount },
                    { name: t("analytics.resolved"), value: analytics.resolvedCount }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#F59E0B" />
                  <Cell fill="#8B5CF6" />
                  <Cell fill="#10B981" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
