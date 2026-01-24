import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { type AuditLog } from "@/schemas";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { format } from "date-fns";
import { ClipboardList, User, Activity, Target, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuditLogs() {
  const { admin, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch logs only after auth is confirmed and user is super-admin
  const { data: logs, isLoading: logsLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit-logs"],
    enabled: !isLoading && !!admin && admin.role === "SUPER_ADMIN",
  });

  // Redirect if not super-admin after auth loading completes
  useEffect(() => {
    if (!isLoading && (!admin || admin.role !== "SUPER_ADMIN")) {
      setLocation("/");
    }
  }, [isLoading, admin, setLocation]);

  // Show loading state during auth rehydration
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center text-slate-600">Loading...</div>
      </div>
    );
  }

  // Prevent render if unauthorized (useEffect handles redirect)
  if (!admin || admin.role !== "SUPER_ADMIN") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center text-slate-600">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-2">
          <ClipboardList className="h-8 w-8 text-primary" />
          System Audit Logs
        </h1>
        <p className="text-slate-500">Track all administrative actions and system changes</p>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="text-lg font-medium">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[200px]"><Clock className="inline h-4 w-4 mr-1" /> Timestamp</TableHead>
                <TableHead><User className="inline h-4 w-4 mr-1" /> Actor</TableHead>
                <TableHead><Activity className="inline h-4 w-4 mr-1" /> Action</TableHead>
                <TableHead><Target className="inline h-4 w-4 mr-1" /> Target</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logsLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">Loading logs...</TableCell>
                </TableRow>
              ) : logs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-slate-500">No audit logs found.</TableCell>
                </TableRow>
              ) : (
                logs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">
                      {log.createdAt ? format(new Date(log.createdAt), "MMM d, yyyy HH:mm:ss") : "N/A"}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{log.actorName}</span>
                      <span className="ml-2 text-xs text-slate-400">({log.actorType})</span>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 uppercase tracking-wider">
                        {log.action.replace("_", " ")}
                      </span>
                    </TableCell>
                    <TableCell>
                      {log.targetType ? (
                        <span className="text-sm">
                          {log.targetType} <span className="text-slate-400 font-mono">#{log.targetId}</span>
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 max-w-xs truncate" title={log.details || ""}>
                      {log.details || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
