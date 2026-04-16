import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { LeadsFunnel } from "./LeadsFunnel";
import type { LeadStatus } from "@/types/leads";

vi.mock("@/i18n/LanguageProvider", () => ({
  useLanguage: () => ({
    tx: (en: string) => en,
  }),
}));

vi.mock("@automia/api", () => ({
  getLead: vi.fn(),
}));

vi.mock("./LeadEditDialog", () => ({
  LeadEditDialog: () => null,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onClick,
    className,
  }: {
    children: ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button type="button" className={className} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  AlertDialogAction: ({
    children,
    onClick,
    className,
  }: {
    children: ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button type="button" className={className} onClick={onClick}>
      {children}
    </button>
  ),
}));

function makeStatus(id: string, name: string, color: string | null): LeadStatus {
  return {
    id,
    name,
    color,
    display_order: 0,
    is_default: false,
    created_at: "2024-01-01T00:00:00Z",
  };
}

describe("LeadsFunnel status actions", () => {
  it("deletes status through menu + confirmation", async () => {
    const onUpdateStatuses = vi.fn();
    const statuses = [makeStatus("st-1", "New", "#6B7280"), makeStatus("st-2", "Qualified", "#22c55e")];

    render(
      <LeadsFunnel
        leads={[]}
        statuses={statuses}
        cars={[]}
        onUpdateLead={() => {}}
        onUpdateStatuses={onUpdateStatuses}
      />,
    );

    fireEvent.pointerDown(screen.getAllByRole("button", { name: "Status actions" })[0]);
    fireEvent.click((await screen.findAllByRole("button", { name: "Delete" }))[0]);
    const dialogTitle = await screen.findByText("Delete status?");
    const dialogRoot = dialogTitle.parentElement?.parentElement?.parentElement;
    if (!dialogRoot) throw new Error("Delete confirmation root not found");
    fireEvent.click(within(dialogRoot).getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(onUpdateStatuses).toHaveBeenCalledTimes(1);
    });
    const next = onUpdateStatuses.mock.calls[0][0] as LeadStatus[];
    expect(next.map((s) => s.id)).toEqual(["st-2"]);
  });

  it("saves edited status color with name", async () => {
    const onUpdateStatuses = vi.fn();
    const statuses = [makeStatus("st-1", "New", "#6B7280")];

    render(
      <LeadsFunnel
        leads={[]}
        statuses={statuses}
        cars={[]}
        onUpdateLead={() => {}}
        onUpdateStatuses={onUpdateStatuses}
      />,
    );

    fireEvent.pointerDown(screen.getAllByRole("button", { name: "Status actions" })[0]);
    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));

    const colorInput = screen.getByLabelText("Status color") as HTMLInputElement;
    fireEvent.change(colorInput, { target: { value: "#ff0000" } });
    const nameInput = screen.getByDisplayValue("New");
    fireEvent.change(nameInput, { target: { value: "New Name" } });
    fireEvent.blur(nameInput);

    await waitFor(() => {
      expect(onUpdateStatuses).toHaveBeenCalledTimes(1);
    });
    const next = onUpdateStatuses.mock.calls[0][0] as LeadStatus[];
    expect(next[0].name).toBe("New Name");
    expect(next[0].color).toBe("#ff0000");
  });
});

