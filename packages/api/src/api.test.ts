import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "./index";

function makeJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function makeTextResponse(body: string, status = 200): Response {
  return new Response(body, { status });
}

function sampleLead() {
  return {
    id: "lead-1",
    user_id: "u1",
    platform_sender_id: "ps1",
    lead_type: "buyer",
    source: "manual",
    status_id: null,
    car_id: null,
    car_ids: null,
    name: "Lead One",
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

function sampleCar() {
  return {
    id: "car-1",
    user_id: "u1",
    brand: "Toyota",
    model: "Corolla",
    year: 2020,
    mileage: null,
    price: null,
    desired_price: null,
    car_type: null,
    listed_at: null,
    transmission: null,
    color: null,
    fuel: null,
    manufacture_year: null,
    vehicle_condition: null,
    owner_type: "owned",
    status: "available",
    attachments: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: null,
  };
}

describe("@automia/api exports", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("open", vi.fn());
  });

  it("has callable exports for env/tokens/client helpers", () => {
    const functionNames = [
      "getApiBaseUrl",
      "getExpectedRegistrationCode",
      "getHealthCheckPingUrl",
      "normalizeAccessCode",
      "normalizeApiOriginForBrowser",
      "clearAuthTokens",
      "getAccessToken",
      "getRefreshToken",
      "isAuthenticated",
      "setAccessToken",
      "setAuthTokens",
      "setRefreshToken",
      "apiRequest",
      "apiRequestBlob",
    ] as const;
    for (const key of functionNames) {
      expect(typeof api[key]).toBe("function");
    }
  });

  it("covers env + tokens helpers", () => {
    expect(api.normalizeAccessCode("ab-12 c")).toBe("ABC");
    expect(api.getApiBaseUrl()).toContain("railway.app");
    api.setAuthTokens("a", "r");
    expect(api.getAccessToken()).toBe("a");
    expect(api.getRefreshToken()).toBe("r");
    expect(api.isAuthenticated()).toBe(true);
    api.clearAuthTokens();
    expect(api.getAccessToken()).toBeNull();
  });

  it("covers apiRequest and apiRequestBlob", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(makeJsonResponse({ ok: true }));
    await expect(api.apiRequest<{ ok: boolean }>("/health", { skipAuth: true })).resolves.toEqual({ ok: true });

    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(new Response("nope", { status: 400 }));
    await expect(api.apiRequest("/health", { skipAuth: true })).rejects.toBeInstanceOf(api.ApiError);

    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(new Blob(["pdf"]), { status: 200 }),
    );
    const blob = await api.apiRequestBlob("/leads/a/notes/export?format=pdf", { skipAuth: true });
    expect(blob.size).toBeGreaterThan(0);
  });

  it("covers auth module", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(makeJsonResponse({ access_token: "aa", refresh_token: "rr" }))
      .mockResolvedValueOnce(makeJsonResponse({ valid: true }))
      .mockResolvedValueOnce(makeJsonResponse({ access_token: "bb", refresh_token: "ss" }))
      .mockResolvedValueOnce(makeJsonResponse({ message: "ok" }))
      .mockResolvedValueOnce(makeJsonResponse({ id: "u1", name: "N", email: "e", client_description: null, website: null, avatar_url: null, created_at: "2024-01-01" }))
      .mockResolvedValueOnce(makeJsonResponse({ id: "u1", name: "N", email: "e", client_description: null, website: null, avatar_url: null, created_at: "2024-01-01" }))
      .mockResolvedValueOnce(makeJsonResponse({ id: "u1", name: "N", email: "e", client_description: null, website: null, avatar_url: null, created_at: "2024-01-01" }));

    await api.login({ email: "a@b.com", password: "x" });
    await api.validateAccessCode({ access_code: "ABCDE" });
    await api.register({ name: "N", email: "a@b.com", password: "x", access_code: "ABCDE" });
    await api.logoutRemote();
    await api.fetchMe();
    await api.patchMe({ name: "Next" });
    await api.patchProfile({ name: "Next" });
  });

  it("covers settings + leads + lead statuses", async () => {
    const lead = sampleLead();
    (fetch as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(makeJsonResponse({ id: "u1", name: "N", email: "e", client_description: null, website: null, avatar_url: null, created_at: "2024-01-01" }))
      .mockResolvedValueOnce(makeJsonResponse({ id: "u1", name: "N", email: "e", client_description: null, website: null, avatar_url: null, created_at: "2024-01-01" }))
      .mockResolvedValueOnce(makeJsonResponse({ leads: [lead] }))
      .mockResolvedValueOnce(makeJsonResponse(lead))
      .mockResolvedValueOnce(makeJsonResponse(lead))
      .mockResolvedValueOnce(makeJsonResponse(lead))
      .mockResolvedValueOnce(makeJsonResponse({ message: "deleted" }))
      .mockResolvedValueOnce(new Response(new Blob(["pdf"]), { status: 200 }))
      .mockResolvedValueOnce(makeJsonResponse({ statuses: [{ id: "st-1", user_id: "u1", name: "New", color: "#111111", display_order: 0, created_at: "2024-01-01", updated_at: null }] }))
      .mockResolvedValueOnce(makeJsonResponse({ id: "st-1", user_id: "u1", name: "New", color: "#111111", display_order: 0, created_at: "2024-01-01", updated_at: null }))
      .mockResolvedValueOnce(makeJsonResponse({ id: "st-1", user_id: "u1", name: "Renamed", color: "#222222", display_order: 1, created_at: "2024-01-01", updated_at: null }))
      .mockResolvedValueOnce(makeJsonResponse({ message: "deleted" }));

    await api.getSettings();
    await api.patchSettings({ website: "https://x.com" });
    await api.listLeads();
    await api.getLead("lead-1");
    await api.createLead(lead);
    await api.updateLead("lead-1", { name: "Updated" });
    await api.deleteLead("lead-1");
    await api.exportLeadNotes("lead-1", "pdf");
    await api.listLeadStatuses();
    await api.createLeadStatus({ name: "New", display_order: 0, color: "#111111" });
    await api.updateLeadStatus("st-1", { name: "Renamed", color: "#222222" });
    await api.deleteLeadStatus("st-1");
  });

  it("covers cars + links", async () => {
    const car = sampleCar();
    const lead = sampleLead();
    (fetch as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(makeJsonResponse({ cars: [car] }))
      .mockResolvedValueOnce(makeJsonResponse(car))
      .mockResolvedValueOnce(makeJsonResponse(car))
      .mockResolvedValueOnce(makeJsonResponse(car))
      .mockResolvedValueOnce(makeJsonResponse({ message: "deleted" }))
      .mockResolvedValueOnce(makeJsonResponse({ message: "ok", car_preview: car }))
      .mockResolvedValueOnce(new Response(new Blob(["docx"]), { status: 200 }))
      .mockResolvedValueOnce(makeJsonResponse([lead]))
      .mockResolvedValueOnce(makeJsonResponse({ message: "linked" }))
      .mockResolvedValueOnce(makeJsonResponse({ message: "unlinked" }))
      .mockResolvedValueOnce(makeJsonResponse([car]))
      .mockResolvedValueOnce(makeJsonResponse({ message: "linked" }))
      .mockResolvedValueOnce(makeJsonResponse({ message: "unlinked" }));

    await api.listCars();
    await api.getCar("car-1");
    await api.createCar(car);
    await api.updateCar("car-1", { brand: "Toyota" });
    await api.deleteCar("car-1");
    await api.importCarFromNeoAuto({ url: "https://neoauto.com/x" });
    await api.exportCarNotes("car-1", "docx");
    await api.listLeadsForCar("car-1");
    await api.addCarLeadLink("car-1", { lead_id: "lead-1" });
    await api.removeCarLeadLink("car-1", "lead-1");
    await api.listCarsForLead("lead-1");
    await api.addLeadCarLink("lead-1", { car_id: "car-1" });
    await api.removeLeadCarLink("lead-1", "car-1");
  });

  it("covers attachments helpers", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(makeJsonResponse({ message: "ok", trashed_key: "k1" }))
      .mockResolvedValueOnce(makeJsonResponse({ message: "ok", trashed_key: "k2" }))
      .mockResolvedValueOnce(makeJsonResponse({ upload_url: "https://upload", storage_key: "s1", method: "PUT" }))
      .mockResolvedValueOnce(makeJsonResponse({ upload_url: "https://upload2", storage_key: "s2", method: "PUT" }))
      .mockResolvedValueOnce(makeJsonResponse({ download_url: "https://download1" }))
      .mockResolvedValueOnce(makeJsonResponse({ download_url: "https://download2" }))
      .mockResolvedValueOnce(new Response("", { status: 200 }))
      .mockResolvedValueOnce(new Response(new Blob(["x"]), { status: 200 }))
      .mockResolvedValueOnce(makeJsonResponse({ upload_url: "https://u3", storage_key: "s3", method: "PUT" }))
      .mockResolvedValueOnce(new Response("", { status: 200 }))
      .mockResolvedValueOnce(new Response(new Blob(["y"]), { status: 200 }))
      .mockResolvedValueOnce(makeJsonResponse({ upload_url: "https://u4", storage_key: "s4", method: "PUT" }))
      .mockResolvedValueOnce(new Response("", { status: 200 }));

    await api.deleteLeadAttachment("lead-1", { storage_key: "k1" });
    await api.deleteCarAttachment("car-1", { storage_key: "k2" });
    await api.presignLeadAttachmentUpload("lead-1", { filename: "a.png", content_type: "image/png", file_size: 1, type: "image" });
    await api.presignCarAttachmentUpload("car-1", { filename: "b.pdf", content_type: "application/pdf", file_size: 2, type: "document" });
    await api.presignLeadAttachmentDownload("lead-1", "k1");
    await api.presignCarAttachmentDownload("car-1", "k2");
    await api.putFileToPresignedUrl("https://upload", new Blob(["z"]), "text/plain");
    await api.uploadLeadAttachmentsToBucket("lead-1", [{ type: "image", url: "blob:abc", filename: "x.png" }]);
    await api.uploadCarAttachmentsToBucket("car-1", [{ type: "document", url: "blob:def", filename: "x.pdf" }]);
  });

  it("covers automations + oauth + health", async () => {
    api.setAccessToken("token");
    const openSpy = vi.spyOn(window, "open").mockReturnValue({ closed: true } as Window);

    (fetch as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(makeJsonResponse({ types: [] }))
      .mockResolvedValueOnce(makeJsonResponse({ automations: [] }))
      .mockResolvedValueOnce(makeJsonResponse({ id: "a1", user_id: "u1", automation_type_id: "t1", platform_page_id: "p1", platform_username: null, platform_display_name: null, token_type: "Bearer", token_expires_at: null, status: "active", last_activity: null, last_error: null, config: null, created_at: "2024-01-01", updated_at: null }))
      .mockResolvedValueOnce(makeJsonResponse({ id: "a1", user_id: "u1", automation_type_id: "t1", platform_page_id: "p1", platform_username: null, platform_display_name: null, token_type: "Bearer", token_expires_at: null, status: "active", last_activity: null, last_error: null, config: null, created_at: "2024-01-01", updated_at: null }))
      .mockResolvedValueOnce(makeJsonResponse({ messages: [] }))
      .mockResolvedValueOnce(makeJsonResponse({ id: "a1", user_id: "u1", automation_type_id: "t1", platform_page_id: "p1", platform_username: null, platform_display_name: null, token_type: "Bearer", token_expires_at: null, status: "paused", last_activity: null, last_error: null, config: null, created_at: "2024-01-01", updated_at: null }))
      .mockResolvedValueOnce(makeJsonResponse({ id: "a1", user_id: "u1", automation_type_id: "t1", platform_page_id: "p1", platform_username: null, platform_display_name: null, token_type: "Bearer", token_expires_at: null, status: "active", last_activity: null, last_error: null, config: { x: 1 }, created_at: "2024-01-01", updated_at: null }))
      .mockResolvedValueOnce(makeJsonResponse({ message: "deleted" }))
      .mockResolvedValueOnce(makeJsonResponse({ authorization_url: "https://auth" }))
      .mockResolvedValueOnce(makeJsonResponse({ status: "ok" }))
      .mockResolvedValueOnce(new Response("", { status: 200 }));

    await api.listAutomationTypes();
    await api.listAutomations();
    await api.createAutomation({ automation_type_id: "t1" });
    await api.getAutomation("a1");
    await api.listAutomationMessages("a1");
    await api.updateAutomation("a1", { status: "paused" });
    await api.updateAutomationConfig("a1", { config: { x: 1 } });
    await api.deleteAutomation("a1");
    await api.startInstagramOAuth();
    expect(openSpy).toHaveBeenCalled();
    await api.getHealth();
    await api.pingSiteHealth();
  });

  it("covers listAutomationMessages fallback for 404/501", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(makeTextResponse("missing", 404));
    await expect(api.listAutomationMessages("a1")).resolves.toEqual({ messages: [] });
  });
});

