import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Moon, Sun, User, Globe, LogOut } from "lucide-react";
import { patchMe } from "@automia/api";
import EditProfileSheet from "@/components/EditProfileSheet";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const { language, setLanguage, tx } = useLanguage();
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark]);

  const profileUser = user
    ? {
        name: user.name,
        email: user.email,
        client_description: user.client_description ?? "",
        website: user.website ?? "",
        avatar_url: user.avatar_url,
      }
    : {
        name: "",
        email: "",
        client_description: "",
        website: "",
        avatar_url: null as string | null,
      };

  return (
    <div className="px-5 pt-12 pb-24 max-w-[430px] mx-auto animate-fade-in">
      <h1 className="text-3xl font-extrabold tracking-tight mb-6">{tx("Settings", "Ajustes")}</h1>

      <div className="rounded-md border border-border bg-card overflow-hidden">
        <button onClick={() => setShowProfile(true)} className="w-full flex items-center gap-4 px-4 py-3.5 border-b border-border active:scale-[0.98] active:bg-muted/50 transition-all">
          <User size={18} className="text-muted-foreground" />
          <span className="text-sm font-medium">{tx("Edit Profile", "Editar perfil")}</span>
        </button>
        <div className="w-full flex items-center justify-between px-4 py-3.5 border-b border-border">
          <div className="flex items-center gap-4">
            <Globe size={18} className="text-muted-foreground" />
            <span className="text-sm font-medium">{tx("Language", "Idioma")}</span>
          </div>
          <div className="grid grid-cols-2 rounded-md border border-border p-1">
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={`rounded-sm px-2 py-1.5 text-xs font-medium transition-colors ${
                language === "en" ? "bg-primary/15 text-foreground" : "text-muted-foreground"
              }`}
            >
              {tx("English", "Ingles")}
            </button>
            <button
              type="button"
              onClick={() => setLanguage("es")}
              className={`rounded-sm px-2 py-1.5 text-xs font-medium transition-colors ${
                language === "es" ? "bg-primary/15 text-foreground" : "text-muted-foreground"
              }`}
            >
              {tx("Spanish", "Espanol")}
            </button>
          </div>
        </div>
        <button
          onClick={() => setDark(!dark)}
          className="w-full flex items-center justify-between px-4 py-3.5 border-b border-border active:scale-[0.98] active:bg-muted/50 transition-all"
        >
          <div className="flex items-center gap-4">
            {dark ? <Moon size={18} className="text-muted-foreground" /> : <Sun size={18} className="text-muted-foreground" />}
            <span className="text-sm font-medium">{dark ? tx("Dark Mode", "Modo oscuro") : tx("Light Mode", "Modo claro")}</span>
          </div>
          <div className={`w-10 h-6 rounded-full transition-colors ${dark ? "bg-primary" : "bg-muted"} relative`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-card shadow transition-transform ${dark ? "left-5" : "left-1"}`} />
          </div>
        </button>
        <button
          type="button"
          onClick={() => {
            logout();
            navigate("/login", { replace: true });
          }}
          className="w-full flex items-center gap-4 px-4 py-3.5 active:scale-[0.98] active:bg-muted/50 transition-all text-destructive"
        >
          <LogOut size={18} />
          <span className="text-sm font-medium">{tx("Log Out", "Cerrar sesion")}</span>
        </button>
      </div>

      <EditProfileSheet
        open={showProfile}
        onClose={() => setShowProfile(false)}
        user={profileUser}
        onSave={async (updated) => {
          try {
            await patchMe({
              name: updated.name,
              client_description: updated.client_description || null,
              website: updated.website || null,
              avatar_url: updated.avatar_url,
            });
            await refreshUser();
            toast.success(tx("Profile saved", "Perfil guardado"));
          } catch {
            toast.error(tx("Could not save profile", "No se pudo guardar el perfil"));
          }
        }}
      />
    </div>
  );
};

export default SettingsPage;
