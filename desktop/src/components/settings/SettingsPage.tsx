import { useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageProvider";

const SETTINGS_TABS = [
  { key: "account", i18nKey: "settings.tab.account", fallback: "Account" },
  { key: "languages", i18nKey: "settings.tab.languages", fallback: "Languages" },
] as const;

const tabTriggerClass =
  "rounded-full bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/80 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
  "data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:hover:bg-foreground";

export function SettingsPage() {
  const { t, tx } = useLanguage();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl flex-1 px-0 pb-12 pt-20">
        <header className="space-y-1 pb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {tx("Settings", "Configuracion")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {tx(
              "Manage your account settings and preferences",
              "Administra la configuracion y preferencias de tu cuenta",
            )}
          </p>
        </header>

        <Tabs defaultValue="account" className="w-full">
          <TabsList className="mb-8 flex h-auto w-full flex-wrap gap-2 rounded-none bg-transparent p-0">
            {SETTINGS_TABS.map((tab) => (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                className={tabTriggerClass}
              >
                {t(tab.i18nKey, tab.fallback)}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="account" className="mt-0 outline-none">
            <AccountSettingsForm />
          </TabsContent>

          <TabsContent value="languages" className="mt-0 outline-none">
            <LanguageSettingsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function AccountSettingsForm() {
  const { tx } = useLanguage();
  const [firstName, setFirstName] = useState("Theodore");
  const [surname, setSurname] = useState("Chan");
  const [email, setEmail] = useState("tchan@trinity.edu");

  return (
    <div className="flex flex-col">
      <SettingsSection
        title={tx("Profile", "Perfil")}
        description={tx("Set your account details", "Configura los datos de tu cuenta")}
        isLast
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="settings-first-name">{tx("Name", "Nombre")}</Label>
                <Input
                  id="settings-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-10 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-surname">{tx("Surname", "Apellido")}</Label>
                <Input
                  id="settings-surname"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  className="h-10 rounded-lg"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-email">{tx("Email", "Correo")}</Label>
              <Input
                id="settings-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 rounded-lg"
              />
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-3 lg:items-end lg:pl-4">
            <Avatar className="h-24 w-24 border border-border">
              <AvatarImage src="" alt="" />
              <AvatarFallback className="text-lg">TC</AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" className="rounded-full">
                {tx("Edit photo", "Editar foto")}
              </Button>
              <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-md">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}

function LanguageSettingsPanel() {
  const { language, setLanguage, tx } = useLanguage();

  return (
    <div className="flex flex-col">
      <SettingsSection
        title={tx("Languages", "Idiomas")}
        description={tx(
          "Select your preferred app language",
          "Selecciona tu idioma preferido de la aplicacion",
        )}
        isLast
      >
        <div className="grid gap-4 md:grid-cols-[minmax(180px,220px)_1fr]">
          <div className="space-y-1">
            <Label>{tx("Language", "Idioma")}</Label>
            <p className="text-xs text-muted-foreground">
              {tx("Apply to all desktop pages", "Aplicar en todas las paginas de desktop")}
            </p>
          </div>
          <Select value={language} onValueChange={(value) => setLanguage(value as "en" | "es")}>
            <SelectTrigger className="h-10 rounded-lg">
              <SelectValue placeholder={tx("Select language", "Selecciona idioma")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">{tx("English", "Ingles")}</SelectItem>
              <SelectItem value="es">{tx("Spanish", "Espanol")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SettingsSection>
    </div>
  );
}

function SettingsSection({
  title,
  description,
  leftExtra,
  isLast,
  children,
}: {
  title: string;
  description: string;
  leftExtra?: ReactNode;
  isLast?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "grid gap-8 border-b border-border py-10 lg:grid-cols-[minmax(180px,260px)_1fr] lg:gap-12 xl:grid-cols-[minmax(200px,280px)_1fr]",
        isLast && "border-b-0 pb-0",
      )}
    >
      <div className="space-y-2 lg:pt-0.5">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        {leftExtra}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

