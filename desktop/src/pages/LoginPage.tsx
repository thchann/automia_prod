import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import LoginForm from "@/components/LoginForm";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@automia/api";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, user, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && user) navigate("/dashboard", { replace: true });
  }, [user, isLoading, navigate]);

  if (isLoading || user) return null;

  return (
    <div className="flex min-h-screen bg-background items-center justify-center px-6 py-4">
      <div className="w-full max-w-md flex flex-col items-center gap-4 -translate-y-4">
        <div className="flex items-center gap-3">
          <img src="/automia-logo.png" alt="Automia logo" className="h-10 w-10 object-contain" />
          <span className="text-3xl font-bold text-black">Automia</span>
        </div>
        {error ? <p className="w-full text-center text-sm text-destructive">{error}</p> : null}
        <LoginForm
          onLogin={async ({ email, password }) => {
            setError(null);
            try {
              await login(email.trim(), password);
              navigate("/dashboard", { replace: true });
            } catch (e) {
              if (e instanceof ApiError) {
                setError(typeof e.detail === "string" ? e.detail : e.message);
              } else {
                setError("Login failed");
              }
            }
          }}
          onCreateAccount={() => navigate("/verification")}
        />
        <p className="text-center text-sm text-muted-foreground">
          <Link to="/privacy-policy" className="underline underline-offset-4 hover:text-foreground">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
