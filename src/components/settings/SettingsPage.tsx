import type { ReactNode } from "react";

/**
 * Settings — layout skeleton (phase 1).
 * Dashed borders visualize div boundaries; replace/remove when styling for production.
 */

const debugBorder = "border border-dashed border-muted-foreground/40";
const debugBorderStrong = "border-2 border-dashed border-primary/35";

export function SettingsPage() {
  return (
    <div className={`flex min-h-0 flex-1 flex-col overflow-y-auto ${debugBorderStrong} p-1`}>
      {/* Root scroll column */}
      <div className={`flex min-h-0 flex-1 flex-col gap-6 ${debugBorder} p-4`}>
        {/* Header block: title + subtitle */}
        <div className={`${debugBorder} space-y-2 p-4`}>
          <div className={`h-8 max-w-md ${debugBorder} rounded-md`} title="Title: Settings" />
          <div className={`h-4 max-w-lg ${debugBorder} rounded-md`} title="Subtitle" />
        </div>

        {/* Tab row */}
        <div className={`${debugBorder} p-3`}>
          <div className="flex flex-wrap gap-2">
            {["Account", "Notifications", "Sharing", "Update schedule", "Billing", "Questions"].map(
              (label, i) => (
                <div
                  key={label}
                  className={`rounded-full px-4 py-2 text-sm ${debugBorder} ${i === 0 ? "min-w-[88px]" : ""}`}
                  title={`Tab: ${label}`}
                >
                  <span className="sr-only">{label}</span>
                </div>
              ),
            )}
          </div>
        </div>

        {/* Sections stack */}
        <div className={`flex flex-col ${debugBorder} p-2`}>
          {/* Section: Profile */}
          <SettingsSectionShell
            label="Profile"
            descriptionPlaceholder="Set your account details"
          >
            <div className={`grid gap-4 ${debugBorder} p-3 md:grid-cols-2`}>
              <div className={`h-10 ${debugBorder} rounded-md`} title="Name field" />
              <div className={`h-10 ${debugBorder} rounded-md`} title="Surname field" />
            </div>
            <div className={`h-10 ${debugBorder} rounded-md`} title="Email field" />
            <div className={`flex justify-end ${debugBorder} p-2`}>
              <div className={`h-20 w-20 shrink-0 ${debugBorder} rounded-full`} title="Avatar" />
            </div>
          </SettingsSectionShell>

          {/* Section: Timezone & preferences */}
          <SettingsSectionShell
            label="Timezone & preferences"
            descriptionPlaceholder="Let us know the time zone and format"
          >
            <div className={`grid gap-4 ${debugBorder} p-3 md:grid-cols-3`}>
              <div className={`h-10 ${debugBorder} rounded-md`} title="City" />
              <div className={`h-10 ${debugBorder} rounded-md`} title="Timezone" />
              <div className={`h-10 ${debugBorder} rounded-md`} title="Date & Time format" />
            </div>
          </SettingsSectionShell>

          {/* Section: Motivation & Performance */}
          <SettingsSectionShell
            label="Motivation & Performance setup"
            descriptionPlaceholder="Calibrate your desired activity levels"
            extraLeft={<div className={`mt-2 h-4 w-32 ${debugBorder} rounded`} title="Learn more link" />}
          >
            <div className={`grid gap-6 ${debugBorder} p-3 md:grid-cols-2`}>
              <div className={`space-y-2 ${debugBorder} p-3`}>
                <div className={`h-4 ${debugBorder} rounded`} title="Slider label" />
                <div className={`h-8 ${debugBorder} rounded-md`} title="Single slider" />
              </div>
              <div className={`space-y-2 ${debugBorder} p-3`}>
                <div className={`h-4 ${debugBorder} rounded`} title="Range slider label" />
                <div className={`h-8 ${debugBorder} rounded-md`} title="Range slider" />
              </div>
            </div>
          </SettingsSectionShell>

          {/* Section: Your work */}
          <SettingsSectionShell label="Your work" descriptionPlaceholder="Add info about your position">
            <div className={`grid gap-4 ${debugBorder} p-3 md:grid-cols-2`}>
              <div className={`h-10 ${debugBorder} rounded-md`} title="Function" />
              <div className={`h-10 ${debugBorder} rounded-md`} title="Job Title" />
            </div>
            <div className={`mt-4 ${debugBorder} p-3`}>
              <div className={`mb-2 h-3 w-40 ${debugBorder} rounded`} title="Responsibilities label" />
              <div className={`min-h-[80px] ${debugBorder} rounded-md`} title="Responsibilities field" />
            </div>
          </SettingsSectionShell>
        </div>
      </div>
    </div>
  );
}

function SettingsSectionShell({
  label,
  descriptionPlaceholder,
  extraLeft,
  isLast,
  children,
}: {
  label: string;
  descriptionPlaceholder: string;
  extraLeft?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className={`grid gap-6 border-b border-dashed border-muted-foreground/30 py-10 last:border-b-0 lg:grid-cols-[minmax(200px,280px)_1fr] lg:gap-10 ${debugBorder} p-3`}
    >
      {/* Left column: title + description */}
      <div className={`${debugBorder} space-y-2 p-2`}>
        <div className={`h-6 ${debugBorder} rounded`} title={label} />
        <div className={`h-4 max-w-[220px] ${debugBorder} rounded`} title={descriptionPlaceholder} />
        {extraLeft}
      </div>

      {/* Right column: form blocks */}
      <div className={`flex min-w-0 flex-col gap-4 ${debugBorder} p-3`}>{children}</div>
    </section>
  );
}
