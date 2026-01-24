import { PropsWithChildren } from "react";
import { useAuth } from "@/hooks/use-auth";

// Render-only auth gate to keep routing side-effect free
export default function ProtectedRoute({ children }: PropsWithChildren) {
    const { user, admin, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center text-slate-600">Loading...</div>
            </div>
        );
    }

    if (!user && !admin) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center text-slate-600">Redirecting...</div>
            </div>
        );
    }

    return <>{children}</>;
}
