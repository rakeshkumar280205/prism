import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/api-contract";
import { useAuth } from "@/hooks/use-auth";

let socket: Socket | null = null;
let activeHooks = 0;

const createSocket = () =>
  io(import.meta.env.VITE_API_BASE_URL || window.location.origin, {
    path: "/socket.io",
    autoConnect: false,
    withCredentials: true,
  });

export function useSocket({ enabled = true } = {}) {
  const { user, admin, isLoading } = useAuth();
  const queryClient = useQueryClient();

  const authReady = !isLoading && (!!user || !!admin);
  const shouldEnable = Boolean(enabled && authReady);

  // Lazily create the socket only when auth is confirmed and the hook is enabled
  if (shouldEnable && !socket) {
    socket = createSocket();
  }

  useEffect(() => {
    if (!shouldEnable || !socket) {
      return;
    }

    activeHooks += 1;

    if (!socket.connected) {
      try {
        socket.connect();
      } catch (err) {
        console.error("Socket connection failed", err);
      }
    }

    const invalidateIssues = () => {
      // Invalidate all queries whose key starts with api.issues.list.path (including filtered)
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && key[0] === api.issues.list.path;
        }
      });
    };

    const events = ["issue:new", "issue:update", "issue:delete", "issue:vote"] as const;
    events.forEach((event) => socket?.on(event, invalidateIssues));

    return () => {
      events.forEach((event) => socket?.off(event, invalidateIssues));
      activeHooks = Math.max(0, activeHooks - 1);
      if (activeHooks === 0 && socket?.connected) {
        socket.disconnect();
      }
    };
  }, [queryClient, shouldEnable]);

  return shouldEnable ? socket : null;
}
