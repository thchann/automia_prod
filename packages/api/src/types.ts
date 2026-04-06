/** JSONB attachments on cars. */
export type CarAttachmentsJson = unknown;

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type?: string;
}

/** JSON body for POST /auth/register — matches FastAPI `RegisterRequest`. */
export interface RegisterRequestBody {
  name: string;
  email: string;
  password: string;
  access_code: string;
}

export interface AccessCodeValidateResponse {
  valid: boolean;
}

export interface UserMeResponse {
  id: string;
  name: string;
  email: string;
  client_description: string | null;
  website: string | null;
  avatar_url: string | null;
  created_at: string;
}

/**
 * PATCH `/settings` and PATCH `/auth/profile` — matches FastAPI `ProfileUpdateRequest`
 * (`app/schemas/auth.py`) and fields handled by `apply_user_profile_updates`
 * (`app/services/user_profile.py`): `name`, `client_description`, `website`, `avatar_url`.
 */
export interface ProfileUpdateRequest {
  name?: string | null;
  client_description?: string | null;
  website?: string | null;
  avatar_url?: string | null;
}

/** @deprecated Prefer `ProfileUpdateRequest` — same shape. */
export type UserProfilePatch = ProfileUpdateRequest;

/**
 * Tiptap editor document (`JSONContent` shape).
 *
 * Backend: persist on the lead as JSON/JSONB (`notes_document`), include in list/detail responses,
 * and accept optional `notes_document` on lead create/update. PDF/DOCX export contract: `exportLeadNotes` in leads.ts.
 */
export type LeadNotesDocumentJson = Record<string, unknown>;

export interface LeadResponse {
  id: string;
  user_id: string;
  platform_sender_id: string;
  lead_type: string;
  source: string;
  status_id: string | null;
  car_id: string | null;
  name: string | null;
  instagram_handle: string | null;
  phone: string | null;
  notes: string | null;
  /** Rich notes (Tiptap); optional until backend ships the column. */
  notes_document?: LeadNotesDocumentJson | null;
  created_at: string;
  updated_at: string | null;
  desired_budget_min: number | string | null;
  desired_budget_max: number | string | null;
  desired_mileage_max: number | null;
  desired_year_min: number | null;
  desired_year_max: number | null;
  desired_make: string | null;
  desired_model: string | null;
  desired_car_type: string | null;
  attachments?: CarAttachmentsJson | null;
}

export interface LeadsListResponse {
  leads: LeadResponse[];
}

export interface LeadCreate {
  lead_type: string;
  source: string;
  platform_sender_id: string;
  status_id?: string | null;
  car_id?: string | null;
  name?: string | null;
  instagram_handle?: string | null;
  phone?: string | null;
  notes?: string | null;
  desired_budget_min?: number | null;
  desired_budget_max?: number | null;
  desired_mileage_max?: number | null;
  desired_year_min?: number | null;
  desired_year_max?: number | null;
  desired_make?: string | null;
  desired_model?: string | null;
  desired_car_type?: string | null;
  notes_document?: LeadNotesDocumentJson | null;
}

export interface LeadUpdate {
  lead_type?: string | null;
  status_id?: string | null;
  car_id?: string | null;
  name?: string | null;
  instagram_handle?: string | null;
  phone?: string | null;
  notes?: string | null;
  desired_budget_min?: number | null;
  desired_budget_max?: number | null;
  desired_mileage_max?: number | null;
  desired_year_min?: number | null;
  desired_year_max?: number | null;
  desired_make?: string | null;
  desired_model?: string | null;
  desired_car_type?: string | null;
  attachments?: CarAttachmentsJson | null;
  notes_document?: LeadNotesDocumentJson | null;
}

export interface LeadStatusResponse {
  id: string;
  user_id: string;
  name: string;
  display_order: number;
  created_at: string;
  updated_at: string | null;
}

export interface LeadStatusesListResponse {
  statuses: LeadStatusResponse[];
}

export interface CarResponse {
  id: string;
  user_id: string;
  brand: string;
  model: string;
  year: number;
  mileage: number | null;
  price: number | string | null;
  desired_price: number | string | null;
  car_type: string | null;
  listed_at: string | null;
  owner_type: string;
  status: string;
  attachments: CarAttachmentsJson | null;
  /** Legacy plain-text notes (optional migration source for rich notes). */
  notes?: string | null;
  /** Tiptap JSON document; same shape as lead `notes_document`. */
  notes_document?: LeadNotesDocumentJson | null;
  created_at: string;
  updated_at: string | null;
}

export interface CarCreate {
  brand: string;
  model: string;
  year: number;
  mileage: number | null;
  price: number | null;
  desired_price: number | null;
  car_type: string | null;
  listed_at: string | null;
  owner_type: string;
  status: string;
  attachments?: CarAttachmentsJson | null;
  notes?: string | null;
  notes_document?: LeadNotesDocumentJson | null;
}

export interface CarUpdate {
  brand?: string;
  model?: string;
  year?: number;
  mileage?: number | null;
  price?: number | null;
  desired_price?: number | null;
  car_type?: string | null;
  listed_at?: string | null;
  owner_type?: string;
  status?: string;
  attachments?: CarAttachmentsJson | null;
  notes?: string | null;
  notes_document?: LeadNotesDocumentJson | null;
}

export interface CarsListResponse {
  cars: CarResponse[];
}

export interface AutomationTypeItem {
  id: string;
  platform: string;
  code: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  required_scopes: string | null;
  is_active: boolean;
  display_order: number;
}

export interface AutomationItem {
  id: string;
  user_id: string;
  automation_type_id: string;
  platform_page_id: string;
  token_type: string;
  token_expires_at: string | null;
  status: string;
  last_activity: string | null;
  last_error: string | null;
  config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string | null;
}

export interface AutomationTypesListResponse {
  types: AutomationTypeItem[];
}

export interface AutomationListResponse {
  automations: AutomationItem[];
}

/** Log line / DM sent by an automation (when API exposes `/automations/:id/messages`). */
export interface AutomationMessageItem {
  id: string;
  body: string | null;
  direction: string | null;
  created_at: string;
}

export interface AutomationMessagesListResponse {
  messages: AutomationMessageItem[];
}

export interface AutomationUpdateRequest {
  status: string;
}

export interface AutomationConfigUpdateRequest {
  config: Record<string, unknown>;
}

export interface OAuthAuthorizeUrlResponse {
  authorize_url: string;
}
