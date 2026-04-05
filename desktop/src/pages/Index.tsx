import { useState } from "react";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { LeadsPage } from "@/components/leads/LeadsPage";
import { CarsPage } from "@/components/cars/CarsPage";
import { AutomationsPage } from "@/components/automations/AutomationsPage";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { HomeOverview } from "@/components/home/HomeOverview";

const Index = () => {
  const [activeItem, setActiveItem] = useState("Home");

  const renderContent = () => {
    switch (activeItem) {
      case "Leads":
        return <LeadsPage />;
      case "Cars":
        return <CarsPage />;
      case "Automations":
        return <AutomationsPage />;
      case "Settings":
        return <SettingsPage />;
        default:
        return <HomeOverview onNavigate={(target) => setActiveItem(target)} />;
    }
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <DashboardHeader />
      <div className="mt-[54px] flex min-h-0 flex-1 overscroll-y-none pb-2 pr-2">
        <DashboardSidebar activeItem={activeItem} onActiveItemChange={setActiveItem} />
        <main className="flex-1 overflow-y-auto overscroll-y-none rounded-lg border border-border bg-card">
          <div className="mx-auto flex max-w-[1400px] flex-col gap-8 px-6 py-4">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
