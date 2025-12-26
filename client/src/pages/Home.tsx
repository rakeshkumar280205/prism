import { useState } from "react";
import { useIssues } from "@/hooks/use-issues";
import { useSocket } from "@/hooks/use-socket";
import { IssueCard } from "@/components/IssueCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, RefreshCw, Loader2, Plus } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const [filters, setFilters] = useState({
    ward: "all",
    category: "all",
    status: "all",
  });
  const [search, setSearch] = useState("");

  useSocket(); // Listen for real-time updates

  const queryFilters = {
    ...(filters.ward !== "all" && { ward: filters.ward }),
    ...(filters.category !== "all" && { category: filters.category }),
    ...(filters.status !== "all" && { status: filters.status }),
  };

  const { data: issues, isLoading, refetch } = useIssues(queryFilters);

  const filteredIssues = issues?.filter(issue => 
    issue.title.toLowerCase().includes(search.toLowerCase()) ||
    issue.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary to-blue-600 rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl md:text-5xl font-display font-bold mb-4">
            Voice of the City
          </h1>
          <p className="text-blue-100 text-lg mb-8">
            Browse reported issues in your ward, vote for what matters, and see real-time progress from your municipal corporation.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
             <Link href="/report">
               <Button size="lg" className="bg-white text-primary hover:bg-blue-50 border-0 font-semibold shadow-lg">
                 <Plus className="mr-2 h-5 w-5" /> Report an Issue
               </Button>
             </Link>
          </div>
        </div>
        
        {/* Decorative background elements */}
        <div className="absolute right-0 top-0 h-64 w-64 bg-white opacity-10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-20 h-32 w-32 bg-blue-300 opacity-20 rounded-full blur-2xl"></div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border shadow-sm sticky top-20 z-30">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search issues..." 
              className="pl-9 bg-slate-50 border-slate-200" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            <Select value={filters.ward} onValueChange={(v) => setFilters({...filters, ward: v})}>
              <SelectTrigger className="w-[140px] bg-slate-50">
                <SelectValue placeholder="Ward" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Wards</SelectItem>
                {Array.from({ length: 15 }, (_, i) => i + 1).map(n => (
                  <SelectItem key={n} value={String(n)}>Ward {n}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={(v) => setFilters({...filters, status: v})}>
              <SelectTrigger className="w-[140px] bg-slate-50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.category} onValueChange={(v) => setFilters({...filters, category: v})}>
              <SelectTrigger className="w-[150px] bg-slate-50">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Roads">Roads</SelectItem>
                <SelectItem value="Drainage">Drainage</SelectItem>
                <SelectItem value="Garbage">Garbage</SelectItem>
                <SelectItem value="Streetlights">Streetlights</SelectItem>
                <SelectItem value="Water Supply">Water Supply</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={() => refetch()} className="bg-slate-50 shrink-0">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      {isLoading ? (
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
          <h3 className="text-xl font-semibold text-slate-900">No issues found</h3>
          <p className="text-slate-500 max-w-sm mt-2">
            Try adjusting your search or filters to see more results, or be the first to report an issue.
          </p>
          <Button className="mt-6" variant="outline" onClick={() => {
            setFilters({ ward: 'all', category: 'all', status: 'all' });
            setSearch('');
          }}>
            Clear Filters
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
