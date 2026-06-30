import { useMemo } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import {
  ApiError,
  listCars,
  listLeadStatuses,
  listLeads,
} from "@automia/api";
import {
  ArrowDown,
  ArrowUp,
  Car,
  CornerDownLeft,
  Home,
  Link2,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { Command as Cmdk } from "cmdk";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageProvider";
import { mapCarFromApi, mapLeadFromApi, mapStatusFromApi } from "@/lib/apiMappers";
import { matchesFuzzy } from "@/lib/fuzzyMatch";
import { buildCarSearchHaystack, buildLeadSearchHaystack } from "@/lib/tableSearchHaystack";
import { translateStatusName } from "@/lib/leadStatusChip";
import { cn } from "@/lib/utils";
import type { Car as CarType, Lead } from "@/types/leads";

export type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (section: string) => void;
  onCreateLead: () => void;
};

type NavSection = "Home" | "Leads" | "Cars";

function getLeadInitials(name: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

function formatCarPrice(price: number | null): string {
  if (price == null) return "—";
  return `$${Number(price).toLocaleString()}`;
}

function leadDisplayName(lead: Lead): string {
  return lead.name?.trim() || lead.instagram_handle?.trim() || lead.phone?.trim() || "—";
}

function carDisplayName(car: CarType): string {
  return `${car.brand} ${car.model}`.trim();
}

export function CommandPalette({
  open,
  onOpenChange,
  onNavigate,
  onCreateLead,
}: CommandPaletteProps) {
  const { tx } = useLanguage();

  const { data: leadsData } = useQuery({
    queryKey: ["leads"],
    queryFn: () => listLeads({ limit: 200 }),
    enabled: open,
  });
  const { data: statusesData } = useQuery({
    queryKey: ["lead-statuses"],
    queryFn: () => listLeadStatuses(),
    enabled: open,
  });
  const { data: carsData } = useQuery({
    queryKey: ["cars"],
    queryFn: async () => {
      try {
        return await listCars();
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
          return { cars: [] };
        }
        throw e;
      }
    },
    enabled: open,
  });

  const statuses = useMemo(
    () => statusesData?.statuses.map(mapStatusFromApi) ?? [],
    [statusesData],
  );

  const leads = useMemo(() => {
    if (!leadsData?.leads) return [];
    return leadsData.leads.map((r) => mapLeadFromApi(r, statuses));
  }, [leadsData, statuses]);

  const cars = useMemo(
    () => carsData?.cars.map(mapCarFromApi) ?? [],
    [carsData],
  );

  const carsById = useMemo(() => new Map(cars.map((car) => [car.id, car])), [cars]);

  const closeAndNavigate = (section: NavSection) => {
    onOpenChange(false);
    onNavigate(section);
  };

  const closeAndCreateLead = () => {
    onOpenChange(false);
    onNavigate("Leads");
    onCreateLead();
  };

  const closeAndNavigateCars = () => {
    onOpenChange(false);
    onNavigate("Cars");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-[oklch(0.2_0.02_60/0.45)] backdrop-blur-md" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-[640px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-border bg-card shadow-2xl outline-none origin-center",
            "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
        >
          <DialogTitle className="sr-only">
            {tx("Search leads, cars, and actions", "Buscar leads, autos y acciones")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {tx(
              "Search and navigate leads, cars, and quick actions",
              "Busca y navega leads, autos y acciones rapidas",
            )}
          </DialogDescription>

          <Command
            filter={(value, search) => (matchesFuzzy(search, value) ? 1 : 0)}
            className="bg-card [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-2.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground/80"
          >
            <div className="cmd-input-wrap flex items-center gap-2 border-b border-border px-[18px] py-3.5">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <Cmdk.Input
                placeholder={tx(
                  "Search leads, cars, actions…",
                  "Buscar leads, autos, acciones...",
                )}
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <kbd className="hidden shrink-0 rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
                Esc
              </kbd>
            </div>

            <CommandList className="cmd-results max-h-[min(560px,60vh)] overflow-y-auto p-1.5">
              <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">
                {tx("No results found.", "No se encontraron resultados.")}
              </CommandEmpty>

              <CommandGroup heading={tx("Actions", "Acciones")}>
                <CommandItem
                  value={tx("Go to Home", "Ir a Inicio")}
                  onSelect={() => closeAndNavigate("Home")}
                  className="gap-3 rounded-lg px-3 py-2.5"
                >
                  <Home className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{tx("Go to Home", "Ir a Inicio")}</span>
                </CommandItem>
                <CommandItem
                  value={tx("Go to Leads", "Ir a Leads")}
                  onSelect={() => closeAndNavigate("Leads")}
                  className="gap-3 rounded-lg px-3 py-2.5"
                >
                  <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{tx("Go to Leads", "Ir a Leads")}</span>
                </CommandItem>
                <CommandItem
                  value={tx("Go to Inventory", "Ir a Inventario")}
                  onSelect={() => closeAndNavigate("Cars")}
                  className="gap-3 rounded-lg px-3 py-2.5"
                >
                  <Car className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{tx("Go to Inventory", "Ir a Inventario")}</span>
                </CommandItem>
                <CommandItem
                  value={tx("Create new lead", "Crear nuevo lead")}
                  onSelect={closeAndCreateLead}
                  className="gap-3 rounded-lg px-3 py-2.5"
                >
                  <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{tx("Create new lead", "Crear nuevo lead")}</span>
                </CommandItem>
                <CommandItem
                  value={tx("Add car", "Agregar auto")}
                  onSelect={closeAndNavigateCars}
                  className="gap-3 rounded-lg px-3 py-2.5"
                >
                  <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{tx("Add car", "Agregar auto")}</span>
                </CommandItem>
                <CommandItem
                  value={tx(
                    "Import car from URL (Neoautos)",
                    "Importar auto desde URL (Neoautos)",
                  )}
                  onSelect={closeAndNavigateCars}
                  className="gap-3 rounded-lg px-3 py-2.5"
                >
                  <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>
                    {tx(
                      "Import car from URL (Neoautos)",
                      "Importar auto desde URL (Neoautos)",
                    )}
                  </span>
                </CommandItem>
              </CommandGroup>

              {leads.length > 0 ? (
                <CommandGroup heading={tx("Leads", "Leads")}>
                  {leads.map((lead) => {
                    const status = statuses.find((s) => s.id === lead.status_id);
                    const statusName = status
                      ? translateStatusName(status.name, tx)
                      : "";
                    const car = lead.car_id ? carsById.get(lead.car_id) : undefined;
                    const haystack = buildLeadSearchHaystack(lead, car, statusName);
                    const name = leadDisplayName(lead);

                    return (
                      <CommandItem
                        key={lead.id}
                        value={`${name} ${haystack}`}
                        onSelect={() => closeAndNavigate("Leads")}
                        className="gap-3 rounded-lg px-3 py-2.5"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                          {getLeadInitials(lead.name)}
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          <span className="font-medium text-foreground">{name}</span>
                          {statusName ? (
                            <span className="text-muted-foreground"> · {statusName}</span>
                          ) : null}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ) : null}

              {cars.length > 0 ? (
                <CommandGroup heading={tx("Inventory", "Inventario")}>
                  {cars.map((car) => {
                    const haystack = buildCarSearchHaystack(car);
                    const label = carDisplayName(car);

                    return (
                      <CommandItem
                        key={car.id}
                        value={`${label} ${car.year} ${haystack}`}
                        onSelect={() => closeAndNavigate("Cars")}
                        className="gap-3 rounded-lg px-3 py-2.5"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted" />
                        <span className="min-w-0 flex-1 truncate">
                          <span className="font-medium text-foreground">{label}</span>
                          <span className="text-muted-foreground"> · {car.year}</span>
                        </span>
                        <span className="shrink-0 text-sm text-foreground">
                          {formatCarPrice(car.price)}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ) : null}
            </CommandList>

            <div className="cmd-footer flex items-center justify-between border-t border-border bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <ArrowUp className="h-3 w-3" />
                  <ArrowDown className="h-3 w-3" />
                  {tx("navigate", "navegar")}
                </span>
                <span className="inline-flex items-center gap-1">
                  <CornerDownLeft className="h-3 w-3" />
                  {tx("select", "seleccionar")}
                </span>
              </div>
              <span>Automia · Command</span>
            </div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
