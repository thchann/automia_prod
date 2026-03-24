import { useState, useEffect } from "react";
import { Moon, Sun, User, Globe, LogOut, Monitor } from "lucide-react";
import EditProfileSheet from "@/components/EditProfileSheet";
import { useLanguage } from "@/i18n/LanguageProvider";

const SettingsPage = () => {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const { language, setLanguage, tx } = useLanguage();
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState({
    name: "Steve",
    email: "steve@carsales.ai",
    client_description: "Miami-based car advisor specializing in luxury and sports vehicles.",
    website: "https://stevecars.com",
    avatar_url: null as string | null,
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark]);

  return (
    <div className="px-5 pt-14 pb-24 max-w-[430px] mx-auto animate-fade-in">
      <h1 className="text-3xl font-extrabold tracking-tight mb-6">{tx("Settings", "Ajustes")}</h1>

      <div className="bg-card rounded-lg shadow-sm overflow-hidden">
        <button onClick={() => setShowProfile(true)} className="w-full flex items-center gap-4 px-4 py-3.5 border-b border-border active:scale-[0.98] active:bg-muted/50 transition-all">
          <User size={18} className="text-muted-foreground" />
          <span className="text-sm font-medium">{tx("Edit Profile", "Editar perfil")}</span>
        </button>
        <button className="w-full flex items-center gap-4 px-4 py-3.5 border-b border-border active:scale-[0.98] active:bg-muted/50 transition-all">
          <Globe size={18} className="text-muted-foreground" />
          <span className="text-sm font-medium">{tx("Website Link", "Enlace del sitio web")}</span>
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
          type="button"
          className="w-full flex items-center gap-4 px-4 py-3.5 border-b border-border active:scale-[0.98] active:bg-muted/50 transition-all text-left"
          onClick={() => {
            document.cookie =
              "automia_desktop=1; path=/; max-age=31536000; SameSite=Lax";
            window.location.href = "/desktop";
          }}
        >
          <Monitor size={18} className="text-muted-foreground" />
          <span className="text-sm font-medium">{tx("View desktop site", "Ver sitio de escritorio")}</span>
        </button>
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
        <button className="w-full flex items-center gap-4 px-4 py-3.5 active:scale-[0.98] active:bg-muted/50 transition-all text-destructive">
          <LogOut size={18} />
          <span className="text-sm font-medium">{tx("Log Out", "Cerrar sesion")}</span>
        </button>
      </div>

      <EditProfileSheet
        open={showProfile}
        onClose={() => setShowProfile(false)}
        user={profile}
        onSave={(updated) => setProfile(updated)}
      />
    </div>
  );
};

export default SettingsPage;
