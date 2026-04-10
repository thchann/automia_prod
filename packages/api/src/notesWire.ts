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
