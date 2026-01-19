import { useEffect } from "react";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

const socket = io("/", {
  path: "/socket.io",
  autoConnect: false,
});

let activeHooks = 0;

export function useSocket() {
  const queryClient = useQueryClient();

  useEffect(() => {
    activeHooks += 1;

    if (!socket.connected) {
      socket.connect();
    }

    const invalidateIssues = () => {
      queryClient.invalidateQueries({ queryKey: [api.issues.list.path] });
    };

    const events = ["issue:new", "issue:update", "issue:delete", "issue:vote"];
    events.forEach((event) => socket.on(event, invalidateIssues));

    return () => {
      events.forEach((event) => socket.off(event, invalidateIssues));
      activeHooks = Math.max(0, activeHooks - 1);
      if (activeHooks === 0) {
        socket.disconnect();
      }
    };
  }, [queryClient]);

  return socket;
}
