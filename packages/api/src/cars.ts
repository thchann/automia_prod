import { apiRequest } from "./client";
import type { CarCreate, CarResponse, CarsListResponse, CarUpdate } from "./types";

export async function listCars(): Promise<CarsListResponse> {
  return apiRequest<CarsListResponse>("/cars");
}

export async function getCar(id: string): Promise<CarResponse> {
  return apiRequest<CarResponse>(`/cars/${id}`);
}

export async function createCar(body: CarCreate): Promise<CarResponse> {
  return apiRequest<CarResponse>("/cars", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateCar(id: string, body: CarUpdate): Promise<CarResponse> {
  return apiRequest<CarResponse>(`/cars/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteCar(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/cars/${id}`, { method: "DELETE" });
}
