import { Zap } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";

const AutomationsPage = () => {
  const { tx } = useLanguage();

  return (
    <div className="px-5 pt-12 pb-24 max-w-[430px] mx-auto animate-fade-in">
      <h1 className="text-3xl font-extrabold tracking-tight mb-1">{tx("Automations", "Automatizaciones")}</h1>
      <p className="text-sm text-muted-foreground mb-8">{tx("Connect bots and workflows", "Conecta bots y flujos de trabajo")}</p>

      <div className="rounded-md border border-border bg-card p-8 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Zap size={24} className="text-primary" />
        </div>
        <p className="text-sm font-semibold mb-1">{tx("No automations yet", "Aun no hay automatizaciones")}</p>
        <p className="text-xs text-muted-foreground">{tx("Connect your first automation to start capturing leads automatically.", "Conecta tu primera automatizacion para empezar a capturar leads automaticamente.")}</p>
      </div>
    </div>
  );
};

export default AutomationsPage;
