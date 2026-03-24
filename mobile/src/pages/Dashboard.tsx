import { useMemo, useState } from "react";
import { mockLeads, mockCars, mockStatuses, mockUser } from "@/data/mock";
import type { Lead, Car as CarType } from "@/types/models";
import { TrendingUp, Users, Car, Clock } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import AddLeadSheet from "@/components/AddLeadSheet";
import AddCarSheet from "@/components/AddCarSheet";

type Tab = "dashboard" | "cars" | "leads" | "automations" | "settings";

interface DashboardProps {
  onTabChange: (tab: Tab) => void;
}

const Dashboard = ({ onTabChange }: DashboardProps) => {
  const { tx, locale } = useLanguage();
  const [leads, setLeads] = useState<Lead[]>(mockLeads);
  const [cars, setCars] = useState<CarType[]>(mockCars);
  const [statuses, setStatuses] = useState(mockStatuses);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editingCar, setEditingCar] = useState<CarType | null>(null);

  const totalLeads = leads.length;
  const pendingLeads = leads.filter((l) => l.lead_type === "pending").length;
  const buyers = leads.filter((l) => l.lead_type === "buyer").length;
  const sellers = leads.filter((l) => l.lead_type === "seller").length;
  const availableCars = cars.filter((c) => c.status === "available").length;
  const soldCars = cars.filter((c) => c.status === "sold").length;

  const recentActivity = useMemo(() => {
    const leadItems = leads.map((lead) => ({
      id: `lead-${lead.id}`,
      kind: "lead" as const,
      date: new Date(lead.updated_at || lead.created_at).getTime(),
      item: lead,
    }));
    const carItems = cars.map((car) => ({
      id: `car-${car.id}`,
      kind: "car" as const,
      date: new Date(car.updated_at || car.created_at).getTime(),
      item: car,
    }));
    return [...leadItems, ...carItems].sort((a, b) => b.date - a.date).slice(0, 10);
  }, [leads, cars]);

  const hour = new Date().getHours();
  const greeting = hour < 12
    ? tx("Good morning", "Buenos dias")
    : hour < 18
      ? tx("Good afternoon", "Buenas tardes")
      : tx("Good evening", "Buenas noches");

  return (
    <div className="px-5 pt-14 pb-24 max-w-[430px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight">
            {greeting},
            <br />
            {mockUser.name}
          </h1>
        </div>
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-lg font-bold mt-1">
          {mockUser.name.charAt(0)}
        </div>
      </div>

      {/* Active Leads card */}
      <button
        type="button"
        onClick={() => onTabChange("leads")}
        className="w-full bg-card rounded-lg p-5 shadow-sm mb-4 text-left"
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground font-medium">{tx("Active leads", "Leads activos")}</p>
          <Users size={16} className="text-muted-foreground" />
        </div>
        <p className="text-4xl font-extrabold tabular-nums mb-1">{totalLeads}</p>
        <div className="flex gap-4 mt-3">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-badge-pending/15 text-badge-pending">{pendingLeads} {tx("pending", "pendientes")}</span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-badge-buyer/15 text-badge-buyer">{buyers} {tx("buyers", "compradores")}</span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-badge-seller/15 text-badge-seller">{sellers} {tx("sellers", "vendedores")}</span>
        </div>
      </button>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button type="button" onClick={() => onTabChange("cars")} className="bg-card rounded-lg p-4 shadow-sm text-left">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground font-medium">{tx("Inventory", "Inventario")}</p>
            <Car size={14} className="text-muted-foreground" />
          </div>
          <p className="text-2xl font-extrabold tabular-nums">{availableCars}</p>
          <p className="text-xs text-muted-foreground mt-1">{tx("available", "disponibles")}</p>
          <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(availableCars / Math.max(cars.length, 1)) * 100}%` }} />
          </div>
        </button>

        <button type="button" onClick={() => onTabChange("cars")} className="bg-card rounded-lg p-4 shadow-sm text-left">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground font-medium">{tx("Sold", "Vendidos")}</p>
            <TrendingUp size={14} className="text-stat-positive" />
          </div>
          <p className="text-2xl font-extrabold tabular-nums">{soldCars}</p>
          <p className="text-xs text-muted-foreground mt-1">{tx("this period", "este periodo")}</p>
          <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-stat-positive" style={{ width: `${(soldCars / Math.max(cars.length, 1)) * 100}%` }} />
          </div>
        </button>
      </div>

      {/* Recent activity */}
      <div className="bg-card rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground font-medium">{tx("Recent activity", "Actividad reciente")}</p>
          <Clock size={14} className="text-muted-foreground" />
        </div>
        {recentActivity.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => {
              if (entry.kind === "lead") setEditingLead(entry.item);
              else setEditingCar(entry.item);
            }}
            className="w-full flex items-center justify-between py-2.5 border-b border-border last:border-b-0 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                {entry.kind === "lead"
                  ? (entry.item.name?.charAt(0) || "?")
                  : entry.item.brand.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {entry.kind === "lead"
                    ? (entry.item.name || tx("Unknown", "Desconocido"))
                    : `${entry.item.year} ${entry.item.brand} ${entry.item.model}`}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {entry.kind === "lead"
                    ? `${tx("Lead", "Lead")} · ${new Date(entry.item.updated_at || entry.item.created_at).toLocaleDateString(locale)}`
                    : `${tx("Car", "Auto")} · ${new Date(entry.item.updated_at || entry.item.created_at).toLocaleDateString(locale)}`}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {entry.kind === "lead" ? tx("Lead", "Lead") : tx("Car", "Auto")}
            </span>
          </button>
        ))}
      </div>

      <AddLeadSheet
        open={!!editingLead}
        onClose={() => setEditingLead(null)}
        onSave={(lead) => setLeads((prev) => prev.map((l) => (l.id === lead.id ? lead : l)))}
        statuses={statuses}
        initialLead={editingLead}
        onAddStatus={(name) => {
          const next = {
            id: `s_${Date.now()}`,
            name,
            display_order: statuses.length,
            color: null,
            is_default: false,
          };
          setStatuses((prev) => [...prev, next]);
          return next;
        }}
      />
      <AddCarSheet
        open={!!editingCar}
        onClose={() => setEditingCar(null)}
        onSave={(car) => setCars((prev) => prev.map((c) => (c.id === car.id ? car : c)))}
        initialCar={editingCar}
      />
    </div>
  );
};

export default Dashboard;
