export type HistoryItem = {
  d: number;
  mode: "Learn" | "Free";
  label: string;
  pct: number | null; // words understood, Learn only
  detail: string; // e.g. "128 wpm" or "range 3.5 st"
};

const KEY = "sayit-history";

export function loadHistory(): HistoryItem[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? (v as HistoryItem[]).slice(0, 40) : [];
  } catch {
    return [];
  }
}

export function saveHistory(items: HistoryItem[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, 40)));
  } catch {
    /* ignore */
  }
}

export function whenLabel(d: number, now = Date.now()): string {
  const days = Math.floor((new Date(now).setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 864e5);
  const time = new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (days <= 0) return `Today ${time}`;
  if (days === 1) return "Yesterday";
  return new Date(d).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
}
