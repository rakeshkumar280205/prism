import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@/api-contract";
import { withBase } from "@/lib/api";

export function useAdmins() {
  const queryClient = useQueryClient();

  const { data: admins, isLoading } = useQuery({
    queryKey: [api.admins.list.path],
    queryFn: async () => {
      const res = await fetch(withBase(api.admins.list.path), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch admins");
      return await res.json();
    },
  });

  const createAdminMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(withBase(api.admins.create.path), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create admin");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admins.list.path] });
    },
  });

  const updateAdminMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(withBase(`/api/admins/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update admin");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admins.list.path] });
    },
  });

  const deleteAdminMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(withBase(`/api/admins/${id}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete admin");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admins.list.path] });
    },
  });

  return {
    admins: admins || [],
    isLoading,
    createAdmin: createAdminMutation,
    updateAdmin: updateAdminMutation,
    deleteAdmin: deleteAdminMutation,
  };
}
