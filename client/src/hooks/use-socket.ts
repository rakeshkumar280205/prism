import { useEffect } from "react";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

const socket = io("/", {
  path: "/socket.io",
  autoConnect: false,
});

export function useSocket() {
  const queryClient = useQueryClient();

  useEffect(() => {
    socket.connect();

    // Listen for global issue updates
    socket.on("issue:updated", () => {
      console.log("Socket: Issue updated, invalidating queries...");
      queryClient.invalidateQueries({ queryKey: [api.issues.list.path] });
    });

    return () => {
      socket.off("issue:updated");
      socket.disconnect();
    };
  }, [queryClient]);

  return socket;
}
