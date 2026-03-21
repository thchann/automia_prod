import { ReactNode, useEffect, useState } from "react";
import { X, Pencil } from "lucide-react";

interface DetailSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  onEdit?: () => void;
  children: ReactNode;
}

const DetailSheet = ({ open, onClose, title, subtitle, onEdit, children }: DetailSheetProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);

  if (!open && !visible) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-foreground/30 transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`absolute bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-card rounded-t-[20px] shadow-2xl transition-transform duration-300 ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "88vh" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 border-b border-border">
          <button onClick={onClose} className="p-2 -ml-2 rounded-full active:scale-95 active:bg-muted transition-all">
            <X size={20} />
          </button>
          <div className="text-center flex-1">
            <h2 className="text-lg font-bold leading-tight">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {onEdit ? (
            <button onClick={onEdit} className="p-2 -mr-2 rounded-full active:scale-95 active:bg-muted transition-all text-primary">
              <Pencil size={18} />
            </button>
          ) : (
            <div className="w-9" />
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: "calc(88vh - 100px)" }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default DetailSheet;

export const DetailRow = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div className="py-3 border-b border-border last:border-b-0">
    <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
    <p className="text-sm font-semibold tabular-nums">{value || "—"}</p>
  </div>
);
