import { useState } from "react";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { GetStartedBanner } from "@/components/GetStartedBanner";
import { StatsSection } from "@/components/StatsSection";
import { RecommendedModels } from "@/components/RecommendedModels";
import { LeadsPage } from "@/components/leads/LeadsPage";
import { CarsPage } from "@/components/cars/CarsPage";
import { AutomationsPage } from "@/components/automations/AutomationsPage";

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
      default:
        return (
          <>
            <GetStartedBanner />
            <StatsSection />
            <RecommendedModels />
          </>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden">
      <DashboardHeader />
      <div className="flex flex-1 min-h-0 mt-[54px] pb-2 pr-2">
        <DashboardSidebar activeItem={activeItem} onActiveItemChange={setActiveItem} />
        <main className="flex-1 overflow-y-auto scrollbar-none border border-border rounded-lg bg-card">
          <div className="max-w-[1400px] mx-auto px-6 py-4 flex flex-col gap-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
