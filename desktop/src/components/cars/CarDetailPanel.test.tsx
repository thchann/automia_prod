import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { forwardRef, useImperativeHandle } from "react";
import { CarDetailPanel } from "./CarDetailPanel";
import type { Car, Lead } from "@/types/leads";

vi.mock("@/i18n/LanguageProvider", () => ({
  useLanguage: () => ({
    tx: (en: string) => en,
    locale: "en-US",
  }),
}));

vi.mock("@/hooks/useLeadsLinkedToCar", () => ({
  useLeadsLinkedToCar: () => ({ data: undefined }),
}));

vi.mock("@/components/leads/LeadNotesEditor", () => ({
  LeadNotesEditor: forwardRef((_props, ref) => {
    useImperativeHandle(ref, () => ({
      flushPendingSave: async () => {},
    }));
    return <div data-testid="notes-editor" />;
  }),
}));

function makeCar(overrides: Partial<Car> = {}): Car {
  return {
    id: "car-1",
    user_id: "u1",
    brand: "Mercedes-Benz",
    model: "C43-AMG",
    year: 2017,
    mileage: 56000,
    price: 45000,
    desired_price: null,
    car_type: "sedan",
    listed_at: "2024-03-15T00:00:00Z",
    transmission: "automatic",
    color: "black",
    fuel: "gasoline",
    manufacture_year: 2017,
    vehicle_condition: "used",
    owner_type: "owned",
    status: "available",
    attachments: null,
    notes: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: null,
    ...overrides,
  };
}

function makeLead(id: string, carIds: string[]): Lead {
  return {
    id,
    user_id: "u1",
    platform_sender_id: "ps1",
    lead_type: "buyer",
    source: "manual",
    status_id: null,
    car_id: carIds[0] ?? null,
    car_ids: carIds,
    name: `Lead ${id}`,
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

describe("CarDetailPanel", () => {
  it("renders hero title, subtitle, and Detalles grid labels", () => {
    render(
      <CarDetailPanel
        car={makeCar()}
        leads={[]}
        onDismiss={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "MERCEDES-BENZ C43-AMG" })).toBeInTheDocument();
    expect(screen.getByText("2017 · 56,000 km")).toBeInTheDocument();
    expect(screen.getByText("Brand")).toBeInTheDocument();
    expect(screen.getByText("Model")).toBeInTheDocument();
    expect(screen.getByText("Mileage")).toBeInTheDocument();
    expect(screen.getByText("Manufacture year")).toBeInTheDocument();
    expect(screen.getByText("Mercedes-Benz")).toBeInTheDocument();
    expect(screen.getByText("C43-AMG")).toBeInTheDocument();
  });

  it("shows linked-lead count on the Conexiones tab", () => {
    const leads = [
      makeLead("lead-1", ["car-1"]),
      makeLead("lead-2", ["car-1"]),
      makeLead("lead-3", ["car-2"]),
    ];

    render(
      <CarDetailPanel
        car={makeCar()}
        leads={leads}
        onDismiss={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByRole("tab", { name: "Connections 2" })).toBeInTheDocument();
  });

  it("closes directly when nothing changed", () => {
    const onDismiss = vi.fn();
    render(
      <CarDetailPanel
        car={makeCar()}
        leads={[]}
        onDismiss={onDismiss}
        onSave={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("enables editing after clicking Edit", () => {
    render(
      <CarDetailPanel
        car={makeCar()}
        leads={[]}
        onDismiss={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByDisplayValue("Mercedes-Benz")).toBeInTheDocument();
    expect(screen.getByDisplayValue("C43-AMG")).toBeInTheDocument();
  });

  it("persists edits on Save changes", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onDismiss = vi.fn();
    render(
      <CarDetailPanel
        car={makeCar()}
        leads={[]}
        onDismiss={onDismiss}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByDisplayValue("Mercedes-Benz"), {
      target: { value: "BMW" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave.mock.calls[0][0].brand).toBe("BMW");
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  it("renders notes editor on the Notes tab", () => {
    render(
      <CarDetailPanel
        car={makeCar()}
        leads={[]}
        onDismiss={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Notes" }));
    expect(screen.getByTestId("notes-editor")).toBeInTheDocument();
    expect(screen.getByText("Private notes")).toBeInTheDocument();
  });

  it("shows linked lead from leads list when junction query is empty", () => {
    const leads = [makeLead("lead-1", ["car-1"])];

    render(
      <CarDetailPanel
        car={makeCar()}
        leads={leads}
        onDismiss={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Connections 1" }));
    expect(screen.getByText("Lead lead-1")).toBeInTheDocument();
  });

  it("renders connections section on the Connections tab", () => {
    const leads = [makeLead("lead-1", ["car-1"])];

    render(
      <CarDetailPanel
        car={makeCar()}
        leads={leads}
        onDismiss={vi.fn()}
        onSave={vi.fn()}
        onLinkLeadToCar={vi.fn()}
        onUnlinkLeadFromCar={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Connections 1" }));
    expect(screen.getByText("Link lead")).toBeInTheDocument();
    expect(screen.getByText("Lead lead-1")).toBeInTheDocument();
  });

  it("does not persist unlink until Save changes", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onUnlink = vi.fn().mockResolvedValue(undefined);
    const leads = [makeLead("lead-1", ["car-1"])];

    render(
      <CarDetailPanel
        car={makeCar()}
        leads={leads}
        onDismiss={vi.fn()}
        onSave={onSave}
        onLinkLeadToCar={vi.fn()}
        onUnlinkLeadFromCar={onUnlink}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Connections 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Unlink lead from car" }));
    expect(onUnlink).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onUnlink).toHaveBeenCalledWith("lead-1", "car-1");
    });
  });

  it("prompts to save or discard when cancelling with unsaved changes", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onDismiss = vi.fn();
    render(
      <CarDetailPanel
        car={makeCar()}
        leads={[]}
        onDismiss={onDismiss}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByDisplayValue("Mercedes-Benz"), {
      target: { value: "BMW" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByText("Save your changes before leaving?")).toBeInTheDocument();
    expect(onDismiss).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    await waitFor(() => expect(onDismiss).toHaveBeenCalledTimes(1));
    expect(onSave).not.toHaveBeenCalled();
  });
});
