import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    plugins: [
        react(),
        ...(process.env.NODE_ENV !== "production" &&
            process.env.REPL_ID !== undefined
            ? [

            ]
            : []),
    ],
    resolve: {
        alias: {
            "@": path.resolve(import.meta.dirname, "src"),
            "@shared": path.resolve(import.meta.dirname, "..", "shared"),
            "@assets": path.resolve(import.meta.dirname, "..", "attached_assets"),
        },
    },
    root: ".",
    build: {
        outDir: "dist",
        emptyOutDir: true,
        rollupOptions: {
            output: {
                // Split major vendors to keep chunks under warning thresholds without changing app behavior.
                manualChunks(id) {
                    if (!id.includes("node_modules")) return undefined;

                    const parts = id.split("node_modules/")[1]?.split("/") ?? [];
                    const scopeOrPkg = parts[0];
                    const pkg = scopeOrPkg?.startsWith("@") ? `${scopeOrPkg}/${parts[1]}` : scopeOrPkg;

                    if (pkg === "react" || pkg === "react-dom") return "react";
                    if (pkg === "recharts") return "charts";
                    if (pkg === "framer-motion") return "motion";
                    if (pkg === "@tanstack/react-query") return "query";
                    if (pkg === "socket.io-client" || pkg === "socket.io") return "socket";

                    // Fallback: split remaining vendors by package to keep chunks small.
                    const safeName = pkg?.replace("@", "").replace(/[^a-zA-Z0-9]/g, "-") || "vendor";
                    return safeName;
                },
            },
        },
    },
    server: {
        fs: {
            strict: true,
            deny: ["**/.*"],
        },
    },
});
