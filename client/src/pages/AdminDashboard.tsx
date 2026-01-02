import { useState } from "react";
import { useIssues, useUpdateIssueStatus, useDeleteIssue } from "@/hooks/use-issues";
import { useSocket } from "@/hooks/use-socket";
import { IssueCard } from "@/components/IssueCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Search, BarChart3, PieChart, Users, CheckCircle2 } from "lucide-react";

export default function AdminDashboard() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const updateStatus = useUpdateIssueStatus();
  const deleteIssue = useDeleteIssue();
  const { toast } = useToast();
  useSocket(); // Real-time updates

  const { data: issues, isLoading } = useIssues(statusFilter !== "all" ? { status: statusFilter } : undefined);

  const handleStatusChange = async (id: number, status: string) => {
    const issue = issues?.find(i => i.id === id);
    if (!issue) return;

    try {
      await updateStatus.mutateAsync({ id, status });
      toast({ title: "Status Updated", description: `Issue marked as ${status}` });
    } catch (err) {
      toast({ title: "Update Failed", variant: "destructive" });
    }
  };

  const handleDeleteIssue = async (id: number) => {
    const issue = issues?.find(i => i.id === id);
    if (!issue) return;

    try {
      await deleteIssue.mutateAsync(id);
      toast({ title: "Issue Deleted", description: "The issue has been successfully removed." });
    } catch (err) {
      toast({ title: "Delete Failed", variant: "destructive" });
    }
  };

  const filteredIssues = issues?.filter(issue => 
    issue.title.toLowerCase().includes(search.toLowerCase()) ||
    issue.ward.toString().toLowerCase().includes(search.toLowerCase())
  );

  // Stats calculation
  const totalIssues = issues?.length || 0;
  const pendingIssues = issues?.filter(i => i.status === "Pending").length || 0;
  const resolvedIssues = issues?.filter(i => i.status === "Resolved").length || 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-500">
            {issues && issues.length > 0 ? `Managing Ward ${issues[0].ward}` : "Manage reported issues and update status"}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-lg text-primary">
            <PieChart className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Issues</p>
            <h3 className="text-2xl font-bold">{totalIssues}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Pending Action</p>
            <h3 className="text-2xl font-bold">{pendingIssues}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 rounded-lg text-green-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Resolved</p>
            <h3 className="text-2xl font-bold">{resolvedIssues}</h3>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by title or ward..." 
            className="pl-9" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
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
          <p>Loading issues...</p>
        ) : filteredIssues?.length === 0 ? (
          <p className="col-span-full text-center py-10 text-slate-500">No issues found.</p>
        ) : (
          filteredIssues?.map((issue) => (
            <IssueCard 
              key={issue.id} 
              issue={issue} 
              isAdmin 
              onStatusChange={handleStatusChange}
              onDelete={handleDeleteIssue}
            />
          ))
        )}
      </div>
    </div>
  );
}
