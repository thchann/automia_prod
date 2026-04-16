import {
  Home, Users, Zap, Car, Bot, Settings
} from "lucide-react";
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLanguage } from "@/i18n/LanguageProvider";

interface NavItem {
  label: string;
  displayLabel: string;
  icon: React.ElementType;
  disabled?: boolean;
}

interface NavGroup {
  title: string;
  displayTitle: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "Create",
    displayTitle: "Create",
    items: [
      { label: "Leads", displayLabel: "Leads", icon: Users },
      { label: "Automations", displayLabel: "Automations", icon: Zap },
    ],
  },
  {
    title: "Manage",
    displayTitle: "Manage",
    items: [
      { label: "Cars", displayLabel: "Cars", icon: Car },
      { label: "AI assistant", displayLabel: "AI assistant", icon: Bot, disabled: true },
    ],
  },
  {
    title: "Optimize",
    displayTitle: "Optimize",
    items: [
      { label: "Settings", displayLabel: "Settings", icon: Settings },
    ],
  },
];

interface DashboardSidebarProps {
  activeItem: string;
  onActiveItemChange: (item: string) => void;
}

export function DashboardSidebar({ activeItem, onActiveItemChange }: DashboardSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { tx } = useLanguage();

  // Fixed row height; icon uses a fixed-width slot so it stays anchored while sidebar expands.
  const navButtonClass =
    "flex h-9 w-full shrink-0 items-center rounded-md text-sm leading-none";

  const NavButton = ({
    label,
    displayLabel,
    icon: Icon,
    isActive,
    disabled = false,
  }: {
    label: string;
    displayLabel: string;
    icon: React.ElementType;
    isActive: boolean;
    disabled?: boolean;
  }) => {
    const button = (
      <button
        type="button"
        onClick={() => {
          if (!disabled) onActiveItemChange(label);
        }}
        disabled={disabled}
        className={`${navButtonClass} justify-start pr-2 ${
          disabled
            ? "text-muted-foreground/60 cursor-not-allowed"
            : isActive
            ? "bg-accent text-active font-medium"
            : "text-sidebar-foreground hover:bg-surface-hover"
        }`}
        title={collapsed ? undefined : label}
      >
        <span className="inline-flex h-9 w-[52px] shrink-0 items-center justify-center" aria-hidden>
          <Icon className="h-4 w-4 shrink-0" />
        </span>
        {!collapsed && (
          <span className="min-w-0 flex-1 truncate pl-1 text-left">
            {tx(displayLabel, translateSidebar(displayLabel))}
          </span>
        )}
      </button>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {tx(displayLabel, translateSidebar(displayLabel))}
          </TooltipContent>
        </Tooltip>
      );
    }

    return button;
  };

  return (
    <aside
      className={`box-border ${collapsed ? "w-[52px] min-w-[52px]" : "w-[218px] min-w-[218px]"} bg-background flex flex-col h-full transition-[width,min-width] duration-200 ease-out`}
    >
      <nav className="flex-1 overflow-y-auto overscroll-y-none px-2 pt-2 pb-3">
        {/* Home */}
        <div className="mb-1">
          <NavButton
            label="Home"
            displayLabel="Home"
            icon={Home}
            isActive={activeItem === "Home"}
          />
        </div>
        {navGroups.map((group) => (
          <div key={group.title} className="mt-4">
            {/* Same layout box in both states (opacity only) so section headers don’t change row metrics */}
            <div className="h-6 overflow-hidden px-3 pb-1">
              <h3
                className={`m-0 whitespace-nowrap text-xs font-medium leading-6 text-sidebar-muted ${collapsed ? "select-none opacity-0" : ""}`}
                aria-hidden={collapsed}
              >
                {tx(group.displayTitle, translateSidebar(group.displayTitle))}
              </h3>
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavButton
                  key={item.label}
                  label={item.label}
                  displayLabel={item.displayLabel}
                  icon={item.icon}
                  isActive={activeItem === item.label}
                  disabled={item.disabled}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse control: same horizontal inset as nav icons (px-2 + pl-3) */}
      <div className="border-t border-border px-2 pb-3 pt-2">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className={`flex h-9 w-full shrink-0 items-center text-muted-foreground hover:text-foreground ${
            collapsed ? "justify-center px-0" : "justify-start pl-3 pr-2"
          }`}
          aria-label={collapsed ? tx("Expand sidebar", "Expandir barra lateral") : tx("Collapse sidebar", "Colapsar barra lateral")}
        >
          <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </button>
      </div>
    </aside>
  );
}

function translateSidebar(label: string) {
  switch (label) {
    case "Home":
      return "Inicio";
    case "Create":
      return "Crear";
    case "Leads":
      return "Leads";
    case "Automations":
      return "Automatizaciones";
    case "Manage":
      return "Gestionar";
    case "Cars":
      return "Autos";
    case "AI assistant":
      return "Asistente IA";
    case "Optimize":
      return "Optimizar";
    case "Settings":
      return "Configuracion";
    default:
      return label;
  }
}
