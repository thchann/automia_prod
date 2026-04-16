import { useEffect, useRef, useState } from "react";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { LeadsPage } from "@/components/leads/LeadsPage";
import { CarsPage } from "@/components/cars/CarsPage";
import { AutomationsPage } from "@/components/automations/AutomationsPage";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { HomeOverview } from "@/components/home/HomeOverview";

const FADE_DURATION_MS = 250;

const Index = () => {
  const [activeItem, setActiveItem] = useState("Home");
  const [displayedItem, setDisplayedItem] = useState("Home");
  const [transitionStage, setTransitionStage] = useState<"idle" | "fading-out" | "fading-in">("idle");
  const fadeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (fadeTimeoutRef.current !== null) {
        window.clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, []);

  const requestSectionChange = (target: string) => {
    if (target === activeItem && target === displayedItem && transitionStage === "idle") {
      return;
    }

    if (fadeTimeoutRef.current !== null) {
      window.clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }

    setActiveItem(target);

    if (target === displayedItem) {
      setTransitionStage("idle");
      return;
    }

    setTransitionStage("fading-out");
    fadeTimeoutRef.current = window.setTimeout(() => {
      setDisplayedItem(target);
      setTransitionStage("fading-in");
      fadeTimeoutRef.current = window.setTimeout(() => {
        setTransitionStage("idle");
        fadeTimeoutRef.current = null;
      }, FADE_DURATION_MS);
    }, FADE_DURATION_MS);
  };

  const renderContent = () => {
    switch (displayedItem) {
      case "Leads":
        return <LeadsPage />;
      case "Cars":
        return <CarsPage />;
      case "Automations":
        return <AutomationsPage />;
      case "Settings":
        return <SettingsPage />;
      default:
        return <HomeOverview onNavigate={requestSectionChange} />;
    }
  };

  const contentTransitionClass =
    transitionStage === "fading-out"
      ? "opacity-0"
      : transitionStage === "fading-in"
        ? "opacity-100"
        : "opacity-100";

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <DashboardHeader />
      <div className="mt-[54px] flex min-h-0 flex-1 overscroll-y-none pb-2 pr-2">
        <DashboardSidebar activeItem={activeItem} onActiveItemChange={requestSectionChange} />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-none rounded-lg border border-border bg-card">
          <div className="flex w-full min-h-0 flex-1 flex-col gap-8 px-6 py-4">
            <div
              className={`flex min-h-0 flex-1 flex-col transition-opacity ease-out ${contentTransitionClass}`}
              style={{ transitionDuration: `${FADE_DURATION_MS}ms` }}
            >
              {renderContent()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
