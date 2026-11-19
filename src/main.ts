import './style.css';
import { RallySound } from './audio/sound';
import {
  getRallyUpgradeCost,
  getRallyUpgrades,
  loadRallyState,
  RALLY_STAGES,
  RALLY_VEHICLES,
  RallyUpgradeKey,
  saveRallyState,
} from './data/rallyCatalog';
import { DuneRallyEngine, RallyHudSnapshot } from './game/rallyEngine';

const app = document.getElementById('app')!;
const sfx = new RallySound();
const state = loadRallyState();

let engine: DuneRallyEngine | null = null;

function stopEngine(): void {
  if (engine) {
    engine.stop();
    engine = null;
  }
}

function renderGarage(): void {
  stopEngine();
  const vehicle = RALLY_VEHICLES.find((v) => v.id === state.selectedVehicleId) || RALLY_VEHICLES[0];
  const stage = RALLY_STAGES.find((s) => s.id === state.selectedStageId) || RALLY_STAGES[0];
  const up = getRallyUpgrades(state, vehicle.id);

  const UPGRADE_LIST: Array<{ key: RallyUpgradeKey; name: string; desc: string }> = [
    { key: 'engine', name: 'V-Twin / Turbo Engine', desc: '+Hill Climb Torque & Top Speed' },
    { key: 'suspension', name: 'Long-Travel Shocks', desc: '+Smooth Landings & Stability' },
    { key: 'tires', name: 'Deep-Tread Tires', desc: '+Mud & Ice Traction' },
    { key: 'fuel', name: 'Reserve Fuel Tank', desc: '+Longer Trail Endurance' },
  ];

  app.innerHTML = `
    <div class="db-shell">
      <header class="db-topbar">
        <div>
          <h1 class="db-title">DUNE BAJA RALLY</h1>
          <p class="db-sub">Off-Road Physics · Stunts · Hill Climb</p>
        </div>
        <div class="db-top-right">
          <div class="db-coin-pill">${state.coins.toLocaleString('en-US')} Coins</div>
          <button type="button" class="db-icon-btn" id="dbBtnSound">${sfx.enabled ? 'SFX' : 'MUTE'}</button>
        </div>
      </header>

      <main class="db-scroll">
        <section class="db-card">
          <div class="db-sec-lbl">Off-Road Vehicles</div>
          <div class="db-grid-2">
            ${RALLY_VEHICLES.map((v) => {
              const owned = state.unlockedVehicles.includes(v.id);
              const selected = v.id === vehicle.id;
              const canBuy = state.coins >= v.price;
              return `
                <button
                  type="button"
                  class="db-pick-btn ${selected ? 'active' : ''}"
                  data-veh="${v.id}"
                >
                  <div class="db-pick-top">
                    <span class="db-swatch" style="background:${v.bodyColor};"></span>
                    <strong>${v.name}</strong>
                  </div>
                  <span>${v.subtitle}</span>
                  <small>${owned ? (selected ? 'ACTIVE' : 'SELECT') : `${v.price} Coins${canBuy ? '' : ' (Locked)'}`}</small>
                </button>
              `;
            }).join('')}
          </div>
        </section>

        <section class="db-card">
          <div class="db-sec-lbl">Rig Upgrades (${vehicle.name})</div>
          <div class="db-up-list">
            ${UPGRADE_LIST.map((u) => {
              const lvl = up[u.key];
              const isMax = lvl >= 5;
              const cost = getRallyUpgradeCost(lvl);
              const canBuy = !isMax && state.coins >= cost;
              return `
                <div class="db-up-row">
                  <div>
                    <div class="db-up-name">${u.name} <span>Lv.${lvl}/5</span></div>
                    <div class="db-up-desc">${u.desc}</div>
                  </div>
                  <button
                    type="button"
                    class="db-buy-btn ${isMax ? 'max' : canBuy ? '' : 'locked'}"
                    data-up="${u.key}"
                    ${isMax || !canBuy ? 'disabled' : ''}
                  >
                    ${isMax ? 'MAX' : `${cost}`}
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </section>

        <section class="db-card">
          <div class="db-sec-lbl">Rally Stage</div>
          <div class="db-grid-2">
            ${RALLY_STAGES.map((s) => {
              const best = state.bestDistM[s.id] || 0;
              return `
                <button type="button" class="db-pick-btn ${s.id === stage.id ? 'active' : ''}" data-stage="${s.id}">
                  <strong>${s.name}</strong>
                  <span>${s.subtitle}</span>
                  <small>Best: ${best} m</small>
                </button>
              `;
            }).join('')}
          </div>
        </section>
      </main>

      <button type="button" class="db-start-btn" id="dbBtnStart">DRIVE TRAIL</button>
    </div>
  `;

  document.getElementById('dbBtnSound')!.addEventListener('click', () => {
    sfx.enabled = !sfx.enabled;
    if (sfx.enabled) sfx.playTap();
    renderGarage();
  });

  document.querySelectorAll<HTMLButtonElement>('[data-veh]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.veh!;
      const v = RALLY_VEHICLES.find((x) => x.id === id)!;
      if (state.unlockedVehicles.includes(id)) {
        state.selectedVehicleId = id;
        sfx.playTap();
      } else if (state.coins >= v.price) {
        state.coins -= v.price;
        state.unlockedVehicles.push(id);
        state.selectedVehicleId = id;
        sfx.playFlip();
      } else {
        return;
      }
      saveRallyState(state);
      renderGarage();
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-stage]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.selectedStageId = btn.dataset.stage!;
      saveRallyState(state);
      sfx.playTap();
      renderGarage();
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-up]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.up as RallyUpgradeKey;
      const lvl = up[key];
      if (lvl >= 5) return;
      const cost = getRallyUpgradeCost(lvl);
      if (state.coins < cost) return;
      state.coins -= cost;
      up[key] = lvl + 1;
      saveRallyState(state);
      sfx.playCoin();
      renderGarage();
    });
  });

  document.getElementById('dbBtnStart')!.addEventListener('click', () => {
    sfx.playTap();
    startRallyRun();
  });
}

function startRallyRun(): void {
  stopEngine();
  const vehicle = RALLY_VEHICLES.find((v) => v.id === state.selectedVehicleId) || RALLY_VEHICLES[0];
  const stage = RALLY_STAGES.find((s) => s.id === state.selectedStageId) || RALLY_STAGES[0];
  const up = getRallyUpgrades(state, vehicle.id);

  app.innerHTML = `
    <div class="db-run-shell">
      <canvas id="dbCanvas" class="db-canvas"></canvas>

      <header class="db-hud">
        <div class="db-hud-card">
          <div class="db-dist-val" id="dbDist">0 m</div>
          <div class="db-hud-sub" id="dbCoins">+0 Coins · 0 Flips</div>
        </div>

        <div class="db-fuel-card">
          <span>FUEL</span>
          <div class="db-fuel-track"><div class="db-fuel-fill" id="dbFuelBar" style="width:100%"></div></div>
        </div>

        <button type="button" class="db-icon-btn" id="dbBtnExit">EXIT</button>
      </header>

      <div class="db-pedals">
        <button type="button" class="db-pedal db-brake" id="dbPedalBrake">
          <strong>BRAKE</strong>
          <span>Tilt Nose Down</span>
        </button>
        <button type="button" class="db-pedal db-gas" id="dbPedalGas">
          <strong>GAS</strong>
          <span>Tilt Nose Up</span>
        </button>
      </div>

      <div class="db-modal" id="dbEndModal">
        <div class="db-modal-card">
          <h2 id="dbEndTitle">Run Finished</h2>
          <p id="dbEndSub"></p>
          <div class="db-end-coins" id="dbEndCoins">+0 Coins</div>
          <div class="db-modal-actions">
            <button type="button" class="db-start-btn" id="dbBtnRetry">DRIVE AGAIN</button>
            <button type="button" class="db-secondary-btn" id="dbBtnGarage">GARAGE & UPGRADES</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const canvas = document.getElementById('dbCanvas') as HTMLCanvasElement;
  const elDist = document.getElementById('dbDist')!;
  const elCoins = document.getElementById('dbCoins')!;
  const elFuel = document.getElementById('dbFuelBar')!;
  const elEndModal = document.getElementById('dbEndModal')!;

  const onHud = (snap: RallyHudSnapshot) => {
    elDist.textContent = `${snap.distanceM} m`;
    elCoins.textContent = `+${snap.coinsEarned} Coins · ${snap.flips} Flips`;
    elFuel.style.width = `${snap.fuelPct}%`;
    elFuel.style.background =
      snap.fuelPct < 25 ? '#fb7185' : snap.fuelPct < 55 ? '#fbbf24' : '#34d399';
  };

  const onEnd = (snap: RallyHudSnapshot) => {
    const distBonus = Math.round(snap.distanceM * 0.5);
    const totalEarned = snap.coinsEarned + distBonus;
    state.coins += totalEarned;
    const prev = state.bestDistM[stage.id] || 0;
    if (snap.distanceM > prev) state.bestDistM[stage.id] = snap.distanceM;
    saveRallyState(state);

    document.getElementById('dbEndTitle')!.textContent =
      snap.gameOverReason === 'fuel' ? 'Out of Fuel!' : 'Rolled Over!';
    document.getElementById('dbEndSub')!.textContent =
      `${snap.distanceM} m driven · ${snap.flips} Air Flips`;
    document.getElementById('dbEndCoins')!.textContent = `+${totalEarned} Coins`;
    elEndModal.classList.add('open');
  };

  engine = new DuneRallyEngine(canvas, sfx, vehicle, up, stage, onHud, onEnd);

  document.getElementById('dbBtnExit')!.addEventListener('click', () => {
    sfx.playTap();
    renderGarage();
  });
  document.getElementById('dbBtnRetry')!.addEventListener('click', () => {
    sfx.playTap();
    startRallyRun();
  });
  document.getElementById('dbBtnGarage')!.addEventListener('click', () => {
    sfx.playTap();
    renderGarage();
  });

  const bindPedal = (id: string, onChange: (v: boolean) => void) => {
    const el = document.getElementById(id)!;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      el.classList.add('pressed');
      onChange(true);
    });
    const rel = () => {
      el.classList.remove('pressed');
      onChange(false);
    };
    el.addEventListener('pointerup', rel);
    el.addEventListener('pointercancel', rel);
    el.addEventListener('lostpointercapture', rel);
  };

  bindPedal('dbPedalGas', (v) => {
    if (engine) engine.input.gas = v;
  });
  bindPedal('dbPedalBrake', (v) => {
    if (engine) engine.input.brake = v;
  });

  window.addEventListener('keydown', (e) => {
    if (!engine) return;
    if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'ArrowUp') engine.input.gas = true;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ArrowDown') engine.input.brake = true;
  });
  window.addEventListener('keyup', (e) => {
    if (!engine) return;
    if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'ArrowUp') engine.input.gas = false;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ArrowDown') engine.input.brake = false;
  });

  engine.start();
}

renderGarage();
