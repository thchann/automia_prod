import { Navigate } from "react-router-dom";

import { isAccessGranted } from "@/lib/accessAuth";

/** Root `/` → dashboard if token exists, otherwise verification gate. */
export default function LandingRedirect() {
  return <Navigate to={isAccessGranted() ? "/dashboard" : "/verification"} replace />;
}
