/** JSONB attachments on cars (URLs or blob refs after upload). */
export type CarAttachmentsJson = unknown;

export interface CarResponse {
  id: string;
  /** Owner user — each car belongs to exactly one user (FK). */
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

/** Create body: `user_id` is set by the server from the authenticated user. */
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

/** Update body: ownership (`user_id`) is not changed via this endpoint. */
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

export interface LeadResponse {
  id: string;
  user_id: string;
  platform_sender_id: string | null;
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

export interface LeadCreate {
  lead_type: string;
  source: string;
  status_id?: string;
  platform_sender_id?: string;
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
  lead_type: string;
  source: string;
  platform_sender_id?: string | null;
  status_id: string | null;
  car_id: string | null;
  name: string | null;
  instagram_handle: string | null;
  phone: string | null;
  notes: string | null;
  desired_budget_min: number | null;
  desired_budget_max: number | null;
  desired_mileage_max: number | null;
  desired_year_min: number | null;
  desired_year_max: number | null;
  desired_make: string | null;
  desired_model: string | null;
  desired_car_type: string | null;
}

export interface LeadStatusResponse {
  id: string;
  name: string;
  display_order: number;
  color: string | null;
  is_default: boolean;
  created_at: string;
}
