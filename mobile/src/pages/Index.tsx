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
      case "dashboard": return <Dashboard />;
      case "cars": return <CarsPage />;
      case "leads": return <LeadsPage />;
      case "automations": return <AutomationsPage />;
      case "settings": return <SettingsPage />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {renderTab()}
      <BottomNav active={tab} onTabChange={setTab} />
    </div>
  );
};

export default Index;
