import './style.css';
import { RallySound } from './audio/sound';
import {
  getBestMetersOverall,
  getRallyUpgradeCost,
  getRallyUpgrades,
  loadRallyState,
  RALLY_STAGES,
  RALLY_VEHICLES,
  RallyUpgradeKey,
  saveRallyState,
} from './data/rallyCatalog';
import {
  fetchRallyLeaderboard,
  RallyLeaderboardResult,
  submitRallyScore,
} from './api/leaderboard';
import { drawRallyVehicle, DuneRallyEngine, RallyHudSnapshot } from './game/rallyEngine';

const app = document.getElementById('app')!;
const state = loadRallyState();
const sfx = new RallySound(!state.muted);

let engine: DuneRallyEngine | null = null;
let previewRaf = 0;
let activeKeyDown: ((e: KeyboardEvent) => void) | null = null;
let activeKeyUp: ((e: KeyboardEvent) => void) | null = null;

function cleanupKeyListeners(): void {
  if (activeKeyDown) {
    window.removeEventListener('keydown', activeKeyDown);
    activeKeyDown = null;
  }
  if (activeKeyUp) {
    window.removeEventListener('keyup', activeKeyUp);
    activeKeyUp = null;
  }
}

function stopEngine(): void {
  cancelAnimationFrame(previewRaf);
  cleanupKeyListeners();
  if (engine) {
    engine.stop();
    engine = null;
  }
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderLeaderboardRows(res: RallyLeaderboardResult): string {
  if (!res.entries.length) {
    return `<div class="db-lb-empty">Complete a trail run to post your best distance!</div>`;
  }
  return res.entries
    .map((entry) => {
      const isMe = res.player && entry.deviceId === res.player.deviceId;
      return `
        <div class="db-lb-row ${isMe ? 'me' : ''}">
          <span class="db-lb-rank">#${entry.rank}</span>
          <div class="db-lb-main">
            <strong>${escapeHtml(entry.playerName)}</strong>
            <small>${escapeHtml(entry.vehicleName || 'Rally Rig')} · ${entry.totalFlips} Flips</small>
          </div>
          <span class="db-lb-score">${entry.bestMeters.toLocaleString('en-US')} m</span>
        </div>
      `;
    })
    .join('');
}

function openLeaderboardModal(): void {
  const existing = document.getElementById('dbOverlayModal');
  if (existing) existing.remove();

  const vehicle = RALLY_VEHICLES.find((v) => v.id === state.selectedVehicleId) || RALLY_VEHICLES[0];
  const bestOverall = getBestMetersOverall(state);

  const modal = document.createElement('div');
  modal.id = 'dbOverlayModal';
  modal.className = 'db-modal open';
  modal.innerHTML = `
    <div class="db-modal-card db-modal-wide">
      <h2>Global Rally Rankings</h2>
      <p id="dbLbStatus">Loading leaderboard...</p>
      <div class="db-lb-form">
        <input
          type="text"
          id="dbPlayerNameInput"
          class="db-input"
          maxlength="20"
          value="${escapeHtml(state.playerName)}"
          placeholder="Your driver name"
        />
        <button type="button" class="db-mini-cta" id="dbBtnSyncScore">SAVE & SYNC</button>
      </div>
      <div class="db-lb-summary">
        <span>Best Run: <strong>${bestOverall.toLocaleString('en-US')} m</strong></span>
        <span>Total Flips: <strong>${state.totalFlips}</strong></span>
      </div>
      <div class="db-lb-list" id="dbLbList"></div>
      <div class="db-modal-actions">
        <button type="button" class="db-secondary-btn" id="dbBtnCloseOverlay">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const elStatus = modal.querySelector('#dbLbStatus') as HTMLElement;
  const elList = modal.querySelector('#dbLbList') as HTMLElement;
  const inputName = modal.querySelector('#dbPlayerNameInput') as HTMLInputElement;

  const paint = (res: RallyLeaderboardResult) => {
    elStatus.textContent = res.online
      ? 'Online Global Leaderboard · Top 30 Drivers'
      : res.message || 'Local Garage Leaderboard';
    elList.innerHTML = renderLeaderboardRows(res);
  };

  void fetchRallyLeaderboard().then(paint);

  modal.querySelector('#dbBtnSyncScore')!.addEventListener('click', () => {
    sfx.playTap();
    const cleaned = inputName.value.trim().slice(0, 20) || 'BajaDriver';
    state.playerName = cleaned;
    saveRallyState(state);
    elStatus.textContent = 'Syncing distance...';
    void submitRallyScore({
      playerName: state.playerName,
      bestMeters: getBestMetersOverall(state),
      totalFlips: state.totalFlips,
      vehicleName: vehicle.name,
    }).then(paint);
  });

  const close = () => {
    sfx.playTap();
    modal.remove();
  };
  modal.querySelector('#dbBtnCloseOverlay')!.addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
}

function openMoreGamesModal(): void {
  const existing = document.getElementById('dbOverlayModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'dbOverlayModal';
  modal.className = 'db-modal open';
  modal.innerHTML = `
    <div class="db-modal-card">
      <h2>More Games by VaelNTN</h2>
      <p>Action-packed indie mobile & web games by VaelNTN Studios.</p>
      <div class="db-promo-card">
        <div class="db-promo-badge">FEATURED ACTION ROGUELITE</div>
        <div class="db-promo-title">Starforge Survivors</div>
        <div class="db-promo-desc">
          Command interstellar heroes, evolve devastating orbital weapons, and survive relentless cosmic waves!
        </div>
        <div class="db-promo-links">
          <a
            class="db-start-btn db-link-btn"
            href="https://play.google.com/store/apps/details?id=com.vaelntn.starforgesurvivors"
            target="_blank"
            rel="noopener noreferrer"
          >Play Store</a>
          <a
            class="db-secondary-btn db-link-btn"
            href="https://github.com/VaelNTN/starforge-survivors"
            target="_blank"
            rel="noopener noreferrer"
          >View on GitHub</a>
        </div>
      </div>
      <div class="db-modal-actions">
        <button type="button" class="db-secondary-btn" id="dbBtnClosePromo">Back to Garage</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => {
    sfx.playTap();
    modal.remove();
  };
  modal.querySelector('#dbBtnClosePromo')!.addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
}

function renderGarage(): void {
  stopEngine();
  const vehicle = RALLY_VEHICLES.find((v) => v.id === state.selectedVehicleId) || RALLY_VEHICLES[0];
  const stage = RALLY_STAGES.find((s) => s.id === state.selectedStageId) || RALLY_STAGES[0];
  const up = getRallyUpgrades(state, vehicle.id);

  const UPGRADE_LIST: Array<{ key: RallyUpgradeKey; name: string; desc: string }> = [
    { key: 'engine', name: 'V-Twin / Turbo Engine', desc: '+Off-Road Torque & Top Speed' },
    { key: 'suspension', name: 'Long-Travel Shocks', desc: '+Smooth Landings & Stability' },
    { key: 'tires', name: 'Deep-Tread Tires', desc: '+Mud, Sand & Ice Traction' },
    { key: 'fuel', name: 'Reserve Fuel Tank', desc: '+Longer Trail Endurance' },
  ];

  app.innerHTML = `
    <div class="db-shell">
      <header class="db-topbar">
        <div class="db-brand">
          <h1 class="db-title">DUNE BAJA RALLY</h1>
          <p class="db-sub">Off-Road Stunt Rally · Big Air · Upgrades</p>
        </div>
        <div class="db-top-right">
          <div class="db-coin-pill">${state.coins.toLocaleString('en-US')} Coins</div>
          <button type="button" class="db-icon-btn db-subtle-btn" id="dbBtnMoreGames" title="More Games by VaelNTN">MORE</button>
          <button type="button" class="db-icon-btn" id="dbBtnRanks">RANKS</button>
          <button type="button" class="db-icon-btn" id="dbBtnSound">${sfx.enabled ? 'SFX' : 'MUTE'}</button>
        </div>
      </header>

      <main class="db-scroll">
        <div class="db-garage-grid">
          <div class="db-garage-col">
            <section class="db-preview-card">
              <canvas id="dbPreviewCanvas" class="db-preview-canvas" width="220" height="118"></canvas>
              <div class="db-preview-info">
                <div class="db-preview-name">${vehicle.name}</div>
                <div class="db-preview-sub">${vehicle.subtitle}</div>
                <div class="db-preview-pills">
                  <span>TRQ ${Math.round(vehicle.baseTorque * (1 + (up.engine - 1) * 0.14))}</span>
                  <span>SPD ${Math.round(vehicle.baseTopSpeed * (1 + (up.engine - 1) * 0.14) * 0.24)} km/h</span>
                  <span>BEST ${getBestMetersOverall(state)} m</span>
                </div>
              </div>
            </section>

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
          </div>

          <div class="db-garage-col">
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
          </div>
        </div>
      </main>

      <button type="button" class="db-start-btn" id="dbBtnStart">DRIVE TRAIL</button>
    </div>
  `;

  // Live animated Garage vehicle preview canvas
  const previewCanvas = document.getElementById('dbPreviewCanvas') as HTMLCanvasElement;
  const startT = performance.now();
  const drawPreview = (ts: number) => {
    const ctx = previewCanvas.getContext('2d');
    if (ctx) {
      const t = (ts - startT) / 1000;
      const pw = previewCanvas.width;
      const ph = previewCanvas.height;
      ctx.clearRect(0, 0, pw, ph);

      // Subtle desert/stage backdrop strip
      const grad = ctx.createLinearGradient(0, 0, 0, ph);
      grad.addColorStop(0, stage.skyTop);
      grad.addColorStop(0.75, stage.skyBot);
      grad.addColorStop(1, stage.groundColor);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(0, 0, pw, ph, 12);
      ctx.fill();

      // Scrolling ground crust line
      ctx.fillStyle = stage.groundColor;
      ctx.fillRect(0, ph - 22, pw, 22);
      ctx.strokeStyle = stage.crustColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, ph - 22);
      ctx.lineTo(pw, ph - 22);
      ctx.stroke();

      // Animated vehicle with flexing suspension & spinning knobby wheels
      const bounce = Math.sin(t * 4.5) * 2.2;
      const compA = 2.5 + Math.sin(t * 4.5) * 2.5;
      const compB = 2.5 + Math.cos(t * 4.5) * 2.5;
      ctx.save();
      ctx.translate(pw * 0.5, ph - 52 + bounce);
      ctx.rotate(Math.sin(t * 2.2) * 0.04);
      ctx.scale(1.12, 1.12);
      drawRallyVehicle(ctx, vehicle, t * 4.2, compA, compB, t);
      ctx.restore();
    }
    previewRaf = requestAnimationFrame(drawPreview);
  };
  previewRaf = requestAnimationFrame(drawPreview);

  document.getElementById('dbBtnMoreGames')!.addEventListener('click', () => {
    sfx.playTap();
    openMoreGamesModal();
  });

  document.getElementById('dbBtnRanks')!.addEventListener('click', () => {
    sfx.playTap();
    openLeaderboardModal();
  });

  document.getElementById('dbBtnSound')!.addEventListener('click', () => {
    state.muted = !state.muted;
    sfx.setEnabled(!state.muted);
    saveRallyState(state);
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
          <div class="db-hud-top-row">
            <span class="db-dist-val" id="dbDist">0 m</span>
            <span class="db-speed-pill" id="dbSpeed">0 km/h</span>
          </div>
          <div class="db-hud-sub" id="dbCoins">+0 Coins · 0 Flips</div>
        </div>

        <div class="db-fuel-card" id="dbFuelCard">
          <span id="dbFuelLbl">FUEL</span>
          <div class="db-fuel-track"><div class="db-fuel-fill" id="dbFuelBar" style="width:100%"></div></div>
        </div>

        <button type="button" class="db-icon-btn" id="dbBtnPause" aria-label="Pause Run">PAUSE</button>
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

      <div class="db-modal" id="dbPauseModal">
        <div class="db-modal-card">
          <h2>Run Paused</h2>
          <p>${stage.name} · ${vehicle.name}</p>
          <div class="db-modal-actions" id="dbPauseMainActions">
            <button type="button" class="db-start-btn" id="dbBtnResume">RESUME RUN</button>
            <button type="button" class="db-secondary-btn" id="dbBtnRestart">RESTART STAGE</button>
            <button type="button" class="db-secondary-btn" id="dbBtnPauseMute">${sfx.enabled ? 'Sound: ON' : 'Sound: MUTED'}</button>
            <button type="button" class="db-danger-btn" id="dbBtnPauseExit">EXIT TO GARAGE</button>
          </div>
          <div class="db-modal-actions db-hidden" id="dbPauseConfirmActions">
            <p class="db-confirm-text">Abandon current run and return to Garage?</p>
            <button type="button" class="db-danger-btn" id="dbBtnConfirmExit">Yes, Exit Run</button>
            <button type="button" class="db-secondary-btn" id="dbBtnCancelExit">Cancel</button>
          </div>
        </div>
      </div>

      <div class="db-modal" id="dbEndModal">
        <div class="db-modal-card">
          <h2 id="dbEndTitle">Run Finished</h2>
          <p id="dbEndSub"></p>
          <div class="db-end-coins" id="dbEndCoins">+0 Coins</div>
          <div class="db-modal-actions">
            <button type="button" class="db-start-btn" id="dbBtnRetry">DRIVE AGAIN</button>
            <button type="button" class="db-secondary-btn" id="dbBtnEndRanks">GLOBAL RANKINGS</button>
            <button type="button" class="db-secondary-btn" id="dbBtnGarage">GARAGE & UPGRADES</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const canvas = document.getElementById('dbCanvas') as HTMLCanvasElement;
  const elDist = document.getElementById('dbDist')!;
  const elSpeed = document.getElementById('dbSpeed')!;
  const elCoins = document.getElementById('dbCoins')!;
  const elFuelCard = document.getElementById('dbFuelCard')!;
  const elFuelLbl = document.getElementById('dbFuelLbl')!;
  const elFuel = document.getElementById('dbFuelBar')!;
  const elPauseModal = document.getElementById('dbPauseModal')!;
  const elPauseMain = document.getElementById('dbPauseMainActions')!;
  const elPauseConfirm = document.getElementById('dbPauseConfirmActions')!;
  const elPauseMute = document.getElementById('dbBtnPauseMute')!;
  const elEndModal = document.getElementById('dbEndModal')!;

  const openPause = () => {
    if (!engine || elEndModal.classList.contains('open')) return;
    engine.setPaused(true);
    elPauseMain.classList.remove('db-hidden');
    elPauseConfirm.classList.add('db-hidden');
    elPauseMute.textContent = sfx.enabled ? 'Sound: ON' : 'Sound: MUTED';
    elPauseModal.classList.add('open');
  };

  const closePause = () => {
    if (!engine) return;
    elPauseModal.classList.remove('open');
    engine.setPaused(false);
  };

  const onHud = (snap: RallyHudSnapshot) => {
    elDist.textContent = `${snap.distanceM} m`;
    elSpeed.textContent = `${snap.speedKmh} km/h`;
    elCoins.textContent = `+${snap.coinsEarned} · ${snap.flips} Flips`;
    elFuel.style.width = `${snap.fuelPct}%`;
    elFuel.style.background =
      snap.fuelPct < 25 ? '#fb7185' : snap.fuelPct < 55 ? '#fbbf24' : '#34d399';
    elFuelCard.classList.toggle('low', snap.lowFuel);
    elFuelLbl.textContent = snap.lowFuel ? 'LOW FUEL!' : 'FUEL';
  };

  const onEnd = (snap: RallyHudSnapshot) => {
    elPauseModal.classList.remove('open');
    const distBonus = Math.round(snap.distanceM * 0.5);
    const totalEarned = snap.coinsEarned + distBonus;
    state.coins += totalEarned;
    state.totalFlips += snap.flips;
    const prev = state.bestDistM[stage.id] || 0;
    const isNewBest = snap.distanceM > prev;
    if (isNewBest) state.bestDistM[stage.id] = snap.distanceM;
    saveRallyState(state);

    void submitRallyScore({
      playerName: state.playerName,
      bestMeters: getBestMetersOverall(state),
      totalFlips: state.totalFlips,
      vehicleName: vehicle.name,
    });

    document.getElementById('dbEndTitle')!.textContent =
      snap.gameOverReason === 'fuel' ? 'Out of Fuel!' : 'Rolled Over!';
    document.getElementById('dbEndSub')!.textContent =
      `${snap.distanceM} m driven${isNewBest ? ' (NEW BEST!)' : ''} · ${snap.flips} Air Flips`;
    document.getElementById('dbEndCoins')!.textContent = `+${totalEarned} Coins`;
    elEndModal.classList.add('open');
  };

  engine = new DuneRallyEngine(canvas, sfx, vehicle, up, stage, onHud, onEnd);

  document.getElementById('dbBtnPause')!.addEventListener('click', () => {
    sfx.playTap();
    openPause();
  });
  document.getElementById('dbBtnResume')!.addEventListener('click', () => {
    sfx.playTap();
    closePause();
  });
  document.getElementById('dbBtnRestart')!.addEventListener('click', () => {
    sfx.playTap();
    startRallyRun();
  });
  elPauseMute.addEventListener('click', () => {
    state.muted = !state.muted;
    sfx.setEnabled(!state.muted);
    saveRallyState(state);
    elPauseMute.textContent = sfx.enabled ? 'Sound: ON' : 'Sound: MUTED';
    if (sfx.enabled) sfx.playTap();
  });
  document.getElementById('dbBtnPauseExit')!.addEventListener('click', () => {
    sfx.playTap();
    elPauseMain.classList.add('db-hidden');
    elPauseConfirm.classList.remove('db-hidden');
  });
  document.getElementById('dbBtnCancelExit')!.addEventListener('click', () => {
    sfx.playTap();
    elPauseConfirm.classList.add('db-hidden');
    elPauseMain.classList.remove('db-hidden');
  });
  document.getElementById('dbBtnConfirmExit')!.addEventListener('click', () => {
    sfx.playTap();
    renderGarage();
  });

  document.getElementById('dbBtnRetry')!.addEventListener('click', () => {
    sfx.playTap();
    startRallyRun();
  });
  document.getElementById('dbBtnEndRanks')!.addEventListener('click', () => {
    sfx.playTap();
    openLeaderboardModal();
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

  activeKeyDown = (e: KeyboardEvent) => {
    if (!engine) return;
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (engine.isPaused()) closePause();
      else openPause();
      return;
    }
    if (engine.isPaused()) return;
    if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'ArrowUp') engine.input.gas = true;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ArrowDown') engine.input.brake = true;
  };
  activeKeyUp = (e: KeyboardEvent) => {
    if (!engine) return;
    if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'ArrowUp') engine.input.gas = false;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ArrowDown') engine.input.brake = false;
  };
  window.addEventListener('keydown', activeKeyDown);
  window.addEventListener('keyup', activeKeyUp);

  engine.start();
}

renderGarage();
