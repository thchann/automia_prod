import { Cpu, Zap, Volume2, Image } from "lucide-react";

const models = [
  {
    icon: Cpu,
    name: "GPT-5.4",
    description: "Our most capable frontier model yet",
  },
  {
    icon: Zap,
    name: "GPT-5.4-mini",
    description: "Faster, cost-efficient version of GPT-5.4",
  },
  {
    icon: Volume2,
    name: "Audio",
    description: "Speech-to-text or text-to-speech",
  },
  {
    icon: Image,
    name: "Image",
    description: "Create or edit images",
  },
];

export function RecommendedModels() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground">Recommended models</h2>
      <div className="grid grid-cols-4 gap-4">
        {models.map((model) => (
          <button
            key={model.name}
            className="flex flex-col items-start gap-4 p-5 rounded-lg border border-border hover:bg-surface-hover transition-colors text-left"
          >
            <div className="h-10 w-10 rounded-lg bg-surface flex items-center justify-center">
              <model.icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">{model.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{model.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
