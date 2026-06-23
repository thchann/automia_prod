import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CarConnectionsSection } from "./CarConnectionsSection";
import type { Lead } from "@/types/leads";

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
    name: "Jane Buyer",
    instagram_handle: "jane",
    phone: "+1 555",
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

describe("CarConnectionsSection", () => {
  const tx = (en: string) => en;

  it("renders linked leads and available link picker", () => {
    const linked = [makeLead("lead-1", ["car-1"])];
    const available = [makeLead("lead-2", [])];

    render(
      <CarConnectionsSection
        tx={tx}
        linkedLeads={linked}
        leadsAvailableToLink={available}
        onLinkLead={vi.fn()}
        onUnlinkLead={vi.fn()}
      />,
    );

    expect(screen.getByText("Jane Buyer")).toBeInTheDocument();
    expect(screen.getByText("Linked leads")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Link" })).toBeInTheDocument();
  });

  it("stages unlink via callback", () => {
    const onUnlinkLead = vi.fn();
    render(
      <CarConnectionsSection
        tx={tx}
        linkedLeads={[makeLead("lead-1", ["car-1"])]}
        leadsAvailableToLink={[]}
        onLinkLead={vi.fn()}
        onUnlinkLead={onUnlinkLead}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Unlink lead from car" }));
    expect(onUnlinkLead).toHaveBeenCalledWith("lead-1");
  });
});
