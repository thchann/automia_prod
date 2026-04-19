import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Trash2 } from "lucide-react";
import { getSettings, patchSettings } from "@automia/api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageProvider";
import { toast } from "@/components/ui/sonner";

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
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-none">
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
  const navigate = useNavigate();
  const { tx } = useLanguage();
  const { user, logout, refreshUser } = useAuth();
  const [name, setName] = useState("");
  const [clientDescription, setClientDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    void getSettings()
      .then((u) => {
        setName(u.name);
        setClientDescription(u.client_description ?? "");
        setWebsite(u.website ?? "");
      })
      .catch(() => {
        setName(user.name);
        setClientDescription(user.client_description ?? "");
        setWebsite(user.website ?? "");
      });
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/sign-in", { replace: true });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await patchSettings({
        name: name.trim(),
        client_description: clientDescription.trim() || null,
        website: website.trim() || null,
      });
      await refreshUser();
      toast.success(tx("Saved", "Guardado"));
    } catch {
      toast.error(tx("Could not save", "No se pudo guardar"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col">
      <SettingsSection
        title={tx("Profile", "Perfil")}
        description={tx("Set your account details", "Configura los datos de tu cuenta")}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="settings-name">{tx("Name", "Nombre")}</Label>
              <Input
                id="settings-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-email">{tx("Email", "Correo")}</Label>
              <Input
                id="settings-email"
                type="email"
                value={user?.email ?? ""}
                readOnly
                className="h-10 rounded-lg bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-bio">{tx("About", "Acerca de")}</Label>
              <Textarea
                id="settings-bio"
                value={clientDescription}
                onChange={(e) => setClientDescription(e.target.value)}
                rows={5}
                className="min-h-[120px] rounded-lg resize-y"
                placeholder={tx("Tell people about yourself or your business…", "Cuenta sobre ti o tu negocio…")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-website">{tx("Website", "Sitio web")}</Label>
              <Input
                id="settings-website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="h-10 rounded-lg"
              />
            </div>
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? tx("Saving…", "Guardando…") : tx("Save", "Guardar")}
            </Button>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-3 lg:items-end lg:pl-4">
            <Avatar className="h-24 w-24 border border-border">
              <AvatarImage src={user?.avatar_url ?? ""} alt="" />
              <AvatarFallback className="text-lg">
                {(user?.name || "?").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" className="rounded-full" disabled>
                {tx("Edit photo", "Editar foto")}
              </Button>
              <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-md" disabled>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title={tx("Session", "Sesion")}
        description={tx(
          "Sign out of Automia on this browser. You will need your access code to sign in again.",
          "Cierra sesion en este navegador. Necesitaras tu codigo de acceso para volver a entrar.",
        )}
        isLast
      >
        <Button
          type="button"
          variant="outline"
          className="w-fit rounded-lg border-destructive/40 text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {tx("Log out", "Cerrar sesion")}
        </Button>
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
          <div />
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

