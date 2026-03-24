function isValidDateString(d: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d));
}

export function getDateRange(period?: string, customStart?: string, customEnd?: string): { startDate: string; endDate: string } {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  switch (period) {
    case "today":
      return { startDate: today, endDate: today };
    case "this_week": {
      const d = new Date(now);
      const day = d.getDay() || 7;
      d.setDate(d.getDate() - day + 1);
      return { startDate: d.toISOString().split("T")[0], endDate: today };
    }
    case "this_month": {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: d.toISOString().split("T")[0], endDate: today };
    }
    case "last_month": {
      const d1 = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const d2 = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: d1.toISOString().split("T")[0], endDate: d2.toISOString().split("T")[0] };
    }
    case "last_quarter": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return { startDate: d.toISOString().split("T")[0], endDate: today };
    }
    case "last_6months": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      return { startDate: d.toISOString().split("T")[0], endDate: today };
    }
    case "last_year": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return { startDate: d.toISOString().split("T")[0], endDate: today };
    }
    case "custom":
      if (customStart && customEnd && isValidDateString(customStart) && isValidDateString(customEnd)) {
        return { startDate: customStart, endDate: customEnd };
      }
      return { startDate: today, endDate: today };
    default: {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: d.toISOString().split("T")[0], endDate: today };
    }
  }
}
