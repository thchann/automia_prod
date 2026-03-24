import { useEffect, useState } from "react";
import DetailSheet from "@/components/DetailSheet";
import type { Lead, LeadStatus, LeadType } from "@/types/models";
import { useLanguage } from "@/i18n/LanguageProvider";

interface AddLeadSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (lead: Lead) => void;
  statuses: LeadStatus[];
  initialLead?: Lead | null;
  onAddStatus?: (name: string) => LeadStatus;
}

const leadTypes: LeadType[] = ["pending", "buyer", "seller"];
const sources = ["manual", "instagram"];

const AddLeadSheet = ({
  open,
  onClose,
  onSave,
  statuses,
  initialLead = null,
  onAddStatus,
}: AddLeadSheetProps) => {
  const { tx } = useLanguage();
  const [name, setName] = useState("");
  const [leadType, setLeadType] = useState<LeadType>("pending");
  const [source, setSource] = useState("manual");
  const [instagram, setInstagram] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [statusId, setStatusId] = useState(statuses[0]?.id || "");
  const [desiredBudgetMin, setDesiredBudgetMin] = useState("");
  const [desiredBudgetMax, setDesiredBudgetMax] = useState("");
  const [desiredMake, setDesiredMake] = useState("");
  const [desiredModel, setDesiredModel] = useState("");
  const [desiredCarType, setDesiredCarType] = useState("");
  const [showAddStatus, setShowAddStatus] = useState(false);
  const [newStatusName, setNewStatusName] = useState("");

  const reset = () => {
    setName(""); setLeadType("pending"); setSource("manual"); setInstagram("");
    setPhone(""); setNotes(""); setStatusId(statuses[0]?.id || "");
    setDesiredBudgetMin(""); setDesiredBudgetMax(""); setDesiredMake(""); setDesiredModel(""); setDesiredCarType("");
    setShowAddStatus(false); setNewStatusName("");
  };

  useEffect(() => {
    if (!open) return;
    if (!initialLead) {
      reset();
      return;
    }
    setName(initialLead.name ?? "");
    setLeadType(initialLead.lead_type);
    setSource(initialLead.source ?? "manual");
    setInstagram(initialLead.instagram_handle ?? "");
    setPhone(initialLead.phone ?? "");
    setNotes(initialLead.notes ?? "");
    setStatusId(initialLead.status_id ?? statuses[0]?.id ?? "");
    setDesiredBudgetMin(initialLead.desired_budget_min != null ? String(initialLead.desired_budget_min) : "");
    setDesiredBudgetMax(initialLead.desired_budget_max != null ? String(initialLead.desired_budget_max) : "");
    setDesiredMake(initialLead.desired_make ?? "");
    setDesiredModel(initialLead.desired_model ?? "");
    setDesiredCarType(initialLead.desired_car_type ?? "");
    setShowAddStatus(false);
    setNewStatusName("");
  }, [open, initialLead, statuses]);

  const handleSave = () => {
    if (!name.trim()) return;
    const lead: Lead = {
      id: initialLead?.id ?? `l-${Date.now()}`,
      name: name.trim(),
      lead_type: leadType,
      source,
      instagram_handle: instagram || null,
      phone: phone || null,
      notes: notes || null,
      status_id: statusId || null,
      car_id: null,
      desired_budget_min: desiredBudgetMin ? parseFloat(desiredBudgetMin) : null,
      desired_budget_max: desiredBudgetMax ? parseFloat(desiredBudgetMax) : null,
      desired_mileage_max: null,
      desired_year_min: null,
      desired_year_max: null,
      desired_make: desiredMake || null,
      desired_model: desiredModel || null,
      desired_car_type: desiredCarType || null,
      created_at: initialLead?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onSave(lead);
    reset();
    onClose();
  };

  const handleAddStatus = () => {
    const value = newStatusName.trim();
    if (!value || !onAddStatus) return;
    const created = onAddStatus(value);
    setStatusId(created.id);
    setNewStatusName("");
    setShowAddStatus(false);
  };

  return (
    <DetailSheet
      open={open}
      onClose={onClose}
      title={initialLead ? tx("Edit Lead", "Editar lead") : tx("Add Lead", "Agregar lead")}
    >
      <div className="space-y-4">
        <Field label={tx("Name *", "Nombre *")} value={name} onChange={setName} placeholder="e.g. John Smith" />

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{tx("Type", "Tipo")}</label>
          <select value={leadType} onChange={(e) => setLeadType(e.target.value as LeadType)}
            className="w-full bg-muted rounded-md px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30">
            {leadTypes.map((t) => (
              <option key={t} value={t}>
                {t === "buyer" ? tx("buyer", "comprador") : t === "seller" ? tx("seller", "vendedor") : tx("pending", "pendiente")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{tx("Source", "Origen")}</label>
          <select value={source} onChange={(e) => setSource(e.target.value)}
            className="w-full bg-muted rounded-md px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30">
            {sources.map((s) => (
              <option key={s} value={s}>
                {s === "manual" ? tx("manual", "manual") : "instagram"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{tx("Status", "Estado")}</label>
          <select value={statusId} onChange={(e) => setStatusId(e.target.value)}
            className="w-full bg-muted rounded-md px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30">
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {translateStatusName(s.name, tx)}
              </option>
            ))}
          </select>
          {initialLead ? (
            <div className="mt-2">
              {!showAddStatus ? (
                <button
                  type="button"
                  onClick={() => setShowAddStatus(true)}
                  className="text-xs font-medium text-primary"
                >
                  {tx("Add status", "Agregar estado")}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    value={newStatusName}
                    onChange={(e) => setNewStatusName(e.target.value)}
                    placeholder={tx("New status name", "Nombre del nuevo estado")}
                    className="flex-1 bg-muted rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    type="button"
                    onClick={handleAddStatus}
                    className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                  >
                    {tx("Save", "Guardar")}
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <Field label="Instagram" value={instagram} onChange={setInstagram} placeholder="@handle" />
        <Field label={tx("Phone", "Telefono")} value={phone} onChange={setPhone} placeholder="+1 555-000-0000" />

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{tx("Notes", "Notas")}</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={tx("Any notes...", "Alguna nota...")}
            className="w-full bg-muted rounded-md px-3 py-2.5 text-sm font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[80px] resize-none" />
        </div>

        {leadType === "buyer" && (
          <>
            <div className="pt-2">
              <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">{tx("Buyer Preferences", "Preferencias del comprador")}</p>
            </div>
            <Field label={tx("Min Budget", "Presupuesto minimo")} value={desiredBudgetMin} onChange={setDesiredBudgetMin} placeholder="e.g. 25000" type="number" />
            <Field label={tx("Max Budget", "Presupuesto maximo")} value={desiredBudgetMax} onChange={setDesiredBudgetMax} placeholder="e.g. 40000" type="number" />
            <Field label={tx("Preferred Make", "Marca preferida")} value={desiredMake} onChange={setDesiredMake} placeholder="e.g. BMW" />
            <Field label={tx("Preferred Model", "Modelo preferido")} value={desiredModel} onChange={setDesiredModel} placeholder="e.g. 3 Series" />
            <Field label={tx("Preferred Type", "Tipo preferido")} value={desiredCarType} onChange={setDesiredCarType} placeholder="e.g. sedan" />
          </>
        )}

        <button onClick={handleSave}
          className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-md active:scale-[0.98] transition-transform mt-2">
          {initialLead ? tx("Save Changes", "Guardar cambios") : tx("Save Lead", "Guardar lead")}
        </button>
      </div>
    </DetailSheet>
  );
};

export default AddLeadSheet;

function translateStatusName(name: string, tx: (enText: string, esText: string) => string) {
  switch (name.toLowerCase()) {
    case "new":
      return tx("New", "Nuevo");
    case "contacted":
      return tx("Contacted", "Contactado");
    case "qualified":
      return tx("Qualified", "Calificado");
    case "closed":
      return tx("Closed", "Cerrado");
    default:
      return name;
  }
}

const Field = ({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string;
}) => (
  <div>
    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full bg-muted rounded-md px-3 py-2.5 text-sm font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
  </div>
);
