import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, getHealthCheckPingUrl, pingSiteHealth, validateAccessCode } from "@automia/api";
import { toast } from "@/components/ui/sonner";
import VerificationForm from "@/components/VerificationForm";
import { useAuth } from "@/contexts/AuthContext";
import { setRegistrationAccessGranted } from "@/lib/registrationAccess";

export default function VerificationEntryPage() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [pinging, setPinging] = useState(false);

  const handlePingBackend = async () => {
    setPinging(true);
    try {
      await pingSiteHealth();
      toast.success("Site reachable");
    } catch (e) {
      if (e instanceof ApiError) {
        toast.error(e.message || "Request failed");
      } else {
        toast.error("Could not reach backend");
      }
    } finally {
      setPinging(false);
    }
  };

  useEffect(() => {
    if (!isLoading && user) navigate("/dashboard", { replace: true });
  }, [user, isLoading, navigate]);

  if (isLoading) return null;
  if (user) return null;

  const handleVerify = async (code: string) => {
    try {
      await validateAccessCode({ access_code: code });
      setRegistrationAccessGranted(code);
      navigate("/register", { replace: true });
    } catch (e) {
      if (e instanceof ApiError) {
        toast.error(e.message || "Invalid access code");
      } else {
        toast.error("Could not verify access code");
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-background items-center justify-center px-6 py-4">
      <div className="flex w-full max-w-md flex-col items-center gap-4 -translate-y-4">
        <div className="flex items-center gap-3">
          <img src="/automia-logo.png" alt="Automia logo" className="h-10 w-10 object-contain" />
          <span className="text-3xl font-bold text-black">Automia</span>
        </div>
        <VerificationForm
          onVerify={handleVerify}
          onBack={() => navigate("/login")}
          onRequestLogin={() => navigate("/login")}
        />
        <div className="flex w-full flex-col gap-2 pt-2">
          <button
            type="button"
            disabled={pinging}
            onClick={() => void handlePingBackend()}
            className="w-full rounded-xl border border-border bg-background py-3 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors disabled:opacity-40"
          >
            {pinging ? "Checking…" : "Test connection"}
          </button>
          <p className="text-center text-[11px] text-muted-foreground break-all px-1">{getHealthCheckPingUrl()}</p>
        </div>
      </div>
    </div>
  );
}
