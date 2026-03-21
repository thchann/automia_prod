import { useState, type ReactNode } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { Info, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
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

const SETTINGS_TABS = [
  "Account",
  "Notifications",
  "Sharing",
  "Update schedule",
  "Billing",
  "Questions",
] as const;

const tabTriggerClass =
  "rounded-full bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/80 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
  "data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:hover:bg-foreground";

export function SettingsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl flex-1 px-0 pb-12 pt-20">
        <header className="space-y-1 pb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </header>

        <Tabs defaultValue="account" className="w-full">
          <TabsList className="mb-8 flex h-auto w-full flex-wrap gap-2 rounded-none bg-transparent p-0">
            {SETTINGS_TABS.map((name) => (
              <TabsTrigger
                key={name}
                value={name.toLowerCase().replace(/\s+/g, "-")}
                className={tabTriggerClass}
              >
                {name}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="account" className="mt-0 outline-none">
            <AccountSettingsForm />
          </TabsContent>

          {SETTINGS_TABS.slice(1).map((name) => (
            <TabsContent
              key={name}
              value={name.toLowerCase().replace(/\s+/g, "-")}
              className="mt-0 rounded-lg border border-dashed border-border bg-muted/20 p-12 text-center text-sm text-muted-foreground outline-none"
            >
              {name} — coming soon
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}

function AccountSettingsForm() {
  const [firstName, setFirstName] = useState("Bartosz");
  const [surname, setSurname] = useState("Mcdaniel");
  const [email, setEmail] = useState("bartmcdaniel@niceguys.com");
  const [city, setCity] = useState("New York");
  const [timezone, setTimezone] = useState("utc-4");
  const [dateFormat, setDateFormat] = useState("ddmm");
  const [dailyUtil, setDailyUtil] = useState([7]);
  const [coreRange, setCoreRange] = useState([3, 6]);
  const [functionTitle, setFunctionTitle] = useState("Design");
  const [jobTitle, setJobTitle] = useState("Team Lead designer");
  const [responsibilities, setResponsibilities] = useState("");

  return (
    <div className="flex flex-col">
      <SettingsSection
        title="Profile"
        description="Set your account details"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="settings-first-name">Name</Label>
                <Input
                  id="settings-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-10 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-surname">Surname</Label>
                <Input
                  id="settings-surname"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  className="h-10 rounded-lg"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-email">Email</Label>
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
              <AvatarFallback className="text-lg">BM</AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" className="rounded-full">
                Edit photo
              </Button>
              <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-md">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Timezone & preferences"
        description="Let us know the time zone and format"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-1">
            <Label htmlFor="settings-city">City</Label>
            <Input
              id="settings-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-10 rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="h-10 rounded-lg">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="utc-4">UTC/GMT -4 hours</SelectItem>
                <SelectItem value="utc-5">UTC/GMT -5 hours</SelectItem>
                <SelectItem value="utc+0">UTC/GMT +0 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date &amp; Time format</Label>
            <Select value={dateFormat} onValueChange={setDateFormat}>
              <SelectTrigger className="h-10 rounded-lg">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ddmm">dd/mm/yyyy 00:00</SelectItem>
                <SelectItem value="mmdd">mm/dd/yyyy 00:00</SelectItem>
                <SelectItem value="iso">yyyy-mm-dd 00:00</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Motivation & Performance setup"
        description="Calibrate your desired activity levels"
        leftExtra={
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <Info className="h-4 w-4 shrink-0" />
            Learn more about work time classification
          </button>
        }
      >
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm text-foreground">
              Desired daily time utilization:{" "}
              <span className="font-semibold">{dailyUtil[0]} hrs</span>
            </p>
            <Slider
              value={dailyUtil}
              onValueChange={setDailyUtil}
              min={0}
              max={12}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Total time you plan to spend on focused work each day.
            </p>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-foreground">
              Desired daily core work range:{" "}
              <span className="font-semibold">
                {coreRange[0]}-{coreRange[1]} hrs
              </span>
            </p>
            <RangeSlider
              value={coreRange}
              onValueChange={(v) => setCoreRange(v as [number, number])}
              min={0}
              max={12}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              The span of hours reserved for deep, uninterrupted work.
            </p>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Your work"
        description="Add info about your position"
        isLast
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="settings-function">Function</Label>
              <Input
                id="settings-function"
                value={functionTitle}
                onChange={(e) => setFunctionTitle(e.target.value)}
                className="h-10 rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-job-title">Job Title</Label>
              <Input
                id="settings-job-title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="h-10 rounded-lg"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-responsibilities">Responsibilities</Label>
            <Textarea
              id="settings-responsibilities"
              value={responsibilities}
              onChange={(e) => setResponsibilities(e.target.value)}
              placeholder="Describe your key responsibilities…"
              className="min-h-[120px] resize-y rounded-lg text-sm"
            />
          </div>
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

const thumbClass =
  "block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

function RangeSlider({
  value,
  onValueChange,
  min,
  max,
  step,
}: {
  value: number[];
  onValueChange: (v: number[]) => void;
  min: number;
  max: number;
  step: number;
}) {
  return (
    <SliderPrimitive.Root
      className="relative flex w-full touch-none select-none items-center"
      value={value}
      onValueChange={onValueChange}
      min={min}
      max={max}
      step={step}
      minStepsBetweenSteps={1}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className={thumbClass} />
      <SliderPrimitive.Thumb className={thumbClass} />
    </SliderPrimitive.Root>
  );
}
