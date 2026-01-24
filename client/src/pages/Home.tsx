import { useState } from "react";
import { useIssues } from "@/hooks/use-issues";
import { useSocket } from "@/hooks/use-socket";
import { useAuth } from "@/hooks/use-auth";
import { IssueCard } from "@/components/IssueCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, RefreshCw, Loader2, Plus } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";

export default function Home() {
  const { language, t } = useI18n();
  const { user, admin, isLoading } = useAuth();
  const [filters, setFilters] = useState({
    ward: "all",
    category: "all",
    status: "all",
  });
  const [search, setSearch] = useState("");

  // HOOK CALL MUST COME BEFORE ANY EARLY RETURNS (React Rules of Hooks)
  useSocket({ enabled: !isLoading && (!!user || !!admin) });

  // Show loading state during auth rehydration
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center text-slate-600">Loading...</div>
      </div>
    );
  }

  // Prevent render if unauthorized (useEffect handles redirect)
  if (!user && !admin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center text-slate-600">Redirecting...</div>
      </div>
    );
  }

  const queryFilters = {
    ...(filters.ward !== "all" && { ward: filters.ward }),
    ...(filters.category !== "all" && { category: filters.category }),
    ...(filters.status !== "all" && { status: filters.status }),
  };

  const { data: issues, isLoading: issuesLoading, isError, error, refetch } = useIssues(queryFilters);

  const filteredIssues = issues?.filter(issue =>
    issue.title.toLowerCase().includes(search.toLowerCase()) ||
    issue.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`space-y-8 ${language === 'kn' ? 'font-kannada' : ''}`}>
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary to-blue-600 rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <h1 className={`font-display font-bold mb-4 ${language === 'kn' ? 'text-2xl md:text-4xl' : 'text-3xl md:text-5xl'}`}>
            {t("home.welcome")}
          </h1>
          <p className={`text-blue-100 mb-8 ${language === 'kn' ? 'text-base' : 'text-lg'}`}>
            {t("home.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/report">
              <Button size="lg" className={`bg-white text-primary hover:bg-blue-50 border-0 font-semibold shadow-lg ${language === 'kn' ? 'text-sm' : ''}`}>
                <Plus className="mr-2 h-5 w-5" /> {t("home.report_btn")}
              </Button>
            </Link>
          </div>
        </div>

        {/* Decorative background elements */}
        <div className="absolute right-0 top-0 h-64 w-64 bg-white opacity-10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-20 h-32 w-32 bg-blue-300 opacity-20 rounded-full blur-2xl"></div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border shadow-sm sticky top-16 md:top-20 z-30">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("home.search_placeholder")}
              className="pl-9 bg-slate-50 border-slate-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap lg:flex-nowrap gap-2 items-center">
            <Select value={filters.ward} onValueChange={(v) => setFilters({ ...filters, ward: v })}>
              <SelectTrigger className="w-full sm:w-[130px] bg-slate-50">
                <SelectValue placeholder={t("common.ward")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")} {t("common.ward")}</SelectItem>
                {Array.from({ length: 15 }, (_, i) => i + 1).map(n => (
                  <SelectItem key={n} value={String(n)}>{t("common.ward")} {n}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
              <SelectTrigger className="w-full sm:w-[130px] bg-slate-50">
                <SelectValue placeholder={t("common.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")} {t("common.status")}</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.category} onValueChange={(v) => setFilters({ ...filters, category: v })}>
              <SelectTrigger className="w-full sm:w-[130px] bg-slate-50">
                <SelectValue placeholder={t("report.category")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")} {t("report.category")}</SelectItem>
                <SelectItem value="Roads">Roads</SelectItem>
                <SelectItem value="Drainage">Drainage</SelectItem>
                <SelectItem value="Garbage">Garbage</SelectItem>
                <SelectItem value="Streetlights">Streetlights</SelectItem>
                <SelectItem value="Water Supply">Water Supply</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                className="bg-slate-50 shrink-0"
                data-testid="button-refresh-issues"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>

              {(search || filters.ward !== "all" || filters.category !== "all" || filters.status !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilters({ ward: 'all', category: 'all', status: 'all' });
                    setSearch('');
                    refetch();
                  }}
                  className={`bg-slate-50 flex-1 sm:flex-initial ${language === 'kn' ? 'text-[10px] px-2' : 'text-xs'}`}
                  data-testid="button-clear-all-filters"
                >
                  {t("home.clear_filters")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      {isError ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-red-50 p-6 rounded-full mb-4">
            <Filter className="h-10 w-10 text-red-400" />
          </div>
          <h3 className={`font-semibold text-slate-900 ${language === 'kn' ? 'text-lg' : 'text-xl'}`}>Failed to load issues</h3>
          <p className={`text-slate-500 max-w-sm mt-2 ${language === 'kn' ? 'text-xs' : 'text-sm'}`}>
            {error?.message || t("home.no_issues_desc")}
          </p>
          <Button className="mt-6" variant="outline" onClick={() => refetch()}>
            {t("home.clear_filters")}
          </Button>
        </div>
      ) : issuesLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex flex-col space-y-3">
              <Skeleton className="h-48 w-full rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredIssues?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-slate-100 p-6 rounded-full mb-4">
            <Filter className="h-10 w-10 text-slate-400" />
          </div>
          <h3 className={`font-semibold text-slate-900 ${language === 'kn' ? 'text-lg' : 'text-xl'}`}>{t("home.no_issues")}</h3>
          <p className={`text-slate-500 max-w-sm mt-2 ${language === 'kn' ? 'text-xs' : 'text-sm'}`}>
            {t("home.no_issues_desc")}
          </p>
          <Button className="mt-6" variant="outline" onClick={() => {
            setFilters({ ward: 'all', category: 'all', status: 'all' });
            setSearch('');
          }}>
            {t("home.clear_filters")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
          {filteredIssues?.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
}
