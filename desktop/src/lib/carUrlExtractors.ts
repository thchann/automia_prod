export type ExtractedCarData = {
  source: "neoauto";
  url: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  mileage: number | null;
  price: number | null;
  owner_type: "owned" | "client" | "advisor" | null;
  status: "available" | "sold" | null;
  listed_at: string | null;
  car_type: string | null;
};

type LabelAliases = Record<"ownerType" | "status" | "listedAt" | "carType", string[]>;

const LABELS: LabelAliases = {
  ownerType: ["owner type", "tipo de dueno", "tipo de dueño", "owner", "propietario"],
  status: ["status", "estado", "condicion", "condición"],
  listedAt: ["listed at", "publicado", "fecha de publicacion", "fecha de publicación"],
  carType: ["car type", "tipo de auto", "tipo de vehiculo", "tipo de vehículo"],
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[:|]/g, "")
    .trim();
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function textOf(el: Element | null): string {
  if (!el) return "";
  const raw = (el as HTMLElement).innerText ?? el.textContent ?? "";
  return cleanText(raw);
}

function firstTextMatch(doc: Document, matcher: RegExp): string | null {
  const all = Array.from(doc.querySelectorAll("body *"));
  for (const el of all) {
    const t = textOf(el);
    if (t && matcher.test(t)) return t;
  }
  return null;
}

function parsePrice(value: string | null): number | null {
  if (!value) return null;
  const m = value.match(/[\d.,]+/);
  if (!m) return null;
  const n = Number(m[0].replace(/[.,](?=\d{3}\b)/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function parseMileage(value: string | null): number | null {
  if (!value) return null;
  const m = value.match(/[\d.,]+/);
  if (!m) return null;
  const n = Number(m[0].replace(/[.,](?=\d{3}\b)/g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : null;
}

function parseYear(value: string | null): number | null {
  if (!value) return null;
  const m = value.match(/\b(19|20)\d{2}\b/);
  return m ? Number(m[0]) : null;
}

function parseOwnerType(value: string | null): "owned" | "client" | "advisor" | null {
  if (!value) return null;
  const v = normalize(value);
  if (/\b(owned|propio|dueno|dueño)\b/.test(v)) return "owned";
  if (/\b(client|cliente)\b/.test(v)) return "client";
  if (/\b(advisor|asesor)\b/.test(v)) return "advisor";
  return null;
}

function parseStatus(value: string | null): "available" | "sold" | null {
  if (!value) return null;
  const v = normalize(value);
  if (/\b(available|disponible)\b/.test(v)) return "available";
  if (/\b(sold|vendido)\b/.test(v)) return "sold";
  return null;
}

function parseListedAt(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function parseBrandModelYear(doc: Document, url: string): { brand: string | null; model: string | null; year: number | null } {
  const h1 = textOf(doc.querySelector("h1"));
  const pageTitle = cleanText(doc.title || "");
  const pathname = new URL(url).pathname;
  const source = h1 || pageTitle || decodeURIComponent(pathname.split("/").pop() || "");
  const year = parseYear(source);

  let brand: string | null = null;
  let model: string | null = null;

  const slug = (pathname.split("/").pop() || "").toLowerCase();
  const slugCore = slug.replace(/-\d+$/, "");
  const slugParts = slugCore.split("-").filter(Boolean);
  if (slugParts.length >= 2) {
    brand = slugParts[0] ? slugParts[0][0].toUpperCase() + slugParts[0].slice(1) : null;
    const modelParts = slugParts.slice(1).filter((p) => !/^(19|20)\d{2}$/.test(p));
    model = modelParts.length ? modelParts.map((p) => p[0].toUpperCase() + p.slice(1)).join(" ") : null;
  }

  if (h1) {
    const h1NoYear = h1.replace(/\b(19|20)\d{2}\b/, "").trim();
    const tokens = h1NoYear.split(/\s+/).filter(Boolean);
    if (tokens.length >= 2) {
      brand = brand || tokens[0];
      model = tokens.slice(1).join(" ");
    }
  }

  return { brand, model, year };
}

function getByLabels(doc: Document, labels: string[]): string | null {
  const all = Array.from(doc.querySelectorAll("body *"));
  for (const el of all) {
    const t = normalize(textOf(el));
    if (!t || t.length > 60) continue;
    if (!labels.some((l) => t === normalize(l))) continue;

    const sibling = el.nextElementSibling;
    if (sibling) {
      const v = textOf(sibling);
      if (v) return v;
    }

    const parent = el.parentElement;
    if (parent) {
      const kids = Array.from(parent.children).filter((k) => k !== el);
      for (const k of kids) {
        const v = textOf(k);
        if (v && normalize(v) !== t) return v;
      }
    }
  }
  return null;
}

export async function extractNeoAutoFromDocument(doc: Document, url: string): Promise<ExtractedCarData> {
  const specTab = Array.from(doc.querySelectorAll("button, a, [role='tab']")).find((el) =>
    /especificaciones/i.test(textOf(el)),
  );
  if (specTab instanceof HTMLElement) {
    specTab.click();
    await sleep(500);
  }

  const parsed = parseBrandModelYear(doc, url);
  const priceText = firstTextMatch(doc, /US\$\s?[\d.,]+/) || firstTextMatch(doc, /precio\s*:?\s*US\$\s?[\d.,]+/i);
  const mileageText =
    firstTextMatch(doc, /\b[\d.,]+\s?(km|kms)\b/i) || firstTextMatch(doc, /\bkilometraje\b.*?\b[\d.,]+\b/i);

  const ownerRaw = getByLabels(doc, LABELS.ownerType);
  const statusRaw = getByLabels(doc, LABELS.status);
  const listedRaw = getByLabels(doc, LABELS.listedAt);
  const carTypeRaw = getByLabels(doc, LABELS.carType);

  return {
    source: "neoauto",
    url,
    brand: parsed.brand,
    model: parsed.model,
    year: parsed.year,
    mileage: parseMileage(mileageText),
    price: parsePrice(priceText),
    owner_type: parseOwnerType(ownerRaw) ?? "owned",
    status: parseStatus(statusRaw) ?? "available",
    listed_at: parseListedAt(listedRaw),
    car_type: carTypeRaw ? carTypeRaw.toLowerCase() : null,
  };
}

export async function extractCarDataFromUrl(url: string): Promise<ExtractedCarData> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Invalid URL");
  }

  const host = parsedUrl.hostname.toLowerCase();
  if (!host.includes("neoauto.com")) {
    throw new Error("Unsupported site");
  }

  const res = await fetch(parsedUrl.toString());
  if (!res.ok) {
    throw new Error(`Failed to fetch URL: ${res.status}`);
  }
  const html = await res.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  return extractNeoAutoFromDocument(doc, parsedUrl.toString());
}

