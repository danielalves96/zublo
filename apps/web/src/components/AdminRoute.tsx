import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/** Redirects non-admin users to /dashboard. */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
