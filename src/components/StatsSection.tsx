import { useState } from "react";
import { Key, ChevronRight } from "lucide-react";

const periods = ["24h", "7d", "30d", "90d"];

function StatCard({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 p-4 border-r border-border last:border-r-0">
      <span className="text-sm text-stat-label flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors">
        {label} <ChevronRight className="h-3 w-3" />
      </span>
      <span className="text-2xl font-semibold text-foreground">{value}</span>
      {children}
    </div>
  );
}

export function StatsSection() {
  const [activePeriod, setActivePeriod] = useState("24h");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Home</h2>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 border border-border rounded-full px-4 py-1.5 text-sm font-medium text-foreground hover:bg-surface-hover transition-colors">
            <Key className="h-4 w-4" />
            Create API keys
          </button>
          <div className="flex bg-surface rounded-full p-0.5">
            {periods.map((p) => (
              <button
                key={p}
                onClick={() => setActivePeriod(p)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  activePeriod === p
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="rounded-lg border border-border">
        <div className="grid grid-cols-4">
          <StatCard label="Total tokens" value="0">
            <div className="h-1 rounded-full bg-muted mt-4 relative">
              <div className="absolute left-0 top-0 h-full w-3/5 rounded-full bg-line-pink" />
              <div className="absolute right-[38%] top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border-2 border-line-pink bg-background" />
            </div>
          </StatCard>
          <StatCard label="Responses and Chat Completions" value="0">
            <div className="h-1 mt-4 flex gap-1">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="flex-1 h-0.5 rounded-full bg-muted-foreground/30" />
              ))}
            </div>
          </StatCard>
          <StatCard label="March budget" value="$0.00 / $0">
            <div className="space-y-2 mt-2">
              <div className="h-1.5 rounded-full bg-muted" />
              <span className="text-xs text-muted-foreground">Resets in 13 days. <span className="underline cursor-pointer">Edit budget</span></span>
            </div>
          </StatCard>
          {/* Credit remaining - highlighted card */}
          <div className="flex flex-col gap-1 p-4 bg-[hsl(48_96%_89%)] rounded-tr-lg">
            <span className="text-sm text-[hsl(40_30%_30%)]">Credit remaining</span>
            <span className="text-2xl font-semibold text-[hsl(40_30%_30%)] flex items-center gap-1">
              $0.00 <span className="text-yellow-600">⚠</span>
            </span>
            <button className="mt-2 self-start flex items-center gap-2 bg-[hsl(48_80%_45%)] hover:bg-[hsl(48_80%_40%)] text-[hsl(40_80%_10%)] font-medium text-sm rounded-md px-3 py-1.5 transition-colors">
              <span>➕</span> Add credits
            </button>
          </div>
        </div>
      </div>

      {/* Total requests */}
      <div className="rounded-lg border border-border p-4">
        <span className="text-sm text-stat-label flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors">
          Total requests <ChevronRight className="h-3 w-3" />
        </span>
        <span className="text-2xl font-semibold text-foreground mt-1 block">0</span>
        <div className="h-1 rounded-full bg-muted mt-6 relative">
          <div className="absolute left-0 top-0 h-full w-full rounded-full bg-line-teal" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border-2 border-line-teal bg-background" />
        </div>
      </div>
    </div>
  );
}
