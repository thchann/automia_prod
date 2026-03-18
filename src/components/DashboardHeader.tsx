export function DashboardHeader() {
  return (
    <header className="h-[54px] flex items-center justify-between px-4 border-b border-border bg-background">
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold tracking-tight text-foreground">
          DevAPI <span className="font-normal text-muted-foreground">Platform</span>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          API Docs
        </button>
        <button className="text-sm font-medium border border-border rounded-full px-4 py-1.5 text-foreground hover:bg-surface-hover transition-colors">
          Start building
        </button>
        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
          T
        </div>
      </div>
    </header>
  );
}
