import { Navigate } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";

export default function LandingRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    );
  }

  return <Navigate to={user ? "/dashboard" : "/sign-in"} replace />;
}
