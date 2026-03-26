export interface LeadStatus {
  id: string;
  name: string;
  display_order: number;
  color: string | null;
  is_default: boolean;
  created_at: string;
}

export interface CarAttachment {
  type: "image" | "document";
  url: string;
  filename?: string;
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
  owner_type: "owned" | "client" | "advisor";
  status: "available" | "sold";
  attachments: CarAttachment[] | null;
  created_at: string;
  updated_at: string | null;
}

export interface Lead {
  id: string;
  /** Workspace owner — each lead belongs to one user. */
  user_id?: string;
  platform_sender_id?: string | null;
  lead_type: "pending" | "buyer" | "seller";
  source: string;
  status_id: string | null;
  car_id: string | null;
  name: string | null;
  instagram_handle: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  desired_budget_min: number | null;
  desired_budget_max: number | null;
  desired_mileage_max: number | null;
  desired_year_min: number | null;
  desired_year_max: number | null;
  desired_make: string | null;
  desired_model: string | null;
  desired_car_type: string | null;
  // joined
  status?: LeadStatus;
  car?: Car;
}
