// Tracks real user activities in localStorage for the dashboard feed

const KEY = 'xentory_activity_v1';
const MAX_ITEMS = 30;

export type ActivityType = 'analysis' | 'match_view' | 'pick';

export interface Activity {
  id: string;
  type: ActivityType;
  sport: string;       // emoji
  title: string;       // "Real Madrid vs Barça"
  subtitle: string;    // "La Liga • Análisis generado"
  ts: number;          // unix ms
}

function load(): Activity[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; }
}

function save(items: Activity[]) {
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
}

export function logActivity(act: Omit<Activity, 'id' | 'ts'>) {
  const items = load();
  // Deduplicate: skip if same title+type within last 5 min
  const recent = items.find(
    a => a.type === act.type && a.title === act.title && Date.now() - a.ts < 5 * 60 * 1000
  );
  if (recent) return;
  items.unshift({ ...act, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, ts: Date.now() });
  save(items);
}

export function getRecentActivity(limit = 8): Activity[] {
  return load().slice(0, limit);
}

export function clearActivity() {
  localStorage.removeItem(KEY);
}
