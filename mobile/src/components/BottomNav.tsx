import { LayoutDashboard, Car, Users, Zap, Settings } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";

type Tab = "dashboard" | "cars" | "leads" | "automations" | "settings";

interface BottomNavProps {
  active: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs: { key: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "cars", label: "Cars", icon: Car },
  { key: "leads", label: "Leads", icon: Users },
  { key: "automations", label: "Automations", icon: Zap },
  { key: "settings", label: "Settings", icon: Settings },
];

const BottomNav = ({ active, onTabChange }: BottomNavProps) => {
  const { tx } = useLanguage();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <div className="mx-auto max-w-[430px] px-3 pb-2">
        <div className="flex h-16 items-center justify-around rounded-xl border border-border bg-nav-bg shadow-sm">
        {tabs.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors duration-150 active:scale-95 ${
                isActive ? "text-nav-active" : "text-nav-inactive"
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
              <span className={`text-[10px] leading-tight ${isActive ? "font-semibold" : "font-medium"}`}>
                {translateBottomNavLabel(label, tx)}
              </span>
            </button>
          );
        })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;

function translateBottomNavLabel(label: string, tx: (enText: string, esText: string) => string) {
  switch (label) {
    case "Dashboard":
      return tx("Dashboard", "Panel");
    case "Cars":
      return tx("Cars", "Autos");
    case "Leads":
      return "Leads";
    case "Automations":
      return tx("Automations", "Automat.");
    case "Settings":
      return tx("Settings", "Ajustes");
    default:
      return label;
  }
}
