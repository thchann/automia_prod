import { Key, DollarSign, Terminal, ExternalLink } from "lucide-react";

export function GetStartedBanner() {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Get started</h2>
        <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
          ✕ Dismiss
        </button>
      </div>
      <div className="flex">
        {/* Left actions */}
        <div className="flex-1 flex flex-col gap-1 p-4">
          {[
            { icon: Key, label: "Create API keys" },
            { icon: DollarSign, label: "Add credits" },
            { icon: Terminal, label: "Build your prompt" },
          ].map((item) => (
            <button
              key={item.label}
              className="flex items-center gap-3 px-3 py-3 rounded-md text-foreground hover:bg-surface-hover transition-colors text-sm"
            >
              <div className="h-9 w-9 rounded-full border border-border flex items-center justify-center">
                <item.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              {item.label}
            </button>
          ))}
        </div>

        {/* Right gradient banner */}
        <div className="w-[45%] relative overflow-hidden rounded-tr-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-muted/40 via-accent/30 to-primary/20" />
          <div className="absolute inset-0 flex items-center justify-center opacity-20 text-xs font-mono text-muted-foreground leading-relaxed p-6 overflow-hidden">
            <pre>{`  _list() dyn
e(x) return [d
s is None else s
ce_sum(ex, axis=axis`}</pre>
          </div>
          <div className="relative flex items-end justify-end gap-3 p-4 h-full">
            <a href="#" className="bg-surface/80 backdrop-blur border border-border rounded-lg px-4 py-3 hover:bg-surface transition-colors">
              <span className="text-sm font-medium text-foreground flex items-center gap-1">
                Developer quickstart <ExternalLink className="h-3 w-3" />
              </span>
              <span className="text-xs text-muted-foreground">Make your first API request in minutes</span>
            </a>
            <a href="#" className="bg-surface/80 backdrop-blur border border-border rounded-lg px-4 py-3 hover:bg-surface transition-colors">
              <span className="text-sm font-medium text-foreground flex items-center gap-1">
                Responses starter app <ExternalLink className="h-3 w-3" />
              </span>
              <span className="text-xs text-muted-foreground">Built on top of the Responses API</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
