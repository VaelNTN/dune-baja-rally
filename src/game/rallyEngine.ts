import { RallySound } from '../audio/sound';
import { RallyStageDef, RallyUpgradeKey, RallyVehicleDef } from '../data/rallyCatalog';

export interface RallyHudSnapshot {
  distanceM: number;
  coinsEarned: number;
  fuelPct: number;
  speedKmh: number;
  flips: number;
  gameOver: boolean;
  gameOverReason: 'crashed' | 'fuel' | null;
}

interface TrailPickup {
  x: number;
  kind: 'coin' | 'fuel';
  value: number;
  collected: boolean;
}

interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: string;
}

interface FloatingStunt {
  text: string;
  x: number;
  y: number;
  alpha: number;
  color: string;
}

export class DuneRallyEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sfx: RallySound;
  private vehicle: RallyVehicleDef;
  private upgrades: Record<RallyUpgradeKey, number>;
  private stage: RallyStageDef;
  private onHud: (snap: RallyHudSnapshot) => void;
  private onEnd: (snap: RallyHudSnapshot) => void;

  private rafId: number | null = null;
  private lastTs = 0;
  private time = 0;

  // Physics State
  private carX = 160;
  private carY = 0;
  private vx = 0;
  private vy = 0;
  private angle = 0;
  private angVel = 0;
  private wheelSpin = 0;
  private fuel = 100;
  private coinsEarned = 0;
  private flips = 0;
  private airAccumAngle = 0;
  private wasGrounded = true;
  private gameOver = false;
  private gameOverReason: 'crashed' | 'fuel' | null = null;
  private lowFuelTimer = 0;

  private pickups: TrailPickup[] = [];
  private dust: DustParticle[] = [];
  private stunts: FloatingStunt[] = [];
  private nextSpawnX = 360;

  public input = {
    gas: false,
    brake: false,
  };

  constructor(
    canvas: HTMLCanvasElement,
    sfx: RallySound,
    vehicle: RallyVehicleDef,
    upgrades: Record<RallyUpgradeKey, number>,
    stage: RallyStageDef,
    onHud: (snap: RallyHudSnapshot) => void,
    onEnd: (snap: RallyHudSnapshot) => void
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.sfx = sfx;
    this.vehicle = vehicle;
    this.upgrades = upgrades;
    this.stage = stage;
    this.onHud = onHud;
    this.onEnd = onEnd;

    this.carY = this.terrainHeight(this.carX) - 34;
    this.seedPickupsUntil(3200);
  }

  public terrainHeight(x: number): number {
    if (x < 280) return 360;
    const d = (x - 280) * 0.0042;
    const amp = this.stage.hillAmplitude * Math.min(1.85, 0.72 + x * 0.000045);
    const y1 = Math.sin(d * 1.1) * 58 * amp;
    const y2 = Math.sin(d * 2.45 + 0.8) * 28 * amp;
    const y3 = Math.cos(d * 0.45) * 42 * amp;
    return 360 - (y1 + y2 + y3);
  }

  private terrainSlope(x: number): number {
    const h1 = this.terrainHeight(x - 6);
    const h2 = this.terrainHeight(x + 6);
    return Math.atan2(h2 - h1, 12);
  }

  private seedPickupsUntil(maxX: number): void {
    while (this.nextSpawnX < maxX) {
      // Cluster of coins along hill crest
      const count = 4 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        this.pickups.push({
          x: this.nextSpawnX + i * 48,
          kind: 'coin',
          value: 25,
          collected: false,
        });
      }
      // Periodic fuel canister every ~650 px
      if (Math.floor(this.nextSpawnX / 520) !== Math.floor((this.nextSpawnX + 340) / 520)) {
        this.pickups.push({
          x: this.nextSpawnX + count * 48 + 90,
          kind: 'fuel',
          value: 45,
          collected: false,
        });
      }
      this.nextSpawnX += 340 + Math.random() * 140;
    }
  }

  public start(): void {
    if (this.rafId !== null) return;
    this.lastTs = performance.now();
    const tick = (ts: number) => {
      const dt = Math.min(0.035, Math.max(0.001, (ts - this.lastTs) / 1000));
      this.lastTs = ts;
      this.update(dt);
      this.render();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  public stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private update(dt: number): void {
    this.time += dt;

    for (let i = this.dust.length - 1; i >= 0; i--) {
      const p = this.dust[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= dt * 1.4;
      if (p.alpha <= 0) this.dust.splice(i, 1);
    }

    for (let i = this.stunts.length - 1; i >= 0; i--) {
      this.stunts[i].y -= 28 * dt;
      this.stunts[i].alpha -= dt * 0.9;
      if (this.stunts[i].alpha <= 0) this.stunts.splice(i, 1);
    }

    if (this.gameOver) return;

    const engMult = 1 + (this.upgrades.engine - 1) * 0.14;
    const suspMult = 1 + (this.upgrades.suspension - 1) * 0.12;
    const tireGrip = (this.vehicle.baseGrip + (this.upgrades.tires - 1) * 0.12) * this.stage.gripMult;
    const fuelDrainRate = (this.input.gas ? 5.2 : 2.1) / (1 + (this.upgrades.fuel - 1) * 0.18);

    this.fuel = Math.max(0, this.fuel - fuelDrainRate * dt);
    if (this.fuel <= 0 && Math.abs(this.vx) < 35) {
      this.lowFuelTimer += dt;
      if (this.lowFuelTimer > 1.2) {
        this.endGame('fuel');
        return;
      }
    } else {
      this.lowFuelTimer = 0;
    }

    const gravity = this.stage.gravity * this.vehicle.gravityMult;
    this.vy += gravity * dt;

    const wheelBase = 36;
    const rWheel = this.vehicle.wheelRadius;
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);

    const rearX = this.carX - cos * wheelBase;
    const rearY = this.carY - sin * wheelBase + rWheel;
    const frontX = this.carX + cos * wheelBase;
    const frontY = this.carY + sin * wheelBase + rWheel;

    const rearGround = this.terrainHeight(rearX);
    const frontGround = this.terrainHeight(frontX);

    const rearTouch = rearY >= rearGround - 4;
    const frontTouch = frontY >= frontGround - 4;
    const grounded = rearTouch || frontTouch;

    const hasGas = this.input.gas && this.fuel > 0;

    if (grounded) {
      // Air flip check on landing!
      if (!this.wasGrounded && Math.abs(this.airAccumAngle) >= Math.PI * 1.65) {
        const count = Math.max(1, Math.floor(Math.abs(this.airAccumAngle) / (Math.PI * 1.7)));
        this.flips += count;
        const bonus = count * 250;
        this.coinsEarned += bonus;
        this.sfx.playFlip();
        this.stunts.push({
          text: `${this.airAccumAngle < 0 ? 'BACKFLIP' : 'FRONTFLIP'} +${bonus}`,
          x: this.carX,
          y: this.carY - 60,
          alpha: 1.4,
          color: '#fef08a',
        });
      }
      this.airAccumAngle = 0;

      // Suspension spring push-out
      const avgGround = (rearGround + frontGround) * 0.5;
      const targetY = avgGround - rWheel - 14;
      if (this.carY > targetY) {
        const pen = this.carY - targetY;
        this.carY = targetY;
        if (this.vy > 0) this.vy = -this.vy * Math.max(0.05, 0.22 / suspMult);
        this.vy -= pen * 8 * dt;
      }

      const targetSlope = this.terrainSlope(this.carX);
      let diff = targetSlope - this.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.angVel += (diff * 16 * suspMult - this.angVel * 8) * dt;

      // Drive torque & braking
      const topSpd = this.vehicle.baseTopSpeed * engMult;
      const torque = this.vehicle.baseTorque * engMult * tireGrip;
      if (hasGas) {
        const slopeResist = Math.sin(targetSlope) * 140;
        this.vx += (torque - slopeResist) * dt;
        if (this.vx > topSpd) this.vx = topSpd;

        if (Math.random() < 0.55) {
          this.dust.push({
            x: rearX,
            y: rearGround - 2,
            vx: -this.vx * 0.25 - Math.random() * 40,
            vy: -20 - Math.random() * 40,
            alpha: 0.75,
            size: 4 + Math.random() * 5,
            color: this.stage.crustColor,
          });
        }
      } else if (this.input.brake) {
        this.vx -= 440 * tireGrip * dt;
        if (this.vx < -140) this.vx = -140;
      } else {
        this.vx *= 1 - Math.min(0.4, 0.85 * dt);
      }

      // Roof crash check when upside-down on ground
      const normAng = Math.atan2(Math.sin(this.angle), Math.cos(this.angle));
      if (Math.abs(normAng) > 2.15) {
        this.endGame('crashed');
        return;
      }
    } else {
      // Mid-air pitch control via Gas / Brake pedals for stunts!
      const airPitchTorque = 5.4;
      if (hasGas) this.angVel -= airPitchTorque * dt; // lean back (backflip)
      if (this.input.brake) this.angVel += airPitchTorque * dt; // lean forward (frontflip)
      this.angVel *= 1 - Math.min(0.25, 1.2 * dt);
      this.airAccumAngle += this.angVel * dt;
    }

    this.wasGrounded = grounded;
    this.carX = Math.max(80, this.carX + this.vx * dt);
    this.carY += this.vy * dt;
    this.angle += this.angVel * dt;
    this.wheelSpin += (this.vx / Math.max(10, rWheel)) * dt;

    // Pickups & infinite trail spawning
    this.seedPickupsUntil(this.carX + 1800);
    for (const pk of this.pickups) {
      if (pk.collected) continue;
      const py = this.terrainHeight(pk.x) - 28;
      if (Math.hypot(pk.x - this.carX, py - this.carY) < 48) {
        pk.collected = true;
        if (pk.kind === 'coin') {
          this.coinsEarned += pk.value;
          this.sfx.playCoin();
        } else {
          this.fuel = Math.min(100, this.fuel + pk.value);
          this.sfx.playFuel();
          this.stunts.push({
            text: 'FUEL +45%',
            x: this.carX,
            y: this.carY - 48,
            alpha: 1.2,
            color: '#4ade80',
          });
        }
      }
    }

    this.emitHud();
  }

  private endGame(reason: 'crashed' | 'fuel'): void {
    this.gameOver = true;
    this.gameOverReason = reason;
    this.sfx.playCrash();
    const snap = this.buildSnapshot();
    this.onHud(snap);
    this.onEnd(snap);
  }

  private buildSnapshot(): RallyHudSnapshot {
    return {
      distanceM: Math.max(0, Math.round((this.carX - 160) / 14)),
      coinsEarned: this.coinsEarned,
      fuelPct: Math.round(this.fuel),
      speedKmh: Math.round(Math.abs(this.vx) * 0.24),
      flips: this.flips,
      gameOver: this.gameOver,
      gameOverReason: this.gameOverReason,
    };
  }

  private emitHud(): void {
    this.onHud(this.buildSnapshot());
  }

  private render(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const cw = Math.max(320, Math.round(rect.width * dpr));
    const ch = Math.max(320, Math.round(rect.height * dpr));
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
    }

    const ctx = this.ctx;
    ctx.save();
    ctx.scale(dpr, dpr);
    const w = rect.width || 390;
    const h = rect.height || 680;

    // 1. Biome Sky Gradient
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, this.stage.skyTop);
    sky.addColorStop(1, this.stage.skyBot);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Parallax Distant Mountains
    ctx.fillStyle = this.stage.hillColor;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let sx = 0; sx <= w + 30; sx += 30) {
      const worldX = sx + this.carX * 0.25;
      const my = h * 0.52 - Math.sin(worldX * 0.004) * 55 - Math.cos(worldX * 0.009) * 28;
      ctx.lineTo(sx, my);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    const camX = this.carX - w * 0.32;
    const camY = this.carY - h * 0.54;

    ctx.save();
    ctx.translate(-camX, -camY);

    // 2. Procedural Terrain Polygon & Crust Strip
    const startX = Math.floor(camX - 40);
    const endX = Math.ceil(camX + w + 60);
    ctx.fillStyle = this.stage.groundColor;
    ctx.beginPath();
    ctx.moveTo(startX, camY + h + 200);
    for (let x = startX; x <= endX; x += 14) {
      ctx.lineTo(x, this.terrainHeight(x));
    }
    ctx.lineTo(endX, camY + h + 200);
    ctx.closePath();
    ctx.fill();

    // Top Crust Line
    ctx.strokeStyle = this.stage.crustColor;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let x = startX; x <= endX; x += 14) {
      const y = this.terrainHeight(x);
      if (x === startX) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 3. Pickups (Coins & Fuel Cans)
    for (const pk of this.pickups) {
      if (pk.collected || pk.x < startX || pk.x > endX) continue;
      const py = this.terrainHeight(pk.x) - 28 + Math.sin(this.time * 4 + pk.x * 0.02) * 3;
      if (pk.kind === 'coin') {
        ctx.fillStyle = '#fbbf24';
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(pk.x, py, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(pk.x - 3, py - 3, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#ef4444';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(pk.x - 13, py - 15, 26, 30, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('FUEL', pk.x, py + 1);
      }
    }

    // 4. Tire Dust Particles
    for (const p of this.dust) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 5. Off-Road Vehicle & Suspension Wheels
    ctx.save();
    ctx.translate(this.carX, this.carY);
    ctx.rotate(this.angle);

    // Struts
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-34, 4);
    ctx.lineTo(-34, 18);
    ctx.moveTo(34, 4);
    ctx.lineTo(34, 18);
    ctx.stroke();

    // Body
    ctx.fillStyle = this.vehicle.bodyColor;
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-46, 6);
    ctx.lineTo(-42, -16);
    ctx.lineTo(-14, -18);
    ctx.lineTo(-2, -34);
    ctx.lineTo(24, -34);
    ctx.lineTo(42, -14);
    ctx.lineTo(50, -6);
    ctx.lineTo(48, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cab Glass
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(-10, -18);
    ctx.lineTo(0, -30);
    ctx.lineTo(22, -30);
    ctx.lineTo(34, -15);
    ctx.closePath();
    ctx.fill();

    // Roof Light Bar
    ctx.fillStyle = this.vehicle.accentColor;
    ctx.fillRect(2, -39, 18, 5);

    // Knobby Off-Road Wheels
    for (const wx of [-34, 34]) {
      ctx.save();
      ctx.translate(wx, 18);
      ctx.rotate(this.wheelSpin);
      ctx.fillStyle = '#090d16';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, this.vehicle.wheelRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = this.vehicle.accentColor;
      ctx.beginPath();
      ctx.arc(0, 0, this.vehicle.wheelRadius * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-this.vehicle.wheelRadius * 0.45, 0);
      ctx.lineTo(this.vehicle.wheelRadius * 0.45, 0);
      ctx.moveTo(0, -this.vehicle.wheelRadius * 0.45);
      ctx.lineTo(0, this.vehicle.wheelRadius * 0.45);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();

    // 6. Floating Stunt Text
    for (const s of this.stunts) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, s.alpha);
      ctx.font = '800 16px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 4;
      ctx.strokeText(s.text, s.x, s.y);
      ctx.fillStyle = s.color;
      ctx.fillText(s.text, s.x, s.y);
      ctx.restore();
    }

    ctx.restore();
    ctx.restore();
  }
}
