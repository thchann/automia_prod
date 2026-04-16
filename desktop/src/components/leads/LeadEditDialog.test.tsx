import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { forwardRef, useImperativeHandle } from "react";
import { LeadEditDialog } from "./LeadEditDialog";
import type { Car, Lead } from "@/types/leads";

vi.mock("@/i18n/LanguageProvider", () => ({
  useLanguage: () => ({
    tx: (en: string) => en,
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
  ];
}

describe("LeadEditDialog save-only staged connections", () => {
  it("closes directly when nothing changed", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    render(
      <LeadEditDialog
        lead={makeLead()}
        open
        onOpenChange={onOpenChange}
        onSave={onSave}
        statuses={[]}
        cars={makeCars()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByText("Save your changes before leaving?")).not.toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("applies unlink only through Save payload", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <LeadEditDialog
        lead={makeLead()}
        open
        onOpenChange={() => {}}
        onSave={onSave}
        statuses={[]}
        cars={makeCars()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Connections" }));
    fireEvent.click(screen.getByRole("button", { name: "Unlink car from lead" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const payload = onSave.mock.calls[0][0] as Lead;
    expect(payload.car_id).toBeNull();
    expect(payload.car_ids).toBeNull();
  });

  it("prompts to save or discard when cancelling with unsaved changes", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    render(
      <LeadEditDialog
        lead={makeLead()}
        open
        onOpenChange={onOpenChange}
        onSave={onSave}
        statuses={[]}
        cars={makeCars()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Connections" }));
    fireEvent.click(screen.getByRole("button", { name: "Unlink car from lead" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByText("Save your changes before leaving?")).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    fireEvent.click(screen.getByRole("button", { name: "Discard" }));

    expect(onSave).not.toHaveBeenCalled();
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});

