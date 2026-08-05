const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function formatLocalDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDate(value, optionName = "date") {
  if (!DATE_PATTERN.test(value ?? "")) {
    throw new Error(`--${optionName} must use YYYY-MM-DD format`);
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error(`--${optionName} is not a valid calendar date`);
  }
  return date;
}

export function resolveDateRange({ date, from, to, week } = {}) {
  const specifiedModes = [Boolean(date), Boolean(week), Boolean(from || to)].filter(Boolean);
  if (specifiedModes.length > 1) {
    throw new Error("Use only one of --date, --week, or --from/--to");
  }

  if (date) {
    parseDate(date);
    return { from: date, to: date };
  }

  if (week) {
    const target = parseDate(week, "week");
    const day = target.getDay() || 7;
    const monday = new Date(target);
    monday.setDate(target.getDate() - day + 1);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { from: formatLocalDate(monday), to: formatLocalDate(sunday) };
  }

  if (from || to) {
    if (!from || !to) {
      throw new Error("--from and --to must be used together");
    }
    parseDate(from, "from");
    parseDate(to, "to");
    if (from > to) {
      throw new Error("--from cannot be later than --to");
    }
    return { from, to };
  }

  const today = formatLocalDate();
  return { from: today, to: today };
}

export function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}

export function formatClock(isoString) {
  if (!isoString) return "--:--";
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(isoString));
}
