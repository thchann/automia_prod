import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { forwardRef, useImperativeHandle } from "react";
import { LeadDetailPanel } from "./LeadDetailPanel";
import type { Car, Lead } from "@/types/leads";

vi.mock("@/i18n/LanguageProvider", () => ({
  useLanguage: () => ({
    tx: (en: string) => en,
    locale: "en-US",
  }),
}));

vi.mock("./LeadNotesEditor", () => ({
  LeadNotesEditor: forwardRef((_props, ref) => {
    useImperativeHandle(ref, () => ({
      flushPendingSave: async () => {},
    }));
    return <div data-testid="notes-editor" />;
  }),
}));

function makeLead(): Lead {
  return {
    id: "lead-1",
    user_id: "u1",
    platform_sender_id: "ps1",
    lead_type: "buyer",
    source: "manual",
    status_id: null,
    car_id: "car-1",
    car_ids: ["car-1"],
    name: "Test Lead",
    instagram_handle: null,
    phone: null,
    notes: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: null,
    desired_budget_min: null,
    desired_budget_max: null,
    desired_mileage_max: null,
    desired_year_min: null,
    desired_year_max: null,
    desired_make: null,
    desired_model: null,
    desired_car_type: null,
  };
}

function makeCars(): Car[] {
  return [
    {
      id: "car-1",
      user_id: "u1",
      brand: "Toyota",
      model: "Corolla",
      year: 2020,
      mileage: 12000,
      price: 15000,
      desired_price: null,
      car_type: "sedan",
      listed_at: null,
      transmission: null,
      color: null,
      fuel: null,
      manufacture_year: null,
      vehicle_condition: null,
      owner_type: "owned",
      status: "available",
      attachments: null,
      notes: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: null,
    },
    {
      id: "car-2",
      user_id: "u1",
      brand: "Honda",
      model: "Civic",
      year: 2021,
      mileage: 8000,
      price: 18000,
      desired_price: null,
      car_type: "sedan",
      listed_at: null,
      transmission: null,
      color: null,
      fuel: null,
      manufacture_year: null,
      vehicle_condition: null,
      owner_type: "owned",
      status: "available",
      attachments: null,
      notes: null,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: null,
    },
  ];
}

describe("LeadDetailPanel save-only staged connections", () => {
  it("ignores same-record prop refreshes when nothing was edited", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onDismiss = vi.fn();
    const lead = makeLead();
    const { rerender } = render(
      <LeadDetailPanel lead={lead} onDismiss={onDismiss} onSave={onSave} statuses={[]} cars={makeCars()} />,
    );

    rerender(
      <LeadDetailPanel
        lead={{ ...lead, updated_at: "2024-02-01T00:00:00Z" }}
        onDismiss={onDismiss}
        onSave={onSave}
        statuses={[]}
        cars={makeCars()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByText("Save your changes before leaving?")).not.toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalled();
  });

  it("closes directly when nothing changed", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onDismiss = vi.fn();
    render(
      <LeadDetailPanel lead={makeLead()} onDismiss={onDismiss} onSave={onSave} statuses={[]} cars={makeCars()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByText("Save your changes before leaving?")).not.toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalled();
  });

  it("applies link only through Save payload", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const lead = { ...makeLead(), car_id: null, car_ids: null };
    render(
      <LeadDetailPanel lead={lead} onDismiss={() => {}} onSave={onSave} statuses={[]} cars={makeCars()} />,
    );

    fireEvent.click(screen.getByRole("tab", { name: /Connections/ }));
    fireEvent.click(screen.getByText("Choose a car to link…"));
    fireEvent.click(screen.getByRole("option", { name: /2021 Honda Civic/ }));
    fireEvent.click(screen.getByRole("button", { name: "Link" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const payload = onSave.mock.calls[0][0] as Lead;
    expect(payload.car_ids).toEqual(["car-2"]);
    expect(payload.car_id).toBe("car-2");
  });

  it("applies unlink only through Save payload", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <LeadDetailPanel lead={makeLead()} onDismiss={() => {}} onSave={onSave} statuses={[]} cars={makeCars()} />,
    );

    fireEvent.click(screen.getByRole("tab", { name: /Connections/ }));
    fireEvent.click(screen.getByRole("button", { name: "Unlink car from lead" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const payload = onSave.mock.calls[0][0] as Lead;
    expect(payload.car_id).toBeNull();
    expect(payload.car_ids).toBeNull();
  });

  it("prompts to save or discard when cancelling with unsaved changes", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onDismiss = vi.fn();
    render(
      <LeadDetailPanel lead={makeLead()} onDismiss={onDismiss} onSave={onSave} statuses={[]} cars={makeCars()} />,
    );

    fireEvent.click(screen.getByRole("tab", { name: /Connections/ }));
    fireEvent.click(screen.getByRole("button", { name: "Unlink car from lead" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByText("Save your changes before leaving?")).toBeInTheDocument();
    expect(onDismiss).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Discard" }));

    expect(onSave).not.toHaveBeenCalled();
    await waitFor(() => expect(onDismiss).toHaveBeenCalled());
  });
});
