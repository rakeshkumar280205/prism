import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type LoginUserRequest, type LoginAdminRequest, type InsertUser } from "@shared/routes";

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      const res = await fetch(api.auth.me.path);
      if (res.status === 401) return null; // No active session
      if (!res.ok) throw new Error("Failed to fetch session");
      return await res.json(); // Returns { user?: ..., admin?: ... }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 mins
  });

  const loginUserMutation = useMutation({
    mutationFn: async (credentials: LoginUserRequest) => {
      const res = await fetch(api.auth.loginUser.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Login failed");
      }
      return await res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.auth.me.path] }),
  });

  const loginAdminMutation = useMutation({
    mutationFn: async (credentials: LoginAdminRequest) => {
      const res = await fetch(api.auth.loginAdmin.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Login failed");
      }
      return await res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.auth.me.path] }),
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch(api.auth.logout.path, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.setQueryData([api.auth.me.path], null);
      window.location.href = "/"; // Force redirect to login
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      const res = await fetch(api.users.register.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Registration failed");
      }
      return await res.json();
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<InsertUser>) => {
      const res = await fetch(api.users.updateProfile.path, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Profile update failed");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
    },
  });

  return {
    user: user?.user || null,
    admin: user?.admin || null,
    isLoading,
    loginUser: loginUserMutation,
    loginAdmin: loginAdminMutation,
    logout: logoutMutation,
    register: registerMutation,
    updateProfile: updateProfileMutation,
  };
}
