import { DashboardSidebar } from "@/components/DashboardSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { GetStartedBanner } from "@/components/GetStartedBanner";
import { StatsSection } from "@/components/StatsSection";
import { RecommendedModels } from "@/components/RecommendedModels";

const Index = () => {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-[1400px] mx-auto px-6 py-4 flex flex-col gap-8">
            <GetStartedBanner />
            <StatsSection />
            <RecommendedModels />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
