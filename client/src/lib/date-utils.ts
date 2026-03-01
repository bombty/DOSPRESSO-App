import { format } from "date-fns";
import { tr } from "date-fns/locale";

export function formatDate(date: Date | string, pattern: string = "d MMM yyyy, HH:mm"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, pattern, { locale: tr });
}

export function formatDateShort(date: Date | string): string {
  return formatDate(date, "d MMM yyyy");
}

export function formatTime(date: Date | string): string {
  return formatDate(date, "HH:mm");
}
