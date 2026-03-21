import { Zap } from "lucide-react";

const AutomationsPage = () => (
  <div className="px-5 pt-14 pb-24 max-w-[430px] mx-auto animate-fade-in">
    <h1 className="text-3xl font-extrabold tracking-tight mb-1">Automations</h1>
    <p className="text-sm text-muted-foreground mb-8">Connect bots and workflows</p>

    <div className="bg-card rounded-lg p-8 shadow-sm flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Zap size={24} className="text-primary" />
      </div>
      <p className="text-sm font-semibold mb-1">No automations yet</p>
      <p className="text-xs text-muted-foreground">Connect your first automation to start capturing leads automatically.</p>
    </div>
  </div>
);

export default AutomationsPage;
