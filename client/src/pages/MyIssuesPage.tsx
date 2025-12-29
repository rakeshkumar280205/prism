import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { IssueCard } from "@/components/IssueCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIssues } from "@/hooks/use-issues";
import { useSocket } from "@/hooks/use-socket";
import { Search } from "lucide-react";
import { useState } from "react";

export default function MyIssuesPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  useSocket(); // Real-time updates

  if (!user) {
    setLocation("/");
    return null;
  }

  // Fetch only this user's issues
  const { data: issues, isLoading } = useIssues(
    statusFilter !== "all" 
      ? { createdBy: user.id.toString(), status: statusFilter }
      : { createdBy: user.id.toString() }
  );

  const filteredIssues = issues?.filter(issue => 
    issue.title.toLowerCase().includes(search.toLowerCase()) ||
    issue.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-display font-bold text-slate-900 mb-2">My Reported Issues</h1>
        <p className="text-slate-600">Track the status of issues you've reported</p>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by title or description..." 
            className="pl-9" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-my-issues"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
            <SelectValue placeholder="Filter Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Issues Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <p className="col-span-full text-center py-10 text-slate-500">Loading your issues...</p>
        ) : filteredIssues?.length === 0 ? (
          <p className="col-span-full text-center py-10 text-slate-500">
            {issues?.length === 0 ? "You haven't reported any issues yet." : "No issues match your filters."}
          </p>
        ) : (
          filteredIssues?.map((issue) => (
            <IssueCard 
              key={issue.id} 
              issue={issue}
              data-testid={`card-issue-${issue.id}`}
            />
          ))
        )}
      </div>
    </div>
  );
}
