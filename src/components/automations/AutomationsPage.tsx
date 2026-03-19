import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
        <span className="text-black">Automations</span>

        <Button
          size="sm"
          className="px-4 border border-[rgba(0,0,0,0.12)] bg-white text-black hover:bg-[#ff8a3c] hover:text-white focus-visible:bg-[#ff8a3c] focus-visible:text-white"
          onClick={handleAddAutomation}
        >
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
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto px-16 pt-6 pb-0">
          {/* Section title (\"ASSISTANT\") */}
          <div className="mb-2 text-[12px] font-semibold leading-7 tracking-[0.05em] text-[rgb(175,175,175)] uppercase">
            Assistant
          </div>

          {/* Header row: Name + Edit button */}
          <div className="flex w-full items-center justify-between text-[20px] font-bold leading-6 text-black">
            <span>Name</span>
            <Button
              size="sm"
              variant="outline"
              className="border border-[rgba(0,0,0,0.12)] bg-white text-black hover:bg-[#ff8a3c] hover:text-white focus-visible:bg-[#ff8a3c] focus-visible:text-white"
            >
              Edit
            </Button>
          </div>

          {/* Name field group */}
          <div className="mt-5 w-full">
            <div className="mb-2 text-[14px] font-semibold leading-5 text-black">
              Name
            </div>
            <Input
              placeholder="Enter a user friendly name"
              className="h-8 w-full rounded-lg border border-[rgba(0,0,0,0.25)] bg-transparent px-3 py-1 text-[14px] leading-[18px] text-[rgb(220,220,220)] hover:border-[rgba(0,0,0,0.35)] focus-visible:border-[rgba(0,0,0,0.4)]"
            />
          </div>

          {/* System instructions label row */}
          <div className="mt-6 flex w-full items-center justify-between text-[14px] leading-5 text-black">
            <span>System instructions</span>
            <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full border border-white/10">
              ?
            </Button>
          </div>

          {/* System instructions textarea */}
          <div className="mt-2 w-full">
            <Textarea
              placeholder="You are a helpful assistant..."
              className="min-h-[112px] w-full rounded-lg border border-[rgba(0,0,0,0.25)] bg-transparent px-3 py-2 text-[14px] leading-[18px] text-[rgb(220,220,220)] hover:border-[rgba(0,0,0,0.35)] focus-visible:border-[rgba(0,0,0,0.4)]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

