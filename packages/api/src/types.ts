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

export interface UserProfilePatch {
  name?: string;
  client_description?: string | null;
  website?: string | null;
  avatar_url?: string | null;
}

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
}

export interface CarUpdate {
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
  attachments: CarAttachmentsJson | null;
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

export interface AutomationUpdateRequest {
  status: string;
}

export interface AutomationConfigUpdateRequest {
  config: Record<string, unknown>;
}

export interface OAuthAuthorizeUrlResponse {
  url: string;
}
