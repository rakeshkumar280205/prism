import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api, buildUrl } from "@/api-contract";
import { type LoginUserRequest, type LoginAdminRequest, type InsertUser } from "@/schemas";
import { withBase } from "@/lib/api";

export function useAuth() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: user, isLoading, error } = useQuery({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      const res = await fetch(withBase(api.auth.me.path), {
        credentials: "include",
      });
      if (res.status === 401) return null; // No active session
      if (!res.ok) throw new Error("Failed to fetch session");
      return await res.json(); // Returns { user?: ..., admin?: ... }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 mins
  });

  const loginUserMutation = useMutation({
    mutationFn: async (credentials: LoginUserRequest) => {
      const res = await fetch(withBase(api.auth.loginUser.path), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
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
      const res = await fetch(withBase(api.auth.loginAdmin.path), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
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
      await fetch(withBase(api.auth.logout.path), { method: "POST", credentials: "include" });
    },
    onSuccess: () => {
      queryClient.setQueryData([api.auth.me.path], null);
      setLocation("/"); // Navigate to login without page reload
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      const res = await fetch(withBase(api.users.register.path), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
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
      const res = await fetch(withBase(api.users.updateProfile.path), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
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
