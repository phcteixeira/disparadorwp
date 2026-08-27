/**
 * Conversões entre o valor de um <input type="datetime-local"> (sem timezone, ex.:
 * "2026-09-01T14:30") e um instante UTC real, interpretando o valor no fuso horário informado
 * (o fuso do workspace). Usa apenas Intl (sem dependência de tz database externa).
 */
export function zonedTimeToUtc(dateTimeLocal: string, timeZone: string): Date {
  const [datePart, timePart] = dateTimeLocal.split("T");
  if (!datePart || !timePart) throw new Error("Data/hora inválida.");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  if (!year || !month || !day || hour === undefined || minute === undefined) {
    throw new Error("Data/hora inválida.");
  }

  const asUtc = Date.UTC(year, month - 1, day, hour, minute);

  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(dtf.formatToParts(new Date(asUtc)).map((p) => [p.type, p.value]));
  const asIfLocal = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) === 24 ? 0 : Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  const offset = asIfLocal - asUtc;
  return new Date(asUtc - offset);
}

/** Formata um instante (Date/ISO) como valor de <input type="datetime-local"> no fuso informado. */
export function utcToZonedInputValue(date: Date | string, timeZone: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(dtf.formatToParts(d).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
