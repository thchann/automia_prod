import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { isAccessGranted } from "@/lib/accessAuth";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  if (!isAccessGranted()) {
    return <Navigate to="/verification" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
