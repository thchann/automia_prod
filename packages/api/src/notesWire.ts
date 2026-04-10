import { ApiError } from "./client";
import type {
  CarCreate,
  CarResponse,
  CarUpdate,
  LeadCreate,
  LeadNotesDocumentJson,
  LeadResponse,
  LeadUpdate,
  LeadsListResponse,
  NeoAutoCarPreviewWire,
  NeoAutoImportResponse,
  NeoAutoImportResponseRaw,
} from "./types";

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Backend OpenAPI uses `car` for the preview; older/alternate shapes use `car_preview` / `carPreview`. */
function extractCarPreviewWire(rec: Record<string, unknown>): unknown {
  if ("car_preview" in rec && rec.car_preview !== undefined) return rec.car_preview;
  if ("carPreview" in rec && rec.carPreview !== undefined) return rec.carPreview;
  if ("car" in rec && rec.car !== undefined) return rec.car;
  return undefined;
}

/** API wire field for Tiptap JSON (see message contract). App code uses `notes_document`. */
const WIRE_NOTES = "notes_json" as const;

export function leadResponseFromWire(raw: LeadResponse): LeadResponse {
  const out = { ...raw } as LeadResponse & { notes_json?: unknown };
  if (WIRE_NOTES in out) {
    out.notes_document = out.notes_json as LeadNotesDocumentJson | null;
    delete (out as unknown as Record<string, unknown>)[WIRE_NOTES];
  }
  return out;
}

export function carResponseFromWire(raw: CarResponse): CarResponse {
  const out = { ...raw } as CarResponse & { notes_json?: unknown };
  if (WIRE_NOTES in out) {
    out.notes_document = out.notes_json as LeadNotesDocumentJson | null;
    delete (out as unknown as Record<string, unknown>)[WIRE_NOTES];
  }
  return out;
}

export function leadsListFromWire(raw: LeadsListResponse): LeadsListResponse {
  return {
    leads: raw.leads.map((l) => leadResponseFromWire(l)),
  };
}

export function carsListFromWire(raw: { cars: CarResponse[] }): { cars: CarResponse[] } {
  return {
    cars: raw.cars.map((c) => carResponseFromWire(c)),
  };
}

export function leadCreateToWire(body: LeadCreate): Record<string, unknown> {
  const { notes_document, ...rest } = body;
  const out: Record<string, unknown> = { ...rest };
  if (notes_document !== undefined) {
    out[WIRE_NOTES] = notes_document;
  }
  return out;
}

export function leadUpdateToWire(body: LeadUpdate): Record<string, unknown> {
  const { notes_document, ...rest } = body;
  const out: Record<string, unknown> = { ...rest };
  if (notes_document !== undefined) {
    out[WIRE_NOTES] = notes_document;
  }
  return out;
}

export function carCreateToWire(body: CarCreate): Record<string, unknown> {
  const { notes_document, ...rest } = body;
  const out: Record<string, unknown> = { ...rest };
  if (notes_document !== undefined) {
    out[WIRE_NOTES] = notes_document;
  }
  return out;
}

export function carUpdateToWire(body: CarUpdate): Record<string, unknown> {
  const { notes_document, ...rest } = body;
  const out: Record<string, unknown> = { ...rest };
  if (notes_document !== undefined) {
    out[WIRE_NOTES] = notes_document;
  }
  return out;
}

/**
 * Normalizes `POST /cars/import/neoauto` bodies when `apiRequest` returns a string (non-JSON
 * Content-Type), or when the backend uses `car` (OpenAPI), `carPreview`, or wraps under `data`.
 */
export function parseNeoAutoImportResponseBody(raw: unknown): NeoAutoImportResponseRaw {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new ApiError(502, "Import response was not valid JSON");
    }
  }

  if (!isPlainRecord(parsed)) {
    throw new ApiError(502, "Import response missing car or car_preview");
  }

  let previewWire = extractCarPreviewWire(parsed);
  let message: string | undefined =
    typeof parsed.message === "string" ? parsed.message : undefined;

  if (previewWire === undefined && isPlainRecord(parsed.data)) {
    previewWire = extractCarPreviewWire(parsed.data);
    if (message === undefined && typeof parsed.data.message === "string") {
      message = parsed.data.message;
    }
  }

  if (!isPlainRecord(previewWire)) {
    throw new ApiError(502, "Import response missing car or car_preview");
  }

  const out: NeoAutoImportResponseRaw = {
    car_preview: previewWire as NeoAutoCarPreviewWire,
  };
  if (message !== undefined) {
    out.message = message;
  }
  return out;
}

/** NeoAuto `car_preview` wire → `CarCreate` (maps `notes_json` → `notes_document`). */
export function neoAutoCarPreviewFromWire(raw: NeoAutoCarPreviewWire): CarCreate {
  const { notes_json, notes_document, ...rest } = raw;
  const out = { ...rest } as CarCreate;
  if (notes_document !== undefined) {
    out.notes_document = notes_document;
  } else if (notes_json !== undefined) {
    out.notes_document = notes_json as LeadNotesDocumentJson | null;
  }
  return out;
}

export function neoAutoImportResponseFromWire(raw: NeoAutoImportResponseRaw): NeoAutoImportResponse {
  return {
    ...(raw.message !== undefined ? { message: raw.message } : {}),
    car_preview: neoAutoCarPreviewFromWire(raw.car_preview),
  };
}
