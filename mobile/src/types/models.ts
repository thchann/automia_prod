export type LeadType = "pending" | "buyer" | "seller";
export type CarStatus = "available" | "sold";
export type OwnerType = "owned" | "client" | "advisor";

export interface Lead {
  id: string;
  platform_sender_id?: string | null;
  name: string | null;
  lead_type: LeadType;
  source: string;
  instagram_handle: string | null;
  phone: string | null;
  notes: string | null;
  status_id: string | null;
  /**
   * Primary / legacy single match (kept for compatibility).
   * When multiple cars are matched, this is typically the first one.
   */
  car_id: string | null;
  /** Multiple matched cars for the same lead (one car still only belongs to one lead). */
  car_ids?: string[] | null;
  desired_budget_min: number | null;
  desired_budget_max: number | null;
  desired_mileage_max: number | null;
  desired_year_min: number | null;
  desired_year_max: number | null;
  desired_make: string | null;
  desired_model: string | null;
  desired_car_type: string | null;
  created_at: string;
  updated_at: string | null;
  /** Populated client-side from statuses list */
  status?: LeadStatus;
}

export interface Car {
  id: string;
  /** Owning user — one car belongs to exactly one user. */
  user_id: string;
  brand: string;
  model: string;
  year: number;
  mileage: number | null;
  price: number | null;
  desired_price: number | null;
  car_type: string | null;
  listed_at: string | null;
  owner_type: OwnerType;
  status: CarStatus;
  attachments: Array<{ type: string; url: string; filename: string }> | null;
  created_at: string;
  updated_at: string | null;
}

export interface LeadStatus {
  id: string;
  name: string;
  display_order: number;
  color: string | null;
  is_default: boolean;
}
