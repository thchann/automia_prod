import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import VerificationForm from "@/components/VerificationForm";
import { getAccessToken, verifyAccessCode } from "@/lib/accessAuth";

export default function VerificationEntryPage() {
  const navigate = useNavigate();
  const [alreadyVerified] = useState(() => Boolean(getAccessToken()));

  useEffect(() => {
    if (alreadyVerified) navigate("/dashboard", { replace: true });
  }, [alreadyVerified, navigate]);

  if (alreadyVerified) return null;

  return (
    <div className="flex min-h-screen bg-background items-center justify-center px-6 py-4">
      <div className="w-full max-w-md flex flex-col items-center gap-4 -translate-y-4">
        <div className="flex items-center gap-3">
          <img src="/automia-logo.png" alt="Automia logo" className="h-10 w-10 object-contain" />
          <span className="text-3xl font-bold text-black">Automia</span>
        </div>
        <VerificationForm
          onVerify={async (code) => {
            const { ok } = await verifyAccessCode(code);
            if (ok) navigate("/dashboard", { replace: true });
          }}
          onRequestLogin={() => navigate("/login")}
        />
      </div>
    </div>
  );
}
