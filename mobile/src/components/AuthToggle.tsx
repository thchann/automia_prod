import { cn } from "@/lib/utils";

interface AuthToggleProps {
  activeTab: "login" | "verification";
  onTabChange: (tab: "login" | "verification") => void;
}

export default function AuthToggle({ activeTab, onTabChange }: AuthToggleProps) {
  return (
    <div className="flex w-full rounded-full bg-secondary p-1">
      <button
        onClick={() => onTabChange("login")}
        className={cn(
          "flex-1 rounded-full py-3 text-sm font-semibold transition-all duration-300",
          activeTab === "login"
            ? "bg-muted-foreground/80 text-foreground shadow-md"
            : "text-muted-foreground hover:text-foreground/70",
        )}
      >
        Login
      </button>
      <button
        onClick={() => onTabChange("verification")}
        className={cn(
          "flex-1 rounded-full py-3 text-sm font-semibold transition-all duration-300",
          activeTab === "verification"
            ? "bg-muted-foreground/80 text-foreground shadow-md"
            : "text-muted-foreground hover:text-foreground/70",
        )}
      >
        Verification
      </button>
    </div>
  );
}

