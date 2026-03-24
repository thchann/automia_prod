import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/i18n/LanguageProvider";

interface Automation {
  id: string;
  name: string;
  createdAt: string;
}

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
};

export function AutomationsPage() {
  const { tx, locale } = useLanguage();
  const createAutomation = (): Automation => ({
    id: `a_${Date.now()}`,
    name: tx("Untitled automation", "Automatizacion sin titulo"),
    createdAt: new Date().toISOString(),
  });
  const [automations, setAutomations] = useState<Automation[]>([createAutomation()]);

  const handleAddAutomation = () => {
    setAutomations((prev) => [...prev, createAutomation()]);
  };

  return (
    <div className="flex h-full min-h-0 flex-col box-border text-foreground">
      <header className="flex items-center justify-between border-b-2 border-border px-6 py-3 text-[20px] font-semibold leading-8">
        <span className="text-foreground">{tx("Automations", "Automatizaciones")}</span>

        <Button size="sm" className="px-4" onClick={handleAddAutomation}>
          {tx("Start building", "Empezar")}
        </Button>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex min-w-0 flex-[1_1_0] max-w-[550px] flex-col overflow-y-auto border-r border-border p-4 gap-1">
          <div className="flex max-w-[1280px] items-center overflow-hidden px-3 py-3 text-[16px] leading-6">
            <span className="text-xs font-semibold leading-4 text-muted-foreground">
              Today,&nbsp;
              {new Date().toLocaleDateString(locale, {
                day: "numeric",
                month: "short",
              })}
            </span>
          </div>

          <ul className="flex flex-col gap-1">
            {automations.map((auto) => (
              <li key={auto.id}>
                <button
                  type="button"
                  className="flex h-16 w-full max-w-[515px] cursor-pointer items-center overflow-hidden rounded-md border border-border bg-card px-3 py-3 text-left text-[16px] leading-6 transition-colors hover:bg-muted/60"
                  aria-label={`${auto.name} at ${formatTime(auto.createdAt)}`}
                >
                  <div className="flex h-10 w-full flex-1 items-start gap-3">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex min-w-0 items-center gap-3 text-[13px] font-semibold leading-6 text-foreground">
                        <span className="truncate">{auto.name}</span>
                      </div>
                      <div className="mt-0.5 flex min-w-0 flex-1 items-center gap-3 text-[11px] font-normal leading-4 text-muted-foreground">
                        <span className="truncate">{auto.id}</span>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <span className="text-xs leading-4 text-muted-foreground">
                        {formatTime(auto.createdAt)}
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto px-16 pt-6 pb-0">
          <div className="mb-2 text-xs font-semibold leading-7 tracking-[0.05em] text-muted-foreground uppercase">
            {tx("Assistant", "Asistente")}
          </div>

          <div className="flex w-full items-center justify-between text-[20px] font-bold leading-6 text-foreground">
            <span>{tx("Name", "Nombre")}</span>
            <Button size="sm" variant="outline">
              {tx("Edit", "Editar")}
            </Button>
          </div>

          <div className="mt-5 w-full">
            <div className="mb-2 text-sm font-semibold leading-5 text-foreground">
              {tx("Name", "Nombre")}
            </div>
            <Input
              placeholder={tx("Enter a user friendly name", "Ingresa un nombre facil de reconocer")}
              className="h-8 w-full text-sm"
            />
          </div>

          <div className="mt-6 flex w-full items-center justify-between text-sm leading-5 text-foreground">
            <span>{tx("System instructions", "Instrucciones del sistema")}</span>
            <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full border border-border">
              ?
            </Button>
          </div>

          <div className="mt-2 w-full">
            <Textarea
              placeholder={tx("You are a helpful assistant...", "Eres un asistente util...")}
              className="min-h-[112px] w-full text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
