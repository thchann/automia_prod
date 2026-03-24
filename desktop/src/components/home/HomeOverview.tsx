import { useState } from "react";
import { Car, Clock3, Sparkles, Users } from "lucide-react";
import { defaultStatuses, mockCars, mockLeads } from "@/data/mockLeads";
import { Car as CarType, Lead } from "@/types/leads";
import { CarEditDialog } from "@/components/cars/CarEditDialog";
import { LeadEditDialog } from "@/components/leads/LeadEditDialog";
import { cn } from "@/lib/utils";

const HOME_OWNER_NAME = "Theodore Chan";

const layerTabs = [
  "Overview",
  "Teams",
  "Decisions",
  "Workflow",
  "Recent activity",
];

const featureCards = [
  {
    title: "Designed for Creators & Teams",
    description:
      "A clean workspace for your pipeline with clear layers for creation, management, and optimization.",
    chip: "Creators & Teams",
  },
  {
    title: "AI-Driven Decision Support",
    description:
      "Summaries and surfaced context for faster lead and inventory decisions at a glance.",
    chip: "Decision support",
  },
  {
    title: "Effortless Workflow Management",
    description:
      "Structured sections and consistent card stacks so important updates are easier to track.",
    chip: "Workflow",
  },
];

const listItemBaseClass =
  "grid w-full grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-muted/70";

function displayDate(value: string | null) {
  if (!value) return "No date";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "No date";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function asTimestamp(value: string | null) {
  if (!value) return 0;
  const n = new Date(value).getTime();
  return Number.isNaN(n) ? 0 : n;
}

function asLeadDate(lead: (typeof mockLeads)[number]) {
  return lead.updated_at ?? lead.created_at;
}

function asCarDate(car: (typeof mockCars)[number]) {
  return car.updated_at ?? car.listed_at ?? car.created_at;
}

export function HomeOverview() {
  const now = new Date();
  const [cars, setCars] = useState<CarType[]>(mockCars);
  const [leads, setLeads] = useState<Lead[]>(mockLeads);
  const [editCar, setEditCar] = useState<CarType | null>(null);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const today = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const recentActivity = [
    ...cars.map((car) => ({
      id: car.id,
      type: "car" as const,
      at: asCarDate(car),
      item: car,
    })),
    ...leads.map((lead) => ({
      id: lead.id,
      type: "lead" as const,
      at: asLeadDate(lead),
      item: lead,
    })),
  ]
    .sort((a, b) => asTimestamp(b.at) - asTimestamp(a.at))
    .slice(0, 10);

  return (
    <section className="space-y-6 pb-6">
      <div className="rounded-xl border border-border bg-gradient-to-r from-primary/15 via-primary/10 to-transparent px-5 py-4">
        <p className="text-xl font-semibold text-foreground">Welcome back, {HOME_OWNER_NAME}</p>
        <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{today}</p>
      </div>

      <div className="rounded-xl border border-border bg-card px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          {layerTabs.map((tab, index) => (
            <button
              key={tab}
              type="button"
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                index === 0
                  ? "bg-primary/15 text-foreground"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground",
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {featureCards.map((card) => (
          <article key={card.title} className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 h-36 rounded-lg border border-border bg-gradient-to-b from-primary/10 to-primary/5" />
            <p className="mb-2 text-lg font-semibold text-foreground">{card.title}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{card.description}</p>
            <div className="mt-4 inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {card.chip}
            </div>
          </article>
        ))}
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-base font-semibold text-foreground">Recent activity</p>
          <p className="text-xs text-muted-foreground">Top 10 most recent cars and leads</p>
        </div>

        <div className="space-y-2">
          {recentActivity.map((entry) =>
            entry.type === "car" ? (
              <button
                key={`car-${entry.id}`}
                type="button"
                className={listItemBaseClass}
                onClick={() => setEditCar(entry.item)}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {entry.item.year} {entry.item.brand} {entry.item.model}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.item.car_type ?? "Unknown type"} · {entry.item.owner_type}
                  </p>
                </div>
                <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5" />
                  {displayDate(entry.at)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Car className="h-3 w-3" />
                  </span>
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      entry.item.status === "available"
                        ? "bg-stat-positive/15 text-stat-positive"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {entry.item.status}
                  </span>
                </div>
              </button>
            ) : (
              <button
                key={`lead-${entry.id}`}
                type="button"
                className={listItemBaseClass}
                onClick={() => setEditLead(entry.item)}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {entry.item.name ?? "Unknown lead"}
                  </p>
                  <p className="text-xs text-muted-foreground">{entry.item.source}</p>
                </div>
                <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5" />
                  {displayDate(entry.at)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Users className="h-3 w-3" />
                  </span>
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      entry.item.lead_type === "buyer"
                        ? "bg-badge-buyer/15 text-badge-buyer"
                        : entry.item.lead_type === "seller"
                          ? "bg-badge-seller/15 text-badge-seller"
                          : "bg-badge-pending/15 text-badge-pending",
                    )}
                  >
                    {entry.item.lead_type}
                  </span>
                </div>
              </button>
            ),
          )}
        </div>

        <div className="pt-1">
          <button
            type="button"
            className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
          >
            See more
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          Styling-first version complete. Data actions and routing hooks can be added next.
        </div>
      </div>

      <CarEditDialog
        car={editCar}
        open={!!editCar}
        onOpenChange={(open) => {
          if (!open) setEditCar(null);
        }}
        onSave={(updated) => {
          setCars((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          setEditCar(updated);
        }}
      />
      <LeadEditDialog
        lead={editLead}
        open={!!editLead}
        onOpenChange={(open) => {
          if (!open) setEditLead(null);
        }}
        onSave={(updated) => {
          setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
          setEditLead(updated);
        }}
        statuses={defaultStatuses}
        cars={cars}
      />
    </section>
  );
}
