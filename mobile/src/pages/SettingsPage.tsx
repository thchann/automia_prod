import { useState, useEffect } from "react";
import { Moon, Sun, User, Globe, LogOut } from "lucide-react";
import EditProfileSheet from "@/components/EditProfileSheet";

const SettingsPage = () => {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
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
      <h1 className="text-3xl font-extrabold tracking-tight mb-6">Settings</h1>

      <div className="bg-card rounded-lg shadow-sm overflow-hidden">
        <button onClick={() => setShowProfile(true)} className="w-full flex items-center gap-4 px-4 py-3.5 border-b border-border active:scale-[0.98] active:bg-muted/50 transition-all">
          <User size={18} className="text-muted-foreground" />
          <span className="text-sm font-medium">Edit Profile</span>
        </button>
        <button className="w-full flex items-center gap-4 px-4 py-3.5 border-b border-border active:scale-[0.98] active:bg-muted/50 transition-all">
          <Globe size={18} className="text-muted-foreground" />
          <span className="text-sm font-medium">Website Link</span>
        </button>
        <button
          onClick={() => setDark(!dark)}
          className="w-full flex items-center justify-between px-4 py-3.5 border-b border-border active:scale-[0.98] active:bg-muted/50 transition-all"
        >
          <div className="flex items-center gap-4">
            {dark ? <Moon size={18} className="text-muted-foreground" /> : <Sun size={18} className="text-muted-foreground" />}
            <span className="text-sm font-medium">{dark ? "Dark Mode" : "Light Mode"}</span>
          </div>
          <div className={`w-10 h-6 rounded-full transition-colors ${dark ? "bg-primary" : "bg-muted"} relative`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-card shadow transition-transform ${dark ? "left-5" : "left-1"}`} />
          </div>
        </button>
        <button className="w-full flex items-center gap-4 px-4 py-3.5 active:scale-[0.98] active:bg-muted/50 transition-all text-destructive">
          <LogOut size={18} />
          <span className="text-sm font-medium">Log Out</span>
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
