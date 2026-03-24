import { mockLeads, mockCars, mockUser } from "@/data/mock";
import { TrendingUp, Users, Car, Clock } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";

const Dashboard = () => {
  const { tx, locale } = useLanguage();
  const totalLeads = mockLeads.length;
  const pendingLeads = mockLeads.filter((l) => l.lead_type === "pending").length;
  const buyers = mockLeads.filter((l) => l.lead_type === "buyer").length;
  const sellers = mockLeads.filter((l) => l.lead_type === "seller").length;
  const availableCars = mockCars.filter((c) => c.status === "available").length;
  const soldCars = mockCars.filter((c) => c.status === "sold").length;

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
      <div className="bg-card rounded-lg p-5 shadow-sm mb-4">
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
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-card rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground font-medium">{tx("Inventory", "Inventario")}</p>
            <Car size={14} className="text-muted-foreground" />
          </div>
          <p className="text-2xl font-extrabold tabular-nums">{availableCars}</p>
          <p className="text-xs text-muted-foreground mt-1">{tx("available", "disponibles")}</p>
          <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(availableCars / mockCars.length) * 100}%` }} />
          </div>
        </div>

        <div className="bg-card rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground font-medium">{tx("Sold", "Vendidos")}</p>
            <TrendingUp size={14} className="text-stat-positive" />
          </div>
          <p className="text-2xl font-extrabold tabular-nums">{soldCars}</p>
          <p className="text-xs text-muted-foreground mt-1">{tx("this period", "este periodo")}</p>
          <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-stat-positive" style={{ width: `${(soldCars / mockCars.length) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-card rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground font-medium">{tx("Recent leads", "Leads recientes")}</p>
          <Clock size={14} className="text-muted-foreground" />
        </div>
        {mockLeads.slice(0, 3).map((lead) => (
          <div key={lead.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-b-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                {lead.name?.charAt(0) || "?"}
              </div>
              <div>
                <p className="text-sm font-semibold">{lead.name || tx("Unknown", "Desconocido")}</p>
                <p className="text-[11px] text-muted-foreground">{lead.source}</p>
              </div>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              lead.lead_type === "buyer" ? "bg-badge-buyer/15 text-badge-buyer" :
              lead.lead_type === "seller" ? "bg-badge-seller/15 text-badge-seller" :
              "bg-badge-pending/15 text-badge-pending"
            }`}>
              {lead.lead_type === "buyer" ? tx("buyer", "comprador") : lead.lead_type === "seller" ? tx("seller", "vendedor") : tx("pending", "pendiente")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
