import { Sun, Moon, Monitor } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/use-theme";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useAuth } from "@/contexts/AuthContext";

export function DashboardHeader() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const { tx } = useLanguage();

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate("/sign-in", { replace: true });
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="h-[54px] min-h-[54px] flex items-center justify-between px-3 bg-background fixed top-0 left-2 right-2 z-50">
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold tracking-tight text-foreground">
          Automia
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          {tx("Coming soon", "Proximamente")}
        </button>
        <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          {tx("Dashboard", "Panel")}
        </button>
        <button className="text-sm font-medium border border-border rounded-full px-4 py-1.5 text-foreground hover:bg-surface-hover transition-colors">
          {tx("Start building", "Empezar")}
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {tx("Log out", "Cerrar sesion")}
        </button>
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen(!open)}
            className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold"
          >
            {(user?.name || "?").charAt(0).toUpperCase()}
          </button>
          {open && (
            <div className="absolute right-0 top-10 w-56 bg-popover border border-border rounded-xl shadow-lg p-4 z-50">
              <div className="mb-1">
                <div className="text-sm font-semibold text-foreground">Theodore Chan</div>
                <div className="text-xs text-muted-foreground">tchan@trinity.edu</div>
              </div>
              {/* Theme toggle */}
              <div className="flex items-center gap-0 bg-surface rounded-full p-1 my-3 w-fit">
                {([
                  { value: "light" as const, icon: Sun },
                  { value: "dark" as const, icon: Moon },
                  { value: "system" as const, icon: Monitor },
                ]).map(({ value, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={`p-1.5 rounded-full transition-colors ${
                      theme === value ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
              <div className="border-t border-border pt-2 space-y-1">
                <button
                  type="button"
                  className="block w-full text-left text-sm text-foreground hover:text-primary py-1.5 transition-colors"
                >
                  {tx("Terms & policies", "Terminos y politicas")}
                </button>
                <button
                  type="button"
                  className="block w-full text-left text-sm text-foreground hover:text-primary py-1.5 transition-colors"
                >
                  {tx("Help", "Ayuda")}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full text-left text-sm text-foreground hover:text-primary py-1.5 transition-colors"
                >
                  {tx("Log out", "Cerrar sesion")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
