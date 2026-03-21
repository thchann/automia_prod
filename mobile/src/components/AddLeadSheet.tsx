import { useState } from "react";
import DetailSheet from "@/components/DetailSheet";
import type { Lead, LeadType } from "@/types/models";
import { mockStatuses } from "@/data/mock";

interface AddLeadSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (lead: Lead) => void;
}

const leadTypes: LeadType[] = ["pending", "buyer", "seller"];
const sources = ["manual", "instagram"];

const AddLeadSheet = ({ open, onClose, onSave }: AddLeadSheetProps) => {
  const [name, setName] = useState("");
  const [leadType, setLeadType] = useState<LeadType>("pending");
  const [source, setSource] = useState("manual");
  const [instagram, setInstagram] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [statusId, setStatusId] = useState(mockStatuses[0]?.id || "");
  const [desiredBudgetMin, setDesiredBudgetMin] = useState("");
  const [desiredBudgetMax, setDesiredBudgetMax] = useState("");
  const [desiredMake, setDesiredMake] = useState("");
  const [desiredModel, setDesiredModel] = useState("");
  const [desiredCarType, setDesiredCarType] = useState("");

  const reset = () => {
    setName(""); setLeadType("pending"); setSource("manual"); setInstagram("");
    setPhone(""); setNotes(""); setStatusId(mockStatuses[0]?.id || "");
    setDesiredBudgetMin(""); setDesiredBudgetMax(""); setDesiredMake(""); setDesiredModel(""); setDesiredCarType("");
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const lead: Lead = {
      id: `l-${Date.now()}`,
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
      created_at: new Date().toISOString(),
      updated_at: null,
    };
    onSave(lead);
    reset();
    onClose();
  };

  return (
    <DetailSheet open={open} onClose={onClose} title="Add Lead">
      <div className="space-y-4">
        <Field label="Name *" value={name} onChange={setName} placeholder="e.g. John Smith" />

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Type</label>
          <select value={leadType} onChange={(e) => setLeadType(e.target.value as LeadType)}
            className="w-full bg-muted rounded-md px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30">
            {leadTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Source</label>
          <select value={source} onChange={(e) => setSource(e.target.value)}
            className="w-full bg-muted rounded-md px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30">
            {sources.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Status</label>
          <select value={statusId} onChange={(e) => setStatusId(e.target.value)}
            className="w-full bg-muted rounded-md px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30">
            {mockStatuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <Field label="Instagram" value={instagram} onChange={setInstagram} placeholder="@handle" />
        <Field label="Phone" value={phone} onChange={setPhone} placeholder="+1 555-000-0000" />

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes..."
            className="w-full bg-muted rounded-md px-3 py-2.5 text-sm font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[80px] resize-none" />
        </div>

        {leadType === "buyer" && (
          <>
            <div className="pt-2">
              <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Buyer Preferences</p>
            </div>
            <Field label="Min Budget" value={desiredBudgetMin} onChange={setDesiredBudgetMin} placeholder="e.g. 25000" type="number" />
            <Field label="Max Budget" value={desiredBudgetMax} onChange={setDesiredBudgetMax} placeholder="e.g. 40000" type="number" />
            <Field label="Preferred Make" value={desiredMake} onChange={setDesiredMake} placeholder="e.g. BMW" />
            <Field label="Preferred Model" value={desiredModel} onChange={setDesiredModel} placeholder="e.g. 3 Series" />
            <Field label="Preferred Type" value={desiredCarType} onChange={setDesiredCarType} placeholder="e.g. sedan" />
          </>
        )}

        <button onClick={handleSave}
          className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-md active:scale-[0.98] transition-transform mt-2">
          Save Lead
        </button>
      </div>
    </DetailSheet>
  );
};

export default AddLeadSheet;

const Field = ({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string;
}) => (
  <div>
    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full bg-muted rounded-md px-3 py-2.5 text-sm font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
  </div>
);
