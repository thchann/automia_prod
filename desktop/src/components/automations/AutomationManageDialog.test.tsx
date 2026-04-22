import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AutomationManageDialog } from "./AutomationManageDialog";
import type { AutomationItem, AutomationTypeItem } from "@automia/api";

vi.mock("@/i18n/LanguageProvider", () => ({
  useLanguage: () => ({
    tx: (en: string) => en,
  }),
}));

vi.mock("@automia/api", () => ({
  ApiError: class ApiError extends Error {
    status = 500;
  },
  getAutomation: vi.fn(async () => ({})),
  updateAutomation: vi.fn(async () => ({})),
  updateAutomationConfig: vi.fn(async () => ({})),
}));

function renderDialog(typeItem: AutomationTypeItem, automation: AutomationItem) {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <AutomationManageDialog
        open
        onOpenChange={() => {}}
        typeItem={typeItem}
        automation={automation}
        onRefreshInstagramAccess={() => {}}
      />
    </QueryClientProvider>,
  );
}

function makeAutomation(): AutomationItem {
  return {
    id: "a1",
    user_id: "u1",
    automation_type_id: "t1",
    platform_page_id: "p1",
    platform_username: "myuser",
    platform_display_name: "My Page",
    token_type: "Bearer",
    token_expires_at: null,
    status: "active",
    last_activity: null,
    last_error: null,
    config: {},
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
  };
}

describe("AutomationManageDialog", () => {
  it("renders comment bot settings for comments_bot automation type", () => {
    const typeItem = {
      id: "t-comments",
      platform: "instagram",
      code: "comments_bot",
      name: "Instagram Comments Bot",
      description: "Replies to comments",
      icon_url: null,
      required_scopes: null,
      is_active: true,
      display_order: 1,
    } satisfies AutomationTypeItem;
    const automation = {
      ...makeAutomation(),
      automation_type_id: "t-comments",
      config: { trigger: "PRICE", response: "Hello" },
    };
    renderDialog(typeItem, automation);

    expect(screen.getByText("Comment bot settings")).toBeInTheDocument();
    expect(screen.getByLabelText("Match in comment")).toHaveValue("PRICE");
    expect(screen.getByLabelText("Reply to send")).toHaveValue("Hello");
  });

  it("does not render the removed Messages activity section", () => {
    const typeItem = {
      id: "t1",
      platform: "instagram",
      code: "instagram_dm",
      name: "Instagram DM",
      description: "desc",
      created_at: "2024-01-01T00:00:00Z",
    } as AutomationTypeItem;
    renderDialog(typeItem, makeAutomation());

    expect(screen.queryByText("Messages")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Sent and received activity from this automation."),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Instagram DM settings")).toBeInTheDocument();
  });
});

