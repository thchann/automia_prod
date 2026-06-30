type Tx = (enText: string, esText: string) => string;

type EntityLabels = {
  singularEn: string;
  pluralEn: string;
  singularEs: string;
  pluralEs: string;
};

export function countCreatedToday(items: { created_at: string }[]): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return items.filter((item) => {
    const timestamp = Date.parse(item.created_at);
    return Number.isFinite(timestamp) && timestamp >= start.getTime() && timestamp < end.getTime();
  }).length;
}

export function formatEntityPageSummary(
  total: number,
  newToday: number,
  labels: EntityLabels,
  tx: Tx,
): string {
  const totalPart =
    total === 1
      ? tx(`1 ${labels.singularEn}`, `1 ${labels.singularEs}`)
      : tx(`${total} ${labels.pluralEn}`, `${total} ${labels.pluralEs}`);

  const newTodayPart =
    newToday === 1
      ? tx("1 new today", "1 nuevo hoy")
      : tx(`${newToday} new today`, `${newToday} nuevos hoy`);

  return `${totalPart} · ${newTodayPart}`;
}

export function formatLeadsPageSummary(
  leads: { created_at: string }[],
  tx: Tx,
): string {
  return formatEntityPageSummary(leads.length, countCreatedToday(leads), {
    singularEn: "lead",
    pluralEn: "leads",
    singularEs: "lead",
    pluralEs: "leads",
  }, tx);
}

export function formatCarsPageSummary(
  cars: { created_at: string }[],
  tx: Tx,
): string {
  return formatEntityPageSummary(cars.length, countCreatedToday(cars), {
    singularEn: "car",
    pluralEn: "cars",
    singularEs: "auto",
    pluralEs: "autos",
  }, tx);
}
