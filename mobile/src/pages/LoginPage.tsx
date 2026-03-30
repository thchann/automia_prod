import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import LoginForm from "@/components/LoginForm";
import { getAccessToken } from "@/lib/accessAuth";

/** Public login screen (email/password UI). Entry with access code remains on `/verification`. */
export default function LoginPage() {
  const navigate = useNavigate();
  const [alreadyAuthed] = useState(() => Boolean(getAccessToken()));

  useEffect(() => {
    if (alreadyAuthed) navigate("/dashboard", { replace: true });
  }, [alreadyAuthed, navigate]);

  if (alreadyAuthed) return null;

  return (
    <div className="flex min-h-screen bg-background items-center justify-center px-6 py-4">
      <div className="w-full max-w-md flex flex-col items-center gap-4 -translate-y-4">
        <div className="flex items-center gap-3">
          <img src="/automia-logo.png" alt="Automia logo" className="h-10 w-10 object-contain" />
          <span className="text-3xl font-bold text-black">Automia</span>
        </div>
        <LoginForm
          onLogin={() => navigate("/verification")}
          onCreateAccount={() => navigate("/verification")}
        />
      </div>
    </div>
  );
}
