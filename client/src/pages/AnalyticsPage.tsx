import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useSocket } from "@/hooks/use-socket";
import { BarChart3, TrendingUp, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
  const { user, admin } = useAuth();
  const [, setLocation] = useLocation();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const socket = useSocket();

  // Check authentication
  if (!user && !admin) {
    setLocation("/");
    return null;
  }

  // Fetch analytics on mount
  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Listen for real-time updates
  useEffect(() => {
    if (!socket) return;

    socket.on("analytics:update", (data: AnalyticsData) => {
      setAnalytics(data);
    });

    return () => {
      socket.off("analytics:update");
    };
  }, [socket]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/analytics");
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
    if (user) return `Ward ${user.ward} Analytics`;
    if (admin?.role === "SUPER_ADMIN") return "All Issues Analytics";
    return "Ward Analytics";
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-display font-bold">{getRoleLabel()}</h1>
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
      <div className="text-center py-10">
        <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-600">No analytics data available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-primary p-2 rounded-lg">
          <BarChart3 className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold">{getRoleLabel()}</h1>
          <p className="text-slate-600 text-sm">Real-time issue tracking and trends</p>
        </div>
      </div>

      {/* Key Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200" data-testid="card-total-issues">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
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
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
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
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
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
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
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
            <CardTitle>Monthly Trend</CardTitle>
            <CardDescription>Issue reports over the last 12 months</CardDescription>
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
                  name="Issues Reported"
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
            <CardTitle>Category Distribution</CardTitle>
            <CardDescription>Issues by category</CardDescription>
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

        {/* Ward-wise Issues */}
        <Card className="border-slate-200" data-testid="chart-ward-distribution">
          <CardHeader>
            <CardTitle>Ward-wise Issues</CardTitle>
            <CardDescription>Issues reported by ward</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.wardDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.wardDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: "8px" }}
                    labelStyle={{ color: "#f1f5f9" }}
                  />
                  <Bar dataKey="value" fill="#3B82F6" name="Issues" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-slate-500 py-10">No ward data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
