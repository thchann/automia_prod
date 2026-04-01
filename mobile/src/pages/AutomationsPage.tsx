import { ExternalLink, Instagram, Mail, MessageCircle } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageProvider";

type Channel = "instagram" | "whatsapp" | "email";

interface AutomationCard {
  id: string;
  channel: Channel;
  provider: string;
  description: string;
}

const CARDS: AutomationCard[] = [
  { id: "ig-1", channel: "instagram", provider: "Instagram", description: "DM automation and lead capture" },
  { id: "wa-1", channel: "whatsapp", provider: "WhatsApp", description: "WhatsApp messaging workflows" },
  { id: "em-1", channel: "email", provider: "Email", description: "Inbox and campaign automations" },
];

const channelIcon = (channel: Channel) => {
  switch (channel) {
    case "instagram":
      return <Instagram className="h-4 w-4 text-[#E1306C]" />;
    case "whatsapp":
      return <MessageCircle className="h-4 w-4 text-[#25D366]" />;
    case "email":
      return <Mail className="h-4 w-4 text-[#EA4335]" />;
  }
};

const AutomationsPage = () => {
  const { tx } = useLanguage();
  const layers = useMemo(() => CARDS.map((card) => [card]), []);

  return (
    <div className="px-5 pt-8 pb-24 max-w-[430px] mx-auto animate-fade-in">
      <h1 className="text-3xl font-extrabold tracking-tight mb-1">{tx("Automations", "Automatizaciones")}</h1>
      <p className="text-sm text-muted-foreground mb-4">{tx("Connect bots and workflows", "Conecta bots y flujos de trabajo")}</p>

      <div className="space-y-4 pt-2 pr-1">
        {layers.map((layer, idx) => (
          <div key={`layer-${idx}`} className="space-y-4">
            {layer.map((card) => {
              const isConnected = false;
              return (
                <div key={card.id} className="h-[186px] rounded-xl border border-border bg-card p-4">
                  <div className="flex h-full flex-col">
                    <div className="mb-3 flex items-center justify-between pr-1">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background">
                        {channelIcon(card.channel)}
                      </div>
                      <div className="flex h-6 w-10 items-center justify-center">
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold">{card.provider}</div>
                      <p className="text-sm text-muted-foreground">{card.description}</p>
                    </div>
                    <div className="mt-auto flex h-8 items-center justify-between pr-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-full px-4"
                        disabled
                      >
                        {tx("Connect", "Conectar")}
                      </Button>
                      <button
                        type="button"
                        aria-label={isConnected ? "Connected" : "Disconnected"}
                        disabled
                        className={`relative h-6 w-10 overflow-hidden rounded-full transition-colors ${
                          isConnected ? "bg-primary" : "bg-muted"
                        }`}
                      >
                        <span
                          className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                            isConnected ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AutomationsPage;
