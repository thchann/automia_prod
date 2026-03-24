import type { Car, Lead } from "@/types/models";

export type CarMatchResult = {
  car: Car;
  score: number;
  reasons: string[];
};

function normalizeText(v: string | null | undefined): string {
  return (v ?? "").trim().toLowerCase();
}

function scoreBudget(lead: Lead, car: Car): CarMatchResult | null {
  const min = lead.desired_budget_min;
  const max = lead.desired_budget_max;
  const basePrice = car.price ?? car.desired_price;
  if (basePrice == null || (min == null && max == null)) return null;

  if (min != null && max != null && basePrice >= min && basePrice <= max) {
    return {
      car,
      score: 28,
      reasons: [`Price in budget ($${basePrice.toLocaleString()})`],
    };
  }

  let score = 0;
  const reasons: string[] = [];
  if (min != null && basePrice >= min) {
    score += 8;
    reasons.push(`Price above min ($${min.toLocaleString()})`);
  }
  if (max != null && basePrice <= max) {
    score += 8;
    reasons.push(`Price below max ($${max.toLocaleString()})`);
  }
  if (score === 0) return null;
  return { car, score, reasons };
}

function scoreYear(lead: Lead, car: Car): CarMatchResult | null {
  const min = lead.desired_year_min;
  const max = lead.desired_year_max;
  if (min == null && max == null) return null;
  if ((min != null && car.year < min) || (max != null && car.year > max)) return null;
  return { car, score: 18, reasons: [`Year match (${car.year})`] };
}

function scoreMileage(lead: Lead, car: Car): CarMatchResult | null {
  if (lead.desired_mileage_max == null || car.mileage == null) return null;
  if (car.mileage > lead.desired_mileage_max) return null;
  return {
    car,
    score: 14,
    reasons: [`Mileage within max (${car.mileage.toLocaleString()} km)`],
  };
}

function scoreText(lead: Lead, car: Car): CarMatchResult | null {
  let score = 0;
  const reasons: string[] = [];
  const make = normalizeText(lead.desired_make);
  const model = normalizeText(lead.desired_model);
  const type = normalizeText(lead.desired_car_type);
  if (make && normalizeText(car.brand).includes(make)) {
    score += 16;
    reasons.push(`Make match (${car.brand})`);
  }
  if (model && normalizeText(car.model).includes(model)) {
    score += 16;
    reasons.push(`Model match (${car.model})`);
  }
  if (type && normalizeText(car.car_type).includes(type)) {
    score += 12;
    reasons.push(`Type match (${car.car_type})`);
  }
  if (score === 0) return null;
  return { car, score, reasons };
}

export function matchLeadToCars(lead: Lead, cars: Car[]): CarMatchResult[] {
  if (lead.lead_type !== "buyer") return [];
  return cars
    .filter((car) => car.status === "available")
    .map((car) => {
      let score = 0;
      const reasons: string[] = [];
      const parts = [
        scoreBudget(lead, car),
        scoreYear(lead, car),
        scoreMileage(lead, car),
        scoreText(lead, car),
      ].filter(Boolean) as CarMatchResult[];

      for (const part of parts) {
        score += part.score;
        reasons.push(...part.reasons);
      }

      if (score === 0) reasons.push("No strong criteria match");
      return { car, score, reasons };
    })
    .sort((a, b) => b.score - a.score);
}

