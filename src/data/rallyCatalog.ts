import { Device } from '@capacitor/device';

export interface RallyVehicleDef {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  bodyColor: string;
  accentColor: string;
  wheelRadius: number;
  baseTorque: number;
  baseTopSpeed: number;
  baseGrip: number;
  gravityMult: number;
}

export interface RallyStageDef {
  id: string;
  name: string;
  subtitle: string;
  skyTop: string;
  skyBot: string;
  hillColor: string;
  groundColor: string;
  crustColor: string;
  hillAmplitude: number;
  gripMult: number;
  gravity: number;
}

export type RallyUpgradeKey = 'engine' | 'suspension' | 'tires' | 'fuel';

export interface RallySaveState {
  coins: number;
  selectedVehicleId: string;
  selectedStageId: string;
  unlockedVehicles: string[];
  upgrades: Record<string, Record<RallyUpgradeKey, number>>;
  bestDistM: Record<string, number>;
  muted: boolean;
  playerName: string;
  totalFlips: number;
}

export const RALLY_VEHICLES: RallyVehicleDef[] = [
  {
    id: 'baja_buggy',
    name: 'Sandhopper Buggy',
    subtitle: 'Nimble Desert Tubular Buggy',
    price: 0,
    bodyColor: '#f59e0b',
    accentColor: '#fef08a',
    wheelRadius: 19,
    baseTorque: 520,
    baseTopSpeed: 420,
    baseGrip: 0.92,
    gravityMult: 1.0,
  },
  {
    id: 'timber_4x4',
    name: 'Timber 4x4 Rig',
    subtitle: 'Heavy Rock-Crawling Pickup',
    price: 1200,
    bodyColor: '#10b981',
    accentColor: '#a7f3d0',
    wheelRadius: 23,
    baseTorque: 620,
    baseTopSpeed: 445,
    baseGrip: 1.05,
    gravityMult: 1.05,
  },
  {
    id: 'trophy_truck',
    name: 'Baja Trophy Truck',
    subtitle: 'Long-Travel Pro Stadium Truck',
    price: 2800,
    bodyColor: '#ef4444',
    accentColor: '#fde047',
    wheelRadius: 24,
    baseTorque: 740,
    baseTopSpeed: 510,
    baseGrip: 1.08,
    gravityMult: 1.02,
  },
  {
    id: 'lunar_rover',
    name: 'Lunar Jump Crawler',
    subtitle: 'Low-Gravity 6-Wheel Prototype',
    price: 5200,
    bodyColor: '#38bdf8',
    accentColor: '#e0f2fe',
    wheelRadius: 24,
    baseTorque: 790,
    baseTopSpeed: 540,
    baseGrip: 1.15,
    gravityMult: 0.72,
  },
];

export const RALLY_STAGES: RallyStageDef[] = [
  {
    id: 'red_rock',
    name: 'Red Rock Canyon',
    subtitle: 'Sunbaked Dunes & Stunt Jumps',
    skyTop: '#7c2d12',
    skyBot: '#fb923c',
    hillColor: '#9a3412',
    groundColor: '#78350f',
    crustColor: '#f59e0b',
    hillAmplitude: 1.0,
    gripMult: 1.0,
    gravity: 690,
  },
  {
    id: 'pine_mud',
    name: 'Pine Mud Trail',
    subtitle: 'Forest Ridges & Slick Dips',
    skyTop: '#064e3b',
    skyBot: '#34d399',
    hillColor: '#047857',
    groundColor: '#3f2e21',
    crustColor: '#16a34a',
    hillAmplitude: 1.15,
    gripMult: 0.88,
    gravity: 700,
  },
  {
    id: 'glacier',
    name: 'Arctic Glacier',
    subtitle: 'Low-Traction Ice Ramps',
    skyTop: '#0c4a6e',
    skyBot: '#7dd3fc',
    hillColor: '#0284c7',
    groundColor: '#1e3a5f',
    crustColor: '#bae6fd',
    hillAmplitude: 1.25,
    gripMult: 0.74,
    gravity: 670,
  },
  {
    id: 'volcano',
    name: 'Volcano Ridge',
    subtitle: 'Extreme Ridges & Big Air',
    skyTop: '#18181b',
    skyBot: '#dc2626',
    hillColor: '#450a0a',
    groundColor: '#27272a',
    crustColor: '#fb7185',
    hillAmplitude: 1.42,
    gripMult: 0.94,
    gravity: 710,
  },
];

const KEY = 'dune_baja_rally_save_v1';
const DEVICE_KEY = 'dbr_device_id_v1';

export function loadRallyState(): RallySaveState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<RallySaveState>;
      if (parsed && parsed.selectedVehicleId) {
        return {
          coins: Number(parsed.coins) || 0,
          selectedVehicleId: parsed.selectedVehicleId,
          selectedStageId: parsed.selectedStageId || RALLY_STAGES[0].id,
          unlockedVehicles:
            Array.isArray(parsed.unlockedVehicles) && parsed.unlockedVehicles.length
              ? parsed.unlockedVehicles
              : [RALLY_VEHICLES[0].id],
          upgrades: parsed.upgrades || {
            [RALLY_VEHICLES[0].id]: { engine: 1, suspension: 1, tires: 1, fuel: 1 },
          },
          bestDistM: parsed.bestDistM || {},
          muted: Boolean(parsed.muted),
          playerName:
            typeof parsed.playerName === 'string' && parsed.playerName.trim()
              ? parsed.playerName.trim().slice(0, 20)
              : 'BajaDriver',
          totalFlips: Number(parsed.totalFlips) || 0,
        };
      }
    }
  } catch {
    // ignore
  }
  return {
    coins: 400,
    selectedVehicleId: RALLY_VEHICLES[0].id,
    selectedStageId: RALLY_STAGES[0].id,
    unlockedVehicles: [RALLY_VEHICLES[0].id],
    upgrades: {
      [RALLY_VEHICLES[0].id]: { engine: 1, suspension: 1, tires: 1, fuel: 1 },
    },
    bestDistM: {},
    muted: false,
    playerName: 'BajaDriver',
    totalFlips: 0,
  };
}

export function saveRallyState(s: RallySaveState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

export function getBestMetersOverall(s: RallySaveState): number {
  const vals = Object.values(s.bestDistM || {});
  return vals.length ? Math.max(...vals) : 0;
}

export function getRallyUpgrades(s: RallySaveState, vehicleId: string): Record<RallyUpgradeKey, number> {
  if (!s.upgrades[vehicleId]) {
    s.upgrades[vehicleId] = { engine: 1, suspension: 1, tires: 1, fuel: 1 };
  }
  return s.upgrades[vehicleId];
}

export function getRallyUpgradeCost(lvl: number): number {
  return Math.round(180 * Math.pow(1.6, lvl - 1));
}

export async function getRallyDeviceId(): Promise<string> {
  try {
    const cached = localStorage.getItem(DEVICE_KEY);
    if (cached && cached.length >= 4) return cached;
  } catch {
    // ignore
  }
  let id = '';
  try {
    const info = await Device.getId();
    if (info?.identifier && info.identifier.length >= 4) {
      id = `cap_${info.identifier}`;
    }
  } catch {
    // non-native fallback
  }
  if (!id) {
    id = `web_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  }
  try {
    localStorage.setItem(DEVICE_KEY, id);
  } catch {
    // ignore
  }
  return id;
}
