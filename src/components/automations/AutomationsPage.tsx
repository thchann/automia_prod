import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Automation {
  id: string;
  name: string;
  instructions: string;
  medium: "instagram" | "whatsapp" | null;
  linked: boolean;
  created_at: string;
}

const defaultAutomation: Automation = {
  id: "a1",
  name: "",
  instructions: "",
  medium: null,
  linked: false,
  created_at: new Date().toISOString(),
};

export function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([defaultAutomation]);
  const [selectedId, setSelectedId] = useState<string>("a1");

  const selected = automations.find((a) => a.id === selectedId) || automations[0];

  const updateSelected = (updates: Partial<Automation>) => {
    setAutomations((prev) =>
      prev.map((a) => (a.id === selectedId ? { ...a, ...updates } : a))
    );
  };

  const addAutomation = () => {
    const newAuto: Automation = {
      id: `a_${Date.now()}`,
      name: "",
      instructions: "",
      medium: null,
      linked: false,
      created_at: new Date().toISOString(),
    };
    setAutomations((prev) => [...prev, newAuto]);
    setSelectedId(newAuto.id);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex h-full gap-0">
      {/* Left panel - list */}
      <div className="w-[280px] min-w-[280px] border-r border-border flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h1 className="text-lg font-semibold text-foreground">Automations</h1>
          <Button size="sm" variant="outline" onClick={addAutomation}>
            <Plus className="h-4 w-4 mr-1" /> Create
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 pt-3 pb-1">
            <span className="text-xs text-muted-foreground">Today, {new Date().toLocaleDateString("en-US", { day: "numeric", month: "short" })}</span>
          </div>
          {automations.map((auto) => (
            <button
              key={auto.id}
              onClick={() => setSelectedId(auto.id)}
              className={`w-full text-left px-4 py-3 transition-colors ${
                selectedId === auto.id
                  ? "bg-accent text-foreground"
                  : "hover:bg-surface-hover text-foreground"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium truncate">
                  {auto.name || "Untitled automation"}
                </span>
                <span className="text-xs text-muted-foreground ml-2 shrink-0">{formatDate(auto.created_at)}</span>
              </div>
              <div className="text-xs text-muted-foreground truncate mt-0.5">{auto.id}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel - editor */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {selected && (
          <div className="max-w-[640px] mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Automation</span>
            </div>

            {/* Name */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Name</label>
              <Input
                placeholder="Enter a user friendly name"
                value={selected.name}
                onChange={(e) => updateSelected({ name: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">{selected.id}</p>
            </div>

            {/* System instructions */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">System instructions</label>
              <Textarea
                placeholder="You are a helpful assistant..."
                value={selected.instructions}
                onChange={(e) => updateSelected({ instructions: e.target.value })}
                className="min-h-[140px] resize-y"
              />
            </div>

            {/* Medium */}
            <div>
              <label className="text-sm font-medium text-foreground mb-3 block">Medium</label>
              <div className="flex gap-3">
                <button
                  onClick={() => updateSelected({ medium: selected.medium === "instagram" ? null : "instagram", linked: false })}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    selected.medium === "instagram"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  }`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                  Instagram
                </button>
                <button
                  onClick={() => updateSelected({ medium: selected.medium === "whatsapp" ? null : "whatsapp", linked: false })}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    selected.medium === "whatsapp"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  }`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </button>
              </div>

              {/* Link to platform */}
              {selected.medium && !selected.linked && (
                <div className="mt-4">
                  <button
                    onClick={() => updateSelected({ linked: true })}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-lg border border-border hover:bg-surface-hover transition-colors"
                  >
                    {selected.medium === "instagram" ? (
                      <svg className="h-5 w-5 text-pink-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    )}
                    <span className="text-sm font-medium text-foreground">
                      Link to {selected.medium === "instagram" ? "Instagram" : "WhatsApp"}
                    </span>
                  </button>
                </div>
              )}

              {selected.medium && selected.linked && (
                <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                    Connected to {selected.medium === "instagram" ? "Instagram" : "WhatsApp"}
                  </span>
                  <button
                    onClick={() => updateSelected({ linked: false })}
                    className="ml-auto text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
