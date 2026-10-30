export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const elapsedSeconds = (date.getTime() - Date.now()) / 1000;
  if (Math.abs(elapsedSeconds) < 60) {
    return "Just now";
  }

  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units = [
    { duration: 60 * 60 * 24 * 30, unit: "month" as const },
    { duration: 60 * 60 * 24, unit: "day" as const },
    { duration: 60 * 60, unit: "hour" as const },
    { duration: 60, unit: "minute" as const },
  ];

  for (const { duration, unit } of units) {
    if (Math.abs(elapsedSeconds) >= duration) {
      return formatter.format(Math.round(elapsedSeconds / duration), unit);
    }
  }

  return "Just now";
}
