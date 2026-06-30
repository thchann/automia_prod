import { useEffect, useRef, useState } from "react";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { CommandPalette } from "@/components/command/CommandPalette";
import { LeadsPage } from "@/components/leads/LeadsPage";
import { CarsPage } from "@/components/cars/CarsPage";
import { AutomationsPage } from "@/components/automations/AutomationsPage";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { HomeOverview } from "@/components/home/HomeOverview";

const FADE_DURATION_MS = 150;

const Index = () => {
  const [activeItem, setActiveItem] = useState("Home");
  const [displayedItem, setDisplayedItem] = useState("Home");
  const [transitionStage, setTransitionStage] = useState<"idle" | "fading-out" | "fading-in">("idle");
  const [commandOpen, setCommandOpen] = useState(false);
  const [generateLeadSignal, setGenerateLeadSignal] = useState(0);
  const fadeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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
        return (
          <LeadsPage
            generateLeadSignal={generateLeadSignal}
            onRequestGenerateLead={() => setGenerateLeadSignal((s) => s + 1)}
          />
        );
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
      <DashboardHeader onOpenSearch={() => setCommandOpen(true)} />
      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onNavigate={requestSectionChange}
        onCreateLead={() => setGenerateLeadSignal((s) => s + 1)}
      />
      <div className="mt-[54px] flex min-h-0 flex-1 overscroll-y-none pb-2 pr-2">
        <DashboardSidebar activeItem={activeItem} onActiveItemChange={requestSectionChange} />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden overscroll-y-none rounded-lg border border-border bg-card">
          <div className="flex w-full min-h-0 flex-1 flex-col gap-8 px-10 pt-10 pb-0">
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
