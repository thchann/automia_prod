import { useState, type ReactNode } from "react";
import type { Car } from "@/types/leads";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Car as CarIcon, Link2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatCarMileage,
  formatCarPrice,
  formatCarTitle,
  getCarThumbnailColor,
  getCarThumbnailImageUrl,
} from "@/lib/carDisplay";

export type LinkedCarRow =
  | { type: "car"; car: Car }
  | { type: "orphan"; id: string };

type Tx = (enText: string, esText: string) => string;

function ConnBlock({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: ReactNode;
  count?: number;
  children: ReactNode;
}) {
  return (
    <div className="conn-block">
      <div className="conn-block-header mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
        {icon}
        <span>{title}</span>
        {count != null && count > 0 ? (
          <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {count}
          </span>
        ) : null}
      </div>
      <div className="conn-block-body">{children}</div>
    </div>
  );
}

function ConnAutoItem({
  car,
  locale,
  tx,
  onRemove,
}: {
  car: Car;
  locale: string;
  tx: Tx;
  onRemove: () => void;
}) {
  const thumbUrl = getCarThumbnailImageUrl(car);
  const isAvailable = car.status === "available";
  const metaParts = [formatCarPrice(car.price, locale), formatCarMileage(car.mileage, locale)].filter(
    (part) => part !== "—",
  );

  return (
    <div className="conn-auto-item flex items-center gap-3 rounded-lg border border-border bg-background p-3">
      {thumbUrl ? (
        <img src={thumbUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
      ) : (
        <div
          className="h-10 w-10 shrink-0 rounded"
          style={{ backgroundColor: getCarThumbnailColor(car) }}
          aria-hidden
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-primary">{formatCarTitle(car)}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          {metaParts.length > 0 ? (
            <span className="text-xs text-muted-foreground">{metaParts.join(" · ")}</span>
          ) : null}
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
              isAvailable
                ? "bg-[oklch(0.93_0.06_145)] text-[oklch(0.46_0.14_145)]"
                : "bg-muted text-muted-foreground",
            )}
          >
            {isAvailable ? tx("available", "disponible") : tx("sold", "vendido")}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded-sm p-1 text-muted-foreground opacity-70 transition-opacity hover:text-destructive hover:opacity-100"
        aria-label={tx("Unlink car from lead", "Desvincular auto del lead")}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function ConnAutoItemOrphan({
  id,
  tx,
  onRemove,
}: {
  id: string;
  tx: Tx;
  onRemove: () => void;
}) {
  return (
    <div className="conn-auto-item flex items-center gap-3 rounded-lg border border-border bg-background p-3">
      <div className="h-10 w-10 shrink-0 rounded bg-muted" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {tx("Unknown car (not in inventory)", "Auto desconocido (no en inventario)")}
        </p>
        <p className="truncate font-mono text-xs text-muted-foreground" title={id}>
          {id}
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded-sm p-1 text-muted-foreground opacity-70 transition-opacity hover:text-destructive hover:opacity-100"
        aria-label={tx("Unlink car from lead", "Desvincular auto del lead")}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export type LeadConnectionsSectionProps = {
  tx: Tx;
  locale: string;
  linkedRows: LinkedCarRow[];
  carsAvailableToLink: Car[];
  onLinkCar: (carId: string) => void;
  onUnlinkCar: (carId: string) => void;
};

export function LeadConnectionsSection({
  tx,
  locale,
  linkedRows,
  carsAvailableToLink,
  onLinkCar,
  onUnlinkCar,
}: LeadConnectionsSectionProps) {
  const [pickerKey, setPickerKey] = useState(0);
  const [pendingLinkCarId, setPendingLinkCarId] = useState("__pick__");

  const handleLink = () => {
    if (pendingLinkCarId === "__pick__") return;
    onLinkCar(pendingLinkCarId);
    setPendingLinkCarId("__pick__");
    setPickerKey((k) => k + 1);
  };

  const noCarsToLink = carsAvailableToLink.length === 0;
  const pickPlaceholder = noCarsToLink
    ? tx("All cars already linked", "Todos los autos ya están vinculados")
    : tx("Choose a car to link…", "Elige un auto para vincular…");

  return (
    <div className="connections-section flex flex-col gap-4">
      <ConnBlock title={tx("Link car", "Vincular auto")} icon={<Link2 className="h-3.5 w-3.5" aria-hidden />}>
        <div className="flex items-center gap-2">
          <Select
            key={pickerKey}
            value={pendingLinkCarId}
            disabled={noCarsToLink}
            onValueChange={setPendingLinkCarId}
          >
            <SelectTrigger className="min-w-0 flex-1 disabled:cursor-not-allowed disabled:opacity-60">
              <SelectValue placeholder={pickPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__pick__" disabled>
                {pickPlaceholder}
              </SelectItem>
              {carsAvailableToLink.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.year} {c.brand} {c.model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" disabled={pendingLinkCarId === "__pick__" || noCarsToLink} onClick={handleLink}>
            <Link2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            {tx("Link", "Vincular")}
          </Button>
        </div>
      </ConnBlock>

      <ConnBlock
        title={tx("Linked cars", "Autos vinculados")}
        icon={<CarIcon className="h-3.5 w-3.5" aria-hidden />}
        count={linkedRows.length}
      >
        {linkedRows.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            {tx("No linked cars.", "Sin autos vinculados.")}
          </p>
        ) : (
          <div className="conn-auto-list flex flex-col gap-2">
            {linkedRows.map((row) =>
              row.type === "car" ? (
                <ConnAutoItem
                  key={row.car.id}
                  car={row.car}
                  locale={locale}
                  tx={tx}
                  onRemove={() => onUnlinkCar(row.car.id)}
                />
              ) : (
                <ConnAutoItemOrphan
                  key={`orphan-${row.id}`}
                  id={row.id}
                  tx={tx}
                  onRemove={() => onUnlinkCar(row.id)}
                />
              ),
            )}
          </div>
        )}
      </ConnBlock>
    </div>
  );
}
