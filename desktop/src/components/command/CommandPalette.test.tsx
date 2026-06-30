import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CommandPalette } from "./CommandPalette";

vi.mock("@/i18n/LanguageProvider", () => ({
  useLanguage: () => ({
    tx: (en: string) => en,
  }),
}));

vi.mock("@automia/api", () => ({
  ApiError: class ApiError extends Error {
    status = 500;
  },
  listLeads: vi.fn(async () => ({ leads: [] })),
  listLeadStatuses: vi.fn(async () => ({ statuses: [] })),
  listCars: vi.fn(async () => ({ cars: [] })),
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
  configurable: true,
  value: vi.fn(),
});

function renderPalette() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <CommandPalette
        open
        onOpenChange={() => {}}
        onNavigate={() => {}}
        onCreateLead={() => {}}
      />
    </QueryClientProvider>,
  );
}

describe("CommandPalette", () => {
  it("renders search input, action groups, and footer", () => {
    renderPalette();

    expect(
      screen.getByPlaceholderText(/Search leads, cars, actions/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
    expect(screen.getByText("Go to Home")).toBeInTheDocument();
    expect(screen.getByText("Go to Leads")).toBeInTheDocument();
    expect(screen.getByText("Create new lead")).toBeInTheDocument();
    expect(screen.getByText(/Automia · Command/i)).toBeInTheDocument();
  });
});
