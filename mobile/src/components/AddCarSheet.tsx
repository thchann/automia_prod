import { useState } from "react";
import DetailSheet from "@/components/DetailSheet";
import type { Car, CarStatus, OwnerType } from "@/types/models";

interface AddCarSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (car: Car) => void;
}

const carTypes = ["sedan", "suv", "sports", "truck", "coupe", "hatchback", "van"];
const ownerTypes: OwnerType[] = ["owned", "client", "advisor"];
const statuses: CarStatus[] = ["available", "sold"];

const AddCarSheet = ({ open, onClose, onSave }: AddCarSheetProps) => {
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [mileage, setMileage] = useState("");
  const [price, setPrice] = useState("");
  const [desiredPrice, setDesiredPrice] = useState("");
  const [carType, setCarType] = useState("");
  const [ownerType, setOwnerType] = useState<OwnerType>("owned");
  const [status, setStatus] = useState<CarStatus>("available");

  const reset = () => {
    setBrand(""); setModel(""); setYear(""); setMileage("");
    setPrice(""); setDesiredPrice(""); setCarType(""); setOwnerType("owned"); setStatus("available");
  };

  const handleSave = () => {
    if (!brand.trim() || !model.trim() || !year.trim()) return;
    const car: Car = {
      id: `c-${Date.now()}`,
      brand: brand.trim(),
      model: model.trim(),
      year: parseInt(year),
      mileage: mileage ? parseInt(mileage) : null,
      price: price ? parseFloat(price) : null,
      desired_price: desiredPrice ? parseFloat(desiredPrice) : null,
      car_type: carType || null,
      listed_at: new Date().toISOString(),
      owner_type: ownerType,
      status,
      attachments: null,
      created_at: new Date().toISOString(),
      updated_at: null,
    };
    onSave(car);
    reset();
    onClose();
  };

  return (
    <DetailSheet open={open} onClose={onClose} title="Add Car">
      <div className="space-y-4">
        <Field label="Brand *" value={brand} onChange={setBrand} placeholder="e.g. BMW" />
        <Field label="Model *" value={model} onChange={setModel} placeholder="e.g. M4 Competition" />
        <Field label="Year *" value={year} onChange={setYear} placeholder="e.g. 2024" type="number" />
        <Field label="Mileage" value={mileage} onChange={setMileage} placeholder="e.g. 12000" type="number" />
        <Field label="Listing Price" value={price} onChange={setPrice} placeholder="e.g. 72500" type="number" />
        <Field label="Desired Price" value={desiredPrice} onChange={setDesiredPrice} placeholder="e.g. 74000" type="number" />

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Type</label>
          <select value={carType} onChange={(e) => setCarType(e.target.value)}
            className="w-full bg-muted rounded-md px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">Select type</option>
            {carTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Owner Type</label>
          <select value={ownerType} onChange={(e) => setOwnerType(e.target.value as OwnerType)}
            className="w-full bg-muted rounded-md px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30">
            {ownerTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as CarStatus)}
            className="w-full bg-muted rounded-md px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30">
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <button onClick={handleSave}
          className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-md active:scale-[0.98] transition-transform mt-2">
          Save Car
        </button>
      </div>
    </DetailSheet>
  );
};

export default AddCarSheet;

const Field = ({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string;
}) => (
  <div>
    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full bg-muted rounded-md px-3 py-2.5 text-sm font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" />
  </div>
);
