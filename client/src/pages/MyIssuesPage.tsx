import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { IssueCard } from "@/components/IssueCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useIssues } from "@/hooks/use-issues";
import { useSocket } from "@/hooks/use-socket";
import { useToast } from "@/hooks/use-toast";
import { Search, Edit2, Trash2 } from "lucide-react";
import { useState } from "react";
import { EditIssueDialog } from "@/components/EditIssueDialog";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function MyIssuesPage() {
  const { language, t } = useI18n();
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editingIssue, setEditingIssue] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  useSocket(); // Real-time updates

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/");
    }
  }, [isLoading, user, setLocation]);

  if (isLoading || !user) return null;

  const { data: issues, isLoading: issuesLoading, refetch } = useIssues(
    statusFilter !== "all"
      ? { status: statusFilter } as any
      : undefined
  );

  const filteredIssues = issues?.filter(issue =>
    (issue.createdBy === user.id) && (
      issue.title.toLowerCase().includes(search.toLowerCase()) ||
      issue.description.toLowerCase().includes(search.toLowerCase())
    )
  );

  const handleEdit = (issue: any) => {
    setEditingIssue(issue);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async (formData: FormData) => {
    setIsSaving(true);
    try {
      await apiRequest("PATCH", `/api/issues/${editingIssue.id}`, formData);
      toast({ title: "Success", description: "Issue updated successfully" });
      setIsEditDialogOpen(false);
      refetch();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (issueId: number) => {
    try {
      await apiRequest("DELETE", `/api/issues/${issueId}`);
      toast({ title: "Success", description: "Issue deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/issues"] });
      refetch();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className={`space-y-6 ${language === 'kn' ? 'font-kannada' : ''}`}>
      <div className="text-center mb-8">
        <h1 className={`font-display font-bold text-slate-900 mb-2 ${language === 'kn' ? 'text-2xl' : 'text-3xl'}`}>{t("my_issues.title")}</h1>
        <p className={`text-slate-600 ${language === 'kn' ? 'text-sm' : ''}`}>{t("my_issues.subtitle")}</p>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col sm:flex-row gap-4 sticky top-16 md:top-20 z-30">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("my_issues.search")}
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-my-issues"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status-filter">
            <SelectValue placeholder={t("common.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")} {t("common.status")}</SelectItem>
            <SelectItem value="Pending">{t("analytics.pending")}</SelectItem>
            <SelectItem value="In Progress">{t("analytics.progress")}</SelectItem>
            <SelectItem value="Resolved">{t("analytics.resolved")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Issues Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {issuesLoading ? (
          <p className="col-span-full text-center py-10 text-slate-500">{t("common.loading")}</p>
        ) : filteredIssues?.length === 0 ? (
          <p className={`col-span-full text-center py-10 text-slate-500 ${language === 'kn' ? 'text-sm' : ''}`}>
            {issues?.length === 0 ? t("my_issues.no_issues") : t("my_issues.no_match")}
          </p>
        ) : (
          filteredIssues?.map((issue) => (
            <div key={issue.id} className="relative group">
              <IssueCard
                issue={issue}
                data-testid={`card-issue-${issue.id}`}
              />
              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="outline"
                  className="bg-white shadow-md"
                  onClick={() => handleEdit(issue)}
                  data-testid={`button-edit-issue-${issue.id}`}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="shadow-md"
                      data-testid={`button-delete-issue-${issue.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{language === 'kn' ? 'ನೀವು ಖಚಿತವಾಗಿದ್ದೀರಾ?' : 'Are you absolutely sure?'}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {language === 'kn' ? 'ಈ ಕ್ರಮವನ್ನು ರದ್ದುಗೊಳಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ.' : 'This action cannot be undone.'}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("report.cancel")}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(issue.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {language === 'kn' ? 'ಅಳಿಸಿ' : 'Delete'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))
        )}
      </div>

      {editingIssue && (
        <EditIssueDialog
          issue={editingIssue}
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditingIssue(null);
          }}
          onSave={handleSaveEdit}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
