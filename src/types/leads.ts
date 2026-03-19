export interface LeadStatus {
  id: string;
  name: string;
  display_order: number;
  color: string | null;
  is_default: boolean;
  created_at: string;
}

export interface Car {
  id: string;
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
  attachments: any[] | null;
  created_at: string;
  updated_at: string | null;
}

export interface Lead {
  id: string;
  lead_type: "pending" | "buyer" | "seller";
  source: string;
  platform_sender_id: string;
  status_id: string | null;
  car_id: string | null;
  name: string | null;
  instagram_handle: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  // joined
  status?: LeadStatus;
  car?: Car;
}
