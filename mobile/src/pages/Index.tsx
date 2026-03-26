import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import Dashboard from "@/pages/Dashboard";
import CarsPage from "@/pages/CarsPage";
import LeadsPage from "@/pages/LeadsPage";
import AutomationsPage from "@/pages/AutomationsPage";
import SettingsPage from "@/pages/SettingsPage";

type Tab = "dashboard" | "cars" | "leads" | "automations" | "settings";

const Index = () => {
  const [tab, setTab] = useState<Tab>("dashboard");

  const renderTab = () => {
    switch (tab) {
      case "dashboard": return <Dashboard onTabChange={setTab} />;
      case "cars": return <CarsPage />;
      case "leads": return <LeadsPage />;
      case "automations": return <AutomationsPage />;
      case "settings": return <SettingsPage />;
    }
  };

  return (
    <div className="h-[100dvh] overflow-hidden bg-background">
      <div className="mx-auto flex h-full max-w-[430px] flex-col">
        <div className="flex-1 overflow-y-auto pb-24">
          {renderTab()}
        </div>
      </div>
      <BottomNav active={tab} onTabChange={setTab} />
    </div>
  );
};

export default Index;
