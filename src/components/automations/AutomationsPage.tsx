import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Automation {
  id: string;
  name: string;
  createdAt: string;
}

const createAutomation = (): Automation => ({
  id: `a_${Date.now()}`,
  name: "Untitled automation",
  createdAt: new Date().toISOString(),
});

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
};

export function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([createAutomation()]);

  const handleAddAutomation = () => {
    setAutomations((prev) => [...prev, createAutomation()]);
  };

  return (
    <div className="flex h-full flex-col box-border text-[rgb(220,220,220)]">
      {/* Header – title and primary action on one row */}
      <header className="flex items-center justify-between border-b-2 border-[rgba(0,0,0,0.08)] px-6 py-3 text-[20px] font-semibold leading-8">
        <span>Automations</span>

        <Button size="sm" className="px-4" onClick={handleAddAutomation}>
          Start building
        </Button>
      </header>

      {/* Body – full-height two-panel layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left panel – list container, capped width and scrollable */}
        <div className="flex min-w-0 flex-[1_1_0] max-w-[550px] flex-col overflow-y-auto border-r border-[rgba(0,0,0,0.08)] p-4 gap-1">
          {/* Date row, similar to OpenAI assistants list divider */}
          <div className="flex max-w-[1280px] items-center overflow-hidden px-3 py-3 text-[16px] leading-6">
            <span className="text-[12px] font-semibold leading-4 text-[rgb(175,175,175)]">
              Today,&nbsp;
              {new Date().toLocaleDateString("en-US", {
                day: "numeric",
                month: "short",
              })}
            </span>
          </div>

          {/* Automations list – structure closer to GPT (ul > li > button) */}
          <ul className="flex flex-col gap-1">
            {automations.map((auto) => (
              <li key={auto.id}>
                <button
                  type="button"
                  className="flex h-16 w-full max-w-[515px] cursor-pointer items-center overflow-hidden rounded-md border border-[rgba(0,0,0,0.08)] px-3 py-3 text-left text-[16px] leading-6 hover:bg-[rgba(0,0,0,0.02)]"
                  aria-label={`${auto.name} at ${formatTime(auto.createdAt)}`}
                >
                  <div className="flex h-10 w-full flex-1 items-start gap-3">
                    {/* Name + metadata column */}
                    <div className="flex min-w-0 flex-1 flex-col">
                      {/* Name row */}
                      <div className="flex min-w-0 items-center gap-3 text-[13px] font-semibold leading-6 text-[rgb(0,0,0)]">
                        <span className="truncate">{auto.name}</span>
                      </div>
                      {/* Metadata row (id or other info) */}
                      <div className="mt-0.5 flex min-w-0 flex-1 items-center gap-3 text-[11px] font-normal leading-4 text-[rgb(143,143,143)]">
                        <span className="truncate">{auto.id}</span>
                      </div>
                    </div>

                    {/* Time column */}
                    <div className="flex items-start">
                      <span className="text-[12px] leading-4 text-[rgb(205,205,205)]">
                        {formatTime(auto.createdAt)}
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Right panel – details/content area, fills remaining width */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto border border-dashed border-[rgba(0,0,0,0.2)]">
          {/* Outer debug border above matches overall scrollable area */}
          <div className="flex-1 border border-dashed border-[rgba(0,0,255,0.4)] px-16 pt-6 pb-0">
            {/* Inner content area – padding roughly matches OpenAI spacing */}
            {/* Intentionally empty for now – automation detail/editor will go here */}
          </div>
        </div>
      </div>
    </div>
  );
}

