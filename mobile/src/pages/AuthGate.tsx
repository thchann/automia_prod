import { useMemo } from "react";

import VerificationFlowPage from "@/pages/VerificationFlowPage";
import DashboardIndex from "@/pages/Index";

function safeGetVerified() {
  try {
    return localStorage.getItem("automia_mobile_verified") === "true";
  } catch {
    return false;
  }
}

export default function AuthGate() {
  const isVerified = useMemo(() => safeGetVerified(), []);

  if (isVerified) return <DashboardIndex />;

  // Default entry is "login"; the tab will still show verification when needed.
  return <VerificationFlowPage initialTab="login" />;
}

