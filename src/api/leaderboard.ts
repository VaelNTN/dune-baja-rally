import { getRallyDeviceId } from '../data/rallyCatalog';

export interface RallyLeaderboardEntry {
  rank: number;
  deviceId: string;
  playerName: string;
  bestMeters: number;
  totalFlips: number;
  vehicleName: string;
  updatedAt?: string;
}

export interface RallyLeaderboardResult {
  online: boolean;
  entries: RallyLeaderboardEntry[];
  player: RallyLeaderboardEntry | null;
  message?: string;
}

const LOCAL_BOARD_KEY = 'dbr_local_board_v1';
const CUSTOM_API_KEY = 'dbr_api_url_v1';

export function getRallyApiUrl(): string {
  try {
    const saved = localStorage.getItem(CUSTOM_API_KEY);
    if (saved) return saved.trim().replace(/\/+$/, '');
  } catch {
    // ignore
  }
  const envUrl = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL || '';
  return envUrl.trim().replace(/\/+$/, '');
}

function readLocalBoard(): RallyLeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_BOARD_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as RallyLeaderboardEntry[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function writeLocalBoard(entries: RallyLeaderboardEntry[]): void {
  try {
    localStorage.setItem(LOCAL_BOARD_KEY, JSON.stringify(entries.slice(0, 30)));
  } catch {
    // ignore
  }
}

function upsertLocalEntry(
  deviceId: string,
  playerName: string,
  bestMeters: number,
  totalFlips: number,
  vehicleName: string
): RallyLeaderboardEntry[] {
  const list = readLocalBoard();
  const idx = list.findIndex((e) => e.deviceId === deviceId);
  const now = new Date().toISOString();
  if (idx >= 0) {
    const prev = list[idx];
    list[idx] = {
      ...prev,
      playerName,
      bestMeters: Math.max(prev.bestMeters, bestMeters),
      totalFlips: Math.max(prev.totalFlips, totalFlips),
      vehicleName,
      updatedAt: now,
    };
  } else {
    list.push({
      rank: 1,
      deviceId,
      playerName,
      bestMeters,
      totalFlips,
      vehicleName,
      updatedAt: now,
    });
  }
  list.sort((a, b) => b.bestMeters - a.bestMeters || b.totalFlips - a.totalFlips);
  const ranked = list.map((e, i) => ({ ...e, rank: i + 1 }));
  writeLocalBoard(ranked);
  return ranked;
}

export async function fetchRallyLeaderboard(): Promise<RallyLeaderboardResult> {
  const deviceId = await getRallyDeviceId();
  const apiUrl = getRallyApiUrl();

  if (apiUrl) {
    try {
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(
        `${apiUrl}/api/dune-baja/highscores?limit=30&deviceId=${encodeURIComponent(deviceId)}`,
        { signal: ctrl.signal }
      );
      window.clearTimeout(timer);
      if (res.ok) {
        const data = (await res.json()) as {
          ok?: boolean;
          entries?: RallyLeaderboardEntry[];
          player?: RallyLeaderboardEntry | null;
        };
        if (data && Array.isArray(data.entries)) {
          return {
            online: true,
            entries: data.entries,
            player: data.player ?? null,
          };
        }
      }
    } catch {
      // fall back to local leaderboard
    }
  }

  const local = readLocalBoard();
  const me = local.find((e) => e.deviceId === deviceId) || null;
  return {
    online: false,
    entries: local,
    player: me,
    message: apiUrl
      ? 'Offline mode — showing local garage records.'
      : 'Local leaderboard (connect VITE_API_URL for global rankings).',
  };
}

export async function submitRallyScore(payload: {
  playerName: string;
  bestMeters: number;
  totalFlips: number;
  vehicleName: string;
}): Promise<RallyLeaderboardResult> {
  const deviceId = await getRallyDeviceId();
  const cleanName = payload.playerName.trim().slice(0, 20) || 'BajaDriver';
  const bestMeters = Math.max(0, Math.round(payload.bestMeters));
  const totalFlips = Math.max(0, Math.round(payload.totalFlips));
  const vehicleName = payload.vehicleName.trim().slice(0, 28) || 'Sandhopper Buggy';

  upsertLocalEntry(deviceId, cleanName, bestMeters, totalFlips, vehicleName);

  const apiUrl = getRallyApiUrl();
  if (apiUrl) {
    try {
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), 5000);
      await fetch(`${apiUrl}/api/dune-baja/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          playerName: cleanName,
          bestMeters,
          totalFlips,
          vehicleName,
        }),
        signal: ctrl.signal,
      });
      window.clearTimeout(timer);
    } catch {
      // keep local entry
    }
  }

  return fetchRallyLeaderboard();
}
