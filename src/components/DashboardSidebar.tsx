import {
  Home, Users, Zap, Car, Bot, Settings
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "Create",
    items: [
      { label: "Leads", icon: Users },
      { label: "Automations", icon: Zap },
    ],
  },
  {
    title: "Manage",
    items: [
      { label: "Cars", icon: Car },
      { label: "AI assistant", icon: Bot },
    ],
  },
  {
    title: "Optimize",
    items: [
      { label: "Settings", icon: Settings },
    ],
  },
];

export function DashboardSidebar() {
  const [activeItem, setActiveItem] = useState("Home");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`${collapsed ? "w-[52px] min-w-[52px]" : "w-[218px] min-w-[218px]"} bg-background flex flex-col h-full transition-all duration-200`}>
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 pt-2 pb-3">
        {/* Home */}
        <button
          onClick={() => setActiveItem("Home")}
          className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} w-full rounded-md px-3 py-2 text-sm font-medium transition-colors mb-1 ${
            activeItem === "Home"
              ? "bg-accent text-active"
              : "text-sidebar-foreground hover:bg-surface-hover"
          }`}
          title="Home"
        >
          <Home className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Home</span>}
        </button>

        {navGroups.map((group) => (
          <div key={group.title} className="mt-4">
            {!collapsed && (
              <h3 className="text-xs font-medium text-sidebar-muted px-3 pb-1">
                {group.title}
              </h3>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <button
                  key={item.label}
                  onClick={() => setActiveItem(item.label)}
                  className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} w-full rounded-md px-3 py-2 text-sm transition-colors ${
                    activeItem === item.label
                      ? "bg-accent text-active font-medium"
                      : "text-sidebar-foreground hover:bg-surface-hover"
                  }`}
                  title={item.label}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse button */}
      <div className="p-3 border-t border-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-muted-foreground hover:text-foreground"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
