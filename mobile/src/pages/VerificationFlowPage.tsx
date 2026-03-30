import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import LoginForm from "@/components/LoginForm";
import VerificationForm from "@/components/VerificationForm";

type VerificationTab = "login" | "verification";

function safeGetVerified() {
  try {
    return localStorage.getItem("automia_mobile_verified") === "true";
  } catch {
    return false;
  }
}

export default function VerificationFlowPage({ initialTab }: { initialTab: VerificationTab }) {
  const navigate = useNavigate();
  const [isAlreadyVerified] = useState(() => safeGetVerified());

  const handleVerified = async () => {
    try {
      localStorage.setItem("automia_mobile_verified", "true");
    } catch {
      // ignore; UI can still route forward
    }
    navigate("/");
  };

  useEffect(() => {
    if (isAlreadyVerified) navigate("/", { replace: true });
  }, [isAlreadyVerified, navigate]);

  if (isAlreadyVerified) return null;

  return (
    <div className="flex min-h-screen bg-background items-center justify-center px-6 py-4">
      <div className="w-full max-w-md flex flex-col items-center gap-4 -translate-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <img src="/automia-logo.png" alt="Automia logo" className="h-10 w-10 object-contain" />
          <span className="text-3xl font-bold text-black">Automia</span>
        </div>

        <div className="w-full">
          {initialTab === "login" ? (
            <LoginForm
              onLogin={() => {
                // UI-only: proceed to the mobile app.
                navigate("/");
              }}
              onCreateAccount={() => navigate("/verification")}
            />
          ) : (
            <VerificationForm
              onVerify={async () => handleVerified()}
              onRequestLogin={() => navigate("/login")}
            />
          )}
        </div>
      </div>
    </div>
  );
}

