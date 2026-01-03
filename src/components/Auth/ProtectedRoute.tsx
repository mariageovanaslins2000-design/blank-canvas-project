import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "owner" | "client";
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, hasRole, roles, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    // Redirect to appropriate dashboard based on available roles
    if (hasRole("owner")) {
      return <Navigate to="/admin" replace />;
    } else if (hasRole("client")) {
      return <Navigate to="/client" replace />;
    }
  }

  return <>{children}</>;
}
