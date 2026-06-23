import { useState, type ReactNode } from "react";
import type { Lead } from "@/types/leads";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link2, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";

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

function leadInitial(name: string | null | undefined) {
  const t = (name ?? "").trim();
  return t ? t.charAt(0).toUpperCase() : "?";
}

function translateLeadType(
  leadType: Lead["lead_type"],
  tx: Tx,
): string {
  if (leadType === "buyer") return tx("buyer", "comprador");
  if (leadType === "seller") return tx("seller", "vendedor");
  return tx("pending", "pendiente");
}

function ConnLeadItem({
  lead,
  tx,
  onRemove,
  onOpen,
}: {
  lead: Lead;
  tx: Tx;
  onRemove: () => void;
  onOpen?: () => void;
}) {
  const name = lead.name?.trim() || tx("Unknown lead", "Lead desconocido");
  const meta = [lead.phone?.trim(), lead.instagram_handle?.trim() ? `@${lead.instagram_handle.trim()}` : null].filter(
    Boolean,
  );

  return (
    <div className="conn-lead-item flex items-center gap-3 rounded-lg border border-border bg-background p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#5B8DEF] text-[15px] font-semibold text-white">
        {leadInitial(lead.name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-primary">{name}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
            {translateLeadType(lead.lead_type, tx)}
          </span>
          {meta.length > 0 ? (
            <span className="truncate text-xs text-muted-foreground">{meta.join(" · ")}</span>
          ) : null}
        </div>
      </div>
      {onOpen ? (
        <Button type="button" variant="secondary" size="sm" className="h-7 shrink-0 text-xs" onClick={onOpen}>
          {tx("Open", "Abrir")}
        </Button>
      ) : null}
      <button
        type="button"
        onClick={onRemove}
        className={cn(
          "shrink-0 rounded-sm p-1 text-muted-foreground opacity-70 transition-opacity",
          "hover:text-destructive hover:opacity-100",
        )}
        aria-label={tx("Unlink lead from car", "Desvincular lead del auto")}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export type CarConnectionsSectionProps = {
  tx: Tx;
  linkedLeads: Lead[];
  leadsAvailableToLink: Lead[];
  onLinkLead: (leadId: string) => void;
  onUnlinkLead: (leadId: string) => void;
  onOpenLinkedLead?: (lead: Lead) => void;
};

export function CarConnectionsSection({
  tx,
  linkedLeads,
  leadsAvailableToLink,
  onLinkLead,
  onUnlinkLead,
  onOpenLinkedLead,
}: CarConnectionsSectionProps) {
  const [pickerKey, setPickerKey] = useState(0);
  const [pendingLinkLeadId, setPendingLinkLeadId] = useState("__pick__");

  const handleLink = () => {
    if (pendingLinkLeadId === "__pick__") return;
    onLinkLead(pendingLinkLeadId);
    setPendingLinkLeadId("__pick__");
    setPickerKey((k) => k + 1);
  };

  const noLeadsToLink = leadsAvailableToLink.length === 0;
  const pickPlaceholder = noLeadsToLink
    ? tx("All leads already linked", "Todos los leads ya están vinculados")
    : tx("Choose a lead to link…", "Elige un lead para vincular…");

  return (
    <div className="connections-section flex flex-col gap-4">
      <ConnBlock title={tx("Link lead", "Vincular lead")} icon={<Link2 className="h-3.5 w-3.5" aria-hidden />}>
        <div className="flex items-center gap-2">
          <Select
            key={pickerKey}
            value={pendingLinkLeadId}
            disabled={noLeadsToLink}
            onValueChange={setPendingLinkLeadId}
          >
            <SelectTrigger className="min-w-0 flex-1 disabled:cursor-not-allowed disabled:opacity-60">
              <SelectValue placeholder={pickPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__pick__" disabled>
                {pickPlaceholder}
              </SelectItem>
              {leadsAvailableToLink.map((lead) => (
                <SelectItem key={lead.id} value={lead.id}>
                  {lead.name?.trim() || tx("Unknown lead", "Lead desconocido")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" disabled={pendingLinkLeadId === "__pick__" || noLeadsToLink} onClick={handleLink}>
            <Link2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            {tx("Link", "Vincular")}
          </Button>
        </div>
      </ConnBlock>

      <ConnBlock
        title={tx("Linked leads", "Leads vinculados")}
        icon={<Users className="h-3.5 w-3.5" aria-hidden />}
        count={linkedLeads.length}
      >
        {linkedLeads.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            {tx("No linked leads.", "Sin leads vinculados.")}
          </p>
        ) : (
          <div className="conn-lead-list flex flex-col gap-2">
            {linkedLeads.map((lead) => (
              <ConnLeadItem
                key={lead.id}
                lead={lead}
                tx={tx}
                onRemove={() => onUnlinkLead(lead.id)}
                onOpen={onOpenLinkedLead ? () => onOpenLinkedLead(lead) : undefined}
              />
            ))}
          </div>
        )}
      </ConnBlock>
    </div>
  );
}
