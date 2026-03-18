import {
  Home, MessageSquare, Bot, Volume2, Image, Video, Users,
  BarChart3, Key, AppWindow, FileText, Database, Layers, FlaskConical, Settings
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  label: string;
  icon: React.ElementType;
  active?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "Create",
    items: [
      { label: "Chat", icon: MessageSquare },
      { label: "Agent Builder", icon: Bot },
      { label: "Audio", icon: Volume2 },
      { label: "Images", icon: Image },
      { label: "Videos", icon: Video },
      { label: "Assistants", icon: Users },
    ],
  },
  {
    title: "Manage",
    items: [
      { label: "Usage", icon: BarChart3 },
      { label: "API keys", icon: Key },
      { label: "Apps", icon: AppWindow },
      { label: "Logs", icon: FileText },
      { label: "Storage", icon: Database },
      { label: "Batches", icon: Layers },
    ],
  },
  {
    title: "Optimize",
    items: [
      { label: "Evaluation", icon: FlaskConical },
      { label: "Fine-tuning", icon: Settings },
    ],
  },
];

export function DashboardSidebar() {
  const [activeItem, setActiveItem] = useState("Home");

  return (
    <aside className="w-[218px] min-w-[218px] bg-background flex flex-col h-screen border-r border-border">
      {/* Sidebar nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 pt-2 pb-3">
        {/* Home */}
        <button
          onClick={() => setActiveItem("Home")}
          className={`flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm font-medium transition-colors mb-1 ${
            activeItem === "Home"
              ? "bg-accent text-foreground"
              : "text-sidebar-foreground hover:bg-surface-hover"
          }`}
        >
          <Home className="h-4 w-4" />
          <span>Home</span>
        </button>

        {/* Nav Groups */}
        {navGroups.map((group) => (
          <div key={group.title} className="mt-4">
            <h3 className="text-xs font-medium text-sidebar-muted px-3 pb-1">
              {group.title}
            </h3>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <button
                  key={item.label}
                  onClick={() => setActiveItem(item.label)}
                  className={`flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm transition-colors ${
                    activeItem === item.label
                      ? "bg-accent text-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-surface-hover"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom promo */}
      <div className="p-3 border-t border-border">
        <div className="bg-surface rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-foreground">Add credits</span>
            <button className="text-muted-foreground hover:text-foreground text-xs">✕</button>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Run your next API request by adding credits.
          </p>
          <button className="text-xs font-medium border border-border rounded-md px-3 py-1.5 text-foreground hover:bg-surface-hover transition-colors">
            Go to Billing
          </button>
        </div>
      </div>

      {/* Collapse button */}
      <div className="p-3 border-t border-border">
        <button className="text-muted-foreground hover:text-foreground">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
