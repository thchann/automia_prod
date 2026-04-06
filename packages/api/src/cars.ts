import { apiRequest, apiRequestBlob } from "./client";
import {
  carCreateToWire,
  carResponseFromWire,
  carsListFromWire,
  carUpdateToWire,
} from "./notesWire";
import type { CarCreate, CarResponse, CarsListResponse, CarUpdate } from "./types";

export async function listCars(): Promise<CarsListResponse> {
  const raw = await apiRequest<CarsListResponse>("/cars");
  return carsListFromWire(raw);
}

export async function getCar(id: string): Promise<CarResponse> {
  const raw = await apiRequest<CarResponse>(`/cars/${id}`);
  return carResponseFromWire(raw);
}

export async function createCar(body: CarCreate): Promise<CarResponse> {
  const raw = await apiRequest<CarResponse>("/cars", {
    method: "POST",
    body: JSON.stringify(carCreateToWire(body)),
  });
  return carResponseFromWire(raw);
}

export async function updateCar(id: string, body: CarUpdate): Promise<CarResponse> {
  const raw = await apiRequest<CarResponse>(`/cars/${id}`, {
    method: "PUT",
    body: JSON.stringify(carUpdateToWire(body)),
  });
  return carResponseFromWire(raw);
}

export async function deleteCar(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/cars/${id}`, { method: "DELETE" });
}

/**
 * Backend contract: `GET /cars/:id/notes/export?format=pdf|docx` — same idea as lead notes export.
 */
export async function exportCarNotes(carId: string, format: "pdf" | "docx"): Promise<Blob> {
  const sp = new URLSearchParams({ format });
  return apiRequestBlob(`/cars/${carId}/notes/export?${sp.toString()}`, { method: "GET" });
}
