import {
  Home, Users, Zap, Car, Bot, Settings
} from "lucide-react";
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

interface DashboardSidebarProps {
  activeItem: string;
  onActiveItemChange: (item: string) => void;
}

export function DashboardSidebar({ activeItem, onActiveItemChange }: DashboardSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const NavButton = ({ label, icon: Icon, isActive }: { label: string; icon: React.ElementType; isActive: boolean }) => {
    const button = (
      <button
        onClick={() => onActiveItemChange(label)}
        className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} w-full rounded-md px-3 py-2 text-sm ${
          isActive
            ? "bg-accent text-active font-medium"
            : "text-sidebar-foreground hover:bg-surface-hover"
        }`}
        title={collapsed ? undefined : label}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span>{label}</span>}
      </button>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return button;
  };

  return (
    <aside
      className={`${collapsed ? "w-[52px] min-w-[52px]" : "w-[218px] min-w-[218px]"} bg-background flex flex-col h-full transition-[width,min-width] duration-200 ease-out`}
    >
      <nav className="flex-1 overflow-y-auto scrollbar-none px-2 pt-2 pb-3">
        {/* Home */}
        <div className="mb-1">
          <NavButton label="Home" icon={Home} isActive={activeItem === "Home"} />
        </div>

        {navGroups.map((group) => (
          <div key={group.title} className="mt-4">
            {/* Always reserve space for the group title */}
            <div className={`h-6 px-3 pb-1 ${collapsed ? "" : ""}`}>
              {!collapsed && (
                <h3 className="text-xs font-medium text-sidebar-muted leading-6">
                  {group.title}
                </h3>
              )}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavButton
                  key={item.label}
                  label={item.label}
                  icon={item.icon}
                  isActive={activeItem === item.label}
                />
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
