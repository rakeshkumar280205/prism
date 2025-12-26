import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type UpdateIssueStatusRequest } from "@shared/routes";

export function useIssues(filters?: { ward?: string; status?: string; category?: string }) {
  // Serialize params for query key
  const queryKey = [api.issues.list.path, filters ? JSON.stringify(filters) : "all"];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const url = filters 
        ? `${api.issues.list.path}?${new URLSearchParams(filters as any).toString()}`
        : api.issues.list.path;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch issues");
      return api.issues.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateIssue() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch(api.issues.create.path, {
        method: "POST",
        body: formData, // Browser sets Content-Type to multipart/form-data automatically
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create issue");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.issues.list.path] });
    },
  });
}

export function useUpdateIssueStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const url = buildUrl(api.issues.updateStatus.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.issues.list.path] });
    },
  });
}

export function useVoteIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.issues.vote.path, { id });
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) throw new Error("Failed to vote");
      return res.json();
    },
    onSuccess: () => {
      // Invalidate list to refresh vote counts
      queryClient.invalidateQueries({ queryKey: [api.issues.list.path] });
    },
  });
}

export function useDeleteIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.issues.delete.path, { id });
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete issue");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.issues.list.path] });
    },
  });
}
