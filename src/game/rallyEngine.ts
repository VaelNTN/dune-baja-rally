import { RallySound } from '../audio/sound';
import { RallyStageDef, RallyUpgradeKey, RallyVehicleDef } from '../data/rallyCatalog';

export interface RallyHudSnapshot {
  distanceM: number;
  coinsEarned: number;
  fuelPct: number;
  speedKmh: number;
  flips: number;
  airTimeSec: number;
  lowFuel: boolean;
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
  kind: 'dust' | 'exhaust' | 'sparkle';
}

interface FloatingStunt {
  text: string;
  x: number;
  y: number;
  alpha: number;
  color: string;
}

function drawCoilStrut(
  ctx: CanvasRenderingContext2D,
  x: number,
  yTop: number,
  yBot: number,
  accentColor: string
): void {
  // Shock piston
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, yTop);
  ctx.lineTo(x, yBot);
  ctx.stroke();

  // Animated coil spring zig-zag compressing with suspension travel
  const coils = 4;
  const span = Math.max(6, yBot - yTop - 4);
  const step = span / coils;
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(x, yTop + 2);
  for (let i = 0; i < coils; i++) {
    const dir = i % 2 === 0 ? -5 : 5;
    ctx.lineTo(x + dir, yTop + 2 + step * (i + 0.5));
  }
  ctx.lineTo(x, yBot - 2);
  ctx.stroke();
}

function drawHelmetedDriver(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  helmetColor: string,
  visorColor = '#38bdf8',
  isAstronaut = false
): void {
  // Torso / shoulders
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(x - 7, y + 4, 14, 10, 4);
  ctx.fill();

  // Helmet
  ctx.fillStyle = isAstronaut ? '#f8fafc' : helmetColor;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y - 3, isAstronaut ? 8.5 : 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Visor facing right (+X)
  ctx.fillStyle = isAstronaut ? '#fbbf24' : visorColor;
  ctx.beginPath();
  ctx.roundRect(x + 1, y - 6.5, 7, 5.5, 2.5);
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Helmet highlight
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.arc(x - 2.5, y - 6, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawKnobbyWheel(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  radius: number,
  wheelSpin: number,
  accentColor: string
): void {
  ctx.save();
  ctx.translate(wx, wy);
  ctx.rotate(wheelSpin);

  // Outer tire tread lugs
  ctx.fillStyle = '#090d16';
  const lugCount = 10;
  for (let i = 0; i < lugCount; i++) {
    const a = (i * Math.PI * 2) / lugCount;
    ctx.save();
    ctx.rotate(a);
    ctx.fillRect(radius - 2.5, -2.5, 4, 5);
    ctx.restore();
  }

  // Main tire ring
  ctx.fillStyle = '#111827';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, radius - 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Rim hub
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.48, 0, Math.PI * 2);
  ctx.fill();

  // Spokes
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.48, 0);
  ctx.lineTo(radius * 0.48, 0);
  ctx.moveTo(0, -radius * 0.48);
  ctx.lineTo(0, radius * 0.48);
  ctx.stroke();

  // Center lug nut
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawRallyVehicle(
  ctx: CanvasRenderingContext2D,
  vehicle: RallyVehicleDef,
  wheelSpin: number,
  rearComp = 0,
  frontComp = 0,
  time = 0
): void {
  const rWheel = vehicle.wheelRadius;
  const rearWy = 20 - Math.max(-4, Math.min(10, rearComp));
  const frontWy = 20 - Math.max(-4, Math.min(10, frontComp));
  const midWy = 20 - Math.max(-4, Math.min(10, (rearComp + frontComp) * 0.5));

  if (vehicle.id === 'baja_buggy') {
    // 1. SANDHOPPER BUGGY: Open tubular roll-cage desert buggy
    drawCoilStrut(ctx, -34, 0, rearWy, vehicle.accentColor);
    drawCoilStrut(ctx, 35, 0, frontWy, vehicle.accentColor);

    // Rear exposed twin exhaust & engine block
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-48, -12, 16, 14, 3);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-48, -8);
    ctx.lineTo(-56, -13);
    ctx.moveTo(-48, -3);
    ctx.lineTo(-55, -7);
    ctx.stroke();

    // Driver inside open cage
    drawHelmetedDriver(ctx, -4, -18, '#fef08a', '#0284c7');

    // Steering wheel
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(14, -14);
    ctx.lineTo(8, -18);
    ctx.stroke();

    // Lower chassis tub & sloped buggy nose
    ctx.fillStyle = vehicle.bodyColor;
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-42, 7);
    ctx.lineTo(-34, -8);
    ctx.lineTo(14, -8);
    ctx.lineTo(48, -3);
    ctx.lineTo(50, 6);
    ctx.lineTo(-42, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Accent racing stripe on nose
    ctx.fillStyle = vehicle.accentColor;
    ctx.fillRect(16, -5, 28, 4);

    // Tubular Roll-Cage bars
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-34, -8);
    ctx.lineTo(-22, -32);
    ctx.lineTo(14, -32);
    ctx.lineTo(32, -6);
    ctx.moveTo(-22, -32);
    ctx.lineTo(-12, -8);
    ctx.moveTo(14, -32);
    ctx.lineTo(10, -8);
    ctx.stroke();

    // Roof amber spotlight bar
    ctx.fillStyle = vehicle.accentColor;
    ctx.beginPath();
    ctx.roundRect(4, -37, 12, 5, 2);
    ctx.fill();

    drawKnobbyWheel(ctx, -34, rearWy, rWheel, wheelSpin, vehicle.accentColor);
    drawKnobbyWheel(ctx, 35, frontWy, rWheel, wheelSpin, vehicle.accentColor);
  } else if (vehicle.id === 'timber_4x4') {
    // 2. TIMBER 4x4 RIG: Lifted off-road pickup with bed & spare tire
    drawCoilStrut(ctx, -35, 2, rearWy, '#fbbf24');
    drawCoilStrut(ctx, 36, 2, frontWy, '#fbbf24');

    // Angled spare tire mounted inside pickup bed
    ctx.save();
    ctx.translate(-30, -18);
    ctx.rotate(-0.45);
    ctx.fillStyle = '#090d16';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Rollbar behind cab
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-15, -14);
    ctx.lineTo(-15, -34);
    ctx.lineTo(-26, -14);
    ctx.stroke();

    // Pickup body + cargo bed + tall boxy cab + hood
    ctx.fillStyle = vehicle.bodyColor;
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(-48, 8);
    ctx.lineTo(-48, -15);
    ctx.lineTo(-14, -15);
    ctx.lineTo(-12, -35);
    ctx.lineTo(18, -35);
    ctx.lineTo(25, -16);
    ctx.lineTo(48, -14);
    ctx.lineTo(50, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cab window cutout + helmeted driver
    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    ctx.beginPath();
    ctx.moveTo(-9, -16);
    ctx.lineTo(-8, -31);
    ctx.lineTo(15, -31);
    ctx.lineTo(20, -16);
    ctx.closePath();
    ctx.fill();
    drawHelmetedDriver(ctx, 3, -22, '#f97316', '#38bdf8');

    // Front steel bullbar bumper
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(49, 6);
    ctx.lineTo(56, 2);
    ctx.lineTo(54, -12);
    ctx.lineTo(48, -12);
    ctx.stroke();

    // Side body stripe
    ctx.fillStyle = vehicle.accentColor;
    ctx.fillRect(-44, -6, 88, 4);

    drawKnobbyWheel(ctx, -35, rearWy, rWheel, wheelSpin, vehicle.accentColor);
    drawKnobbyWheel(ctx, 36, frontWy, rWheel, wheelSpin, vehicle.accentColor);
  } else if (vehicle.id === 'trophy_truck') {
    // 3. BAJA TROPHY TRUCK: Wide-fender desert pro stadium truck
    drawCoilStrut(ctx, -36, 0, rearWy, '#fde047');
    drawCoilStrut(ctx, 37, 0, frontWy, '#fde047');

    // Rear angled desert spare tire deck + rear spoiler lip
    ctx.fillStyle = '#090d16';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-45, -24, 18, 12, 4);
    ctx.fill();
    ctx.stroke();

    // Aggressive flared stadium truck silhouette
    ctx.fillStyle = vehicle.bodyColor;
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(-50, 6);
    ctx.lineTo(-47, -18);
    ctx.lineTo(-18, -20);
    ctx.lineTo(-4, -36);
    ctx.lineTo(22, -36);
    ctx.lineTo(34, -18);
    ctx.lineTo(52, -12);
    ctx.lineTo(53, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Sculpted hood scoop
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.moveTo(31, -18);
    ctx.lineTo(43, -21);
    ctx.lineTo(45, -14);
    ctx.closePath();
    ctx.fill();

    // Cab window + helmeted driver
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.moveTo(-10, -19);
    ctx.lineTo(-1, -32);
    ctx.lineTo(20, -32);
    ctx.lineTo(29, -18);
    ctx.closePath();
    ctx.fill();
    drawHelmetedDriver(ctx, 8, -23, '#fde047', '#ef4444');

    // Racing number plate & lightning stripe
    ctx.fillStyle = vehicle.accentColor;
    ctx.beginPath();
    ctx.moveTo(-42, -5);
    ctx.lineTo(45, -9);
    ctx.lineTo(45, -3);
    ctx.lineTo(-42, 1);
    ctx.closePath();
    ctx.fill();

    // Bright LED roof bar
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(10, -40, 14, 5, 2);
    ctx.fill();
    ctx.stroke();

    drawKnobbyWheel(ctx, -36, rearWy, rWheel, wheelSpin, vehicle.accentColor);
    drawKnobbyWheel(ctx, 37, frontWy, rWheel, wheelSpin, vehicle.accentColor);
  } else {
    // 4. LUNAR JUMP CRAWLER: 6-Wheel Articulated Sci-Fi Rover with Satellite Dish
    drawCoilStrut(ctx, -38, 0, rearWy, '#38bdf8');
    drawCoilStrut(ctx, 0, 2, midWy, '#38bdf8');
    drawCoilStrut(ctx, 38, 0, frontWy, '#38bdf8');

    // Parabolic Satellite Dish mounted on rear deck (slowly scans)
    ctx.save();
    ctx.translate(-34, -20);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.lineTo(-2, -4);
    ctx.stroke();
    ctx.rotate(-0.55 + Math.sin(time * 2.2) * 0.16);
    ctx.fillStyle = '#e2e8f0';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -8, 12, Math.PI * 0.15, Math.PI * 0.85, false);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(0, -18);
    ctx.stroke();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(0, -19, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Glowing cyan ion thruster nozzle at rear
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.roundRect(-52, -10, 10, 11, 3);
    ctx.fill();
    ctx.fillStyle = '#7dd3fc';
    ctx.beginPath();
    ctx.arc(-53, -4.5, 3.5 + Math.sin(time * 18) * 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Pressurized glass bubble dome + astronaut driver
    drawHelmetedDriver(ctx, 10, -21, '#f8fafc', '#fbbf24', true);
    ctx.fillStyle = 'rgba(125, 211, 252, 0.28)';
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(10, -15, 22, Math.PI, 0, false);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Sci-fi hexagonal hull chassis
    ctx.fillStyle = vehicle.bodyColor;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-46, 6);
    ctx.lineTo(-42, -14);
    ctx.lineTo(32, -14);
    ctx.lineTo(50, -3);
    ctx.lineTo(46, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Hull accent panels
    ctx.fillStyle = vehicle.accentColor;
    ctx.fillRect(-34, -9, 62, 5);

    // 6-Wheel Articulated Bogie (3 visible side wheels!)
    const lunarR = Math.max(16, rWheel - 5);
    drawKnobbyWheel(ctx, -38, rearWy, lunarR, wheelSpin, vehicle.accentColor);
    drawKnobbyWheel(ctx, 0, midWy, lunarR, wheelSpin, vehicle.accentColor);
    drawKnobbyWheel(ctx, 38, frontWy, lunarR, wheelSpin, vehicle.accentColor);
  }
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
  private paused = false;

  // Physics State
  private carX = 160;
  private carY = 0;
  private vx = 0;
  private vy = 0;
  private angle = 0;
  private angVel = 0;
  private wheelSpin = 0;
  private rearComp = 0;
  private frontComp = 0;
  private fuel = 100;
  private coinsEarned = 0;
  private flips = 0;
  private airAccumAngle = 0;
  private airTimeSec = 0;
  private wasGrounded = true;
  private gameOver = false;
  private gameOverReason: 'crashed' | 'fuel' | null = null;
  private lowFuelTimer = 0;
  private lowFuelBeepCd = 0;

  private pickups: TrailPickup[] = [];
  private dust: DustParticle[] = [];
  private stunts: FloatingStunt[] = [];
  private nextCoinSpawnX = 360;
  private nextFuelSpawnX = 620;

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

    this.carY = this.terrainHeight(this.carX) - this.vehicle.wheelRadius - 14;
    this.seedPickupsUntil(3200);
  }

  public setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) {
      this.sfx.stopEngine();
    } else {
      this.lastTs = performance.now();
    }
  }

  public isPaused(): boolean {
    return this.paused;
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
    // Deterministic fuel canisters every 580px so no unfair dry stretches ever happen
    while (this.nextFuelSpawnX < maxX) {
      this.pickups.push({
        x: this.nextFuelSpawnX,
        kind: 'fuel',
        value: 45,
        collected: false,
      });
      this.nextFuelSpawnX += 580;
    }

    // Coin clusters along crests and rollers
    while (this.nextCoinSpawnX < maxX) {
      const count = 4 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const cx = this.nextCoinSpawnX + i * 48;
        // Avoid overlapping right on top of a fuel can
        const nearFuel = this.pickups.some(
          (p) => p.kind === 'fuel' && Math.abs(p.x - cx) < 36
        );
        if (!nearFuel) {
          this.pickups.push({
            x: cx,
            kind: 'coin',
            value: 25,
            collected: false,
          });
        }
      }
      this.nextCoinSpawnX += 340 + Math.random() * 140;
    }
  }

  public start(): void {
    if (this.rafId !== null) return;
    this.lastTs = performance.now();
    const tick = (ts: number) => {
      const dt = Math.min(0.035, Math.max(0.001, (ts - this.lastTs) / 1000));
      this.lastTs = ts;
      if (!this.paused) {
        this.update(dt);
      }
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
    this.sfx.stopEngine();
  }

  private update(dt: number): void {
    this.time += dt;

    for (let i = this.dust.length - 1; i >= 0; i--) {
      const p = this.dust[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'exhaust') {
        p.size += 8 * dt;
        p.alpha -= dt * 1.15;
      } else if (p.kind === 'sparkle') {
        p.vy += 120 * dt;
        p.alpha -= dt * 2.1;
      } else {
        p.alpha -= dt * 1.4;
      }
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
    const fuelDrainRate = (this.input.gas ? 5.0 : 2.0) / (1 + (this.upgrades.fuel - 1) * 0.18);

    this.fuel = Math.max(0, this.fuel - fuelDrainRate * dt);
    if (this.fuel > 0 && this.fuel < 25) {
      this.lowFuelBeepCd -= dt;
      if (this.lowFuelBeepCd <= 0) {
        this.lowFuelBeepCd = 0.85;
        this.sfx.playLowFuel();
      }
    } else {
      this.lowFuelBeepCd = 0;
    }

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

    const rearPen = rearY - (rearGround - 4);
    const frontPen = frontY - (frontGround - 4);
    const rearTouch = rearPen >= 0;
    const frontTouch = frontPen >= 0;
    const grounded = rearTouch || frontTouch;

    // Smooth suspension strut compression visuals
    const targetRearComp = rearTouch ? Math.min(10, 2 + rearPen * 0.45) : -3;
    const targetFrontComp = frontTouch ? Math.min(10, 2 + frontPen * 0.45) : -3;
    this.rearComp += (targetRearComp - this.rearComp) * Math.min(1, 18 * dt);
    this.frontComp += (targetFrontComp - this.frontComp) * Math.min(1, 18 * dt);

    const hasGas = this.input.gas && this.fuel > 0;

    if (grounded) {
      // Stunt landing bonuses (Flips + Air Time!)
      if (!this.wasGrounded) {
        const landedFlips =
          Math.abs(this.airAccumAngle) >= Math.PI * 1.6
            ? Math.max(1, Math.floor(Math.abs(this.airAccumAngle) / (Math.PI * 1.65)))
            : 0;
        if (landedFlips > 0) {
          this.flips += landedFlips;
          const bonus = landedFlips * 250;
          this.coinsEarned += bonus;
          this.sfx.playFlip();
          this.stunts.push({
            text: `${this.airAccumAngle < 0 ? 'BACKFLIP' : 'FRONTFLIP'}${landedFlips > 1 ? ` x${landedFlips}` : ''} +${bonus}`,
            x: this.carX,
            y: this.carY - 62,
            alpha: 1.5,
            color: '#fef08a',
          });
        }
        if (this.airTimeSec >= 0.72) {
          const airBonus = Math.round(this.airTimeSec * 110);
          this.coinsEarned += airBonus;
          if (landedFlips === 0) this.sfx.playAirBonus();
          this.stunts.push({
            text: `BIG AIR ${this.airTimeSec.toFixed(1)}s +${airBonus}`,
            x: this.carX,
            y: this.carY - (landedFlips > 0 ? 86 : 56),
            alpha: 1.4,
            color: '#38bdf8',
          });
        }
      }
      this.airAccumAngle = 0;
      this.airTimeSec = 0;

      const avgGround = (rearGround + frontGround) * 0.5;
      const targetY = avgGround - rWheel - 14;
      const targetSlope = this.terrainSlope(this.carX);
      const aheadSlope = this.terrainSlope(this.carX + 26);

      // CRITICAL CREST LAUNCH PHYSICS:
      // Uphill has negative slope (Y decreases upward in canvas coords), so vx * sin(slope) < 0 (upward velocity!).
      const slopeVy = this.vx * Math.sin(targetSlope);

      if (this.carY > targetY) {
        const pen = this.carY - targetY;
        this.carY = targetY;
        if (this.vy > 0) {
          this.vy = -this.vy * Math.max(0.05, 0.22 / suspMult);
        }
        this.vy -= pen * 8 * dt;
      }

      // Impart real slope-tangent upward velocity when climbing & cresting hills at speed!
      if (this.vx > 85 && targetSlope < -0.04) {
        const isCresting = aheadSlope > targetSlope + 0.05;
        const launchBoost = isCresting ? 1.24 : 1.06;
        const desiredVy = slopeVy * launchBoost;
        if (desiredVy < this.vy) {
          this.vy = desiredVy;
        }
      }

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

        // Tire dust kickup
        if (Math.random() < 0.55) {
          this.dust.push({
            x: rearX,
            y: rearGround - 2,
            vx: -this.vx * 0.25 - Math.random() * 40,
            vy: -20 - Math.random() * 40,
            alpha: 0.75,
            size: 4 + Math.random() * 5,
            color: this.stage.crustColor,
            kind: 'dust',
          });
        }
        // Exhaust puffs from tailpipe
        if (Math.random() < 0.35) {
          const exX = this.carX - cos * 48 - sin * 6;
          const exY = this.carY - sin * 48 + cos * 6;
          this.dust.push({
            x: exX,
            y: exY,
            vx: -cos * 55 - Math.random() * 25,
            vy: -25 - Math.random() * 25,
            alpha: 0.55,
            size: 3.5 + Math.random() * 2.5,
            color: this.vehicle.id === 'lunar_rover' ? '#7dd3fc' : '#e2e8f0',
            kind: 'exhaust',
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
      this.airTimeSec += dt;
      const airPitchTorque = 5.8;
      if (hasGas) this.angVel -= airPitchTorque * dt; // lean back (backflip)
      if (this.input.brake) this.angVel += airPitchTorque * dt; // lean forward (frontflip)
      this.angVel *= 1 - Math.min(0.25, 1.15 * dt);
      this.airAccumAngle += this.angVel * dt;

      if (hasGas && Math.random() < 0.25) {
        const exX = this.carX - cos * 48;
        const exY = this.carY - sin * 48;
        this.dust.push({
          x: exX,
          y: exY,
          vx: -cos * 45,
          vy: -15,
          alpha: 0.45,
          size: 3.5,
          color: this.vehicle.id === 'lunar_rover' ? '#38bdf8' : '#cbd5e1',
          kind: 'exhaust',
        });
      }
    }

    this.wasGrounded = grounded;
    this.carX = Math.max(80, this.carX + this.vx * dt);
    this.carY += this.vy * dt;
    this.angle += this.angVel * dt;
    this.wheelSpin += (this.vx / Math.max(10, rWheel)) * dt;

    // Pickups, infinite trail spawning & pruning passed pickups behind camera
    this.seedPickupsUntil(this.carX + 1800);
    const pruneBeforeX = this.carX - 900;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      if (pk.collected || pk.x < pruneBeforeX) {
        this.pickups.splice(i, 1);
        continue;
      }
      const py = this.terrainHeight(pk.x) - 28;
      if (Math.hypot(pk.x - this.carX, py - this.carY) < 48) {
        pk.collected = true;
        if (pk.kind === 'coin') {
          this.coinsEarned += pk.value;
          this.sfx.playCoin();
          for (let s = 0; s < 8; s++) {
            const a = (Math.PI * 2 * s) / 8 + Math.random() * 0.3;
            this.dust.push({
              x: pk.x,
              y: py,
              vx: Math.cos(a) * (60 + Math.random() * 55),
              vy: Math.sin(a) * (60 + Math.random() * 55) - 35,
              alpha: 0.95,
              size: 3 + Math.random() * 2.5,
              color: s % 2 === 0 ? '#fde047' : '#ffffff',
              kind: 'sparkle',
            });
          }
        } else {
          this.fuel = Math.min(100, this.fuel + pk.value);
          this.sfx.playFuel();
          for (let s = 0; s < 10; s++) {
            const a = (Math.PI * 2 * s) / 10;
            this.dust.push({
              x: pk.x,
              y: py,
              vx: Math.cos(a) * (70 + Math.random() * 50),
              vy: Math.sin(a) * (70 + Math.random() * 50) - 40,
              alpha: 0.95,
              size: 3.5,
              color: s % 2 === 0 ? '#4ade80' : '#ffffff',
              kind: 'sparkle',
            });
          }
          this.stunts.push({
            text: 'FUEL +45%',
            x: this.carX,
            y: this.carY - 48,
            alpha: 1.2,
            color: '#4ade80',
          });
        }
        this.pickups.splice(i, 1);
      }
    }

    // Cap particle pool
    if (this.dust.length > 180) {
      this.dust.splice(0, this.dust.length - 180);
    }

    this.sfx.updateEngine(
      Math.abs(this.vx) / 480,
      hasGas,
      !grounded,
      !this.gameOver && !this.paused
    );

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
      airTimeSec: this.airTimeSec,
      lowFuel: this.fuel > 0 && this.fuel < 25,
      gameOver: this.gameOver,
      gameOverReason: this.gameOverReason,
    };
  }

  private emitHud(): void {
    this.onHud(this.buildSnapshot());
  }

  private drawBiomeProps(ctx: CanvasRenderingContext2D, startX: number, endX: number): void {
    const spacing = 190;
    const firstSlot = Math.floor(startX / spacing);
    const lastSlot = Math.ceil(endX / spacing);

    for (let slot = firstSlot; slot <= lastSlot; slot++) {
      if (slot < 1) continue;
      // Deterministic hash per slot
      const hash = Math.abs(Math.sin(slot * 127.1 + this.stage.id.charCodeAt(0) * 31.7) * 43758.5453);
      const frac = hash - Math.floor(hash);
      if (frac < 0.28) continue; // leave natural gaps

      const px = slot * spacing + (frac - 0.5) * 85;
      const py = this.terrainHeight(px);
      const variant = Math.floor(frac * 10) % 3;

      ctx.save();
      ctx.translate(px, py);

      if (this.stage.id === 'red_rock') {
        if (variant === 0 || variant === 1) {
          // Saguaro Cactus
          const h = 34 + (variant * 12);
          ctx.fillStyle = '#15803d';
          ctx.strokeStyle = '#14532d';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(-5, -h, 10, h + 4, 5);
          ctx.fill();
          ctx.stroke();
          // Arms
          ctx.beginPath();
          ctx.roundRect(-16, -h * 0.65, 11, 6, 3);
          ctx.roundRect(-16, -h * 0.9, 6, h * 0.3, 3);
          ctx.roundRect(5, -h * 0.5, 11, 6, 3);
          ctx.roundRect(10, -h * 0.78, 6, h * 0.32, 3);
          ctx.fill();
        } else {
          // Desert Mesa Rock
          ctx.fillStyle = '#9a3412';
          ctx.beginPath();
          ctx.moveTo(-22, 4);
          ctx.lineTo(-14, -18);
          ctx.lineTo(10, -22);
          ctx.lineTo(24, 4);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#c2410c';
          ctx.beginPath();
          ctx.moveTo(-12, -18);
          ctx.lineTo(10, -22);
          ctx.lineTo(6, -6);
          ctx.closePath();
          ctx.fill();
        }
      } else if (this.stage.id === 'pine_mud') {
        if (variant !== 2) {
          // Layered Evergreen Pine Tree
          ctx.fillStyle = '#78350f';
          ctx.fillRect(-4, -14, 8, 18);
          ctx.fillStyle = variant === 0 ? '#166534' : '#15803d';
          for (let tier = 0; tier < 3; tier++) {
            const tw = 24 - tier * 5;
            const ty = -12 - tier * 15;
            ctx.beginPath();
            ctx.moveTo(0, ty - 22);
            ctx.lineTo(-tw, ty);
            ctx.lineTo(tw, ty);
            ctx.closePath();
            ctx.fill();
          }
        } else {
          // Mossy Forest Boulder
          ctx.fillStyle = '#57534e';
          ctx.beginPath();
          ctx.ellipse(0, -6, 18, 11, 0, Math.PI, 0, false);
          ctx.fill();
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.ellipse(-4, -12, 10, 4, -0.2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (this.stage.id === 'glacier') {
        // Crystalline Blue Ice Spires / Icicles
        ctx.fillStyle = variant === 0 ? '#7dd3fc' : '#38bdf8';
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-14, 4);
        ctx.lineTo(-4, -34 - variant * 8);
        ctx.lineTo(6, -12);
        ctx.lineTo(14, -24);
        ctx.lineTo(18, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        // Volcano Ridge: Glowing Lava Vent or Obsidian Basalt Pillar
        if (variant === 0) {
          ctx.fillStyle = '#3f3f46';
          ctx.beginPath();
          ctx.moveTo(-18, 4);
          ctx.lineTo(-9, -16);
          ctx.lineTo(9, -16);
          ctx.lineTo(18, 4);
          ctx.closePath();
          ctx.fill();
          const glow = 0.65 + 0.35 * Math.sin(this.time * 5 + slot);
          ctx.fillStyle = `rgba(249, 115, 22, ${glow})`;
          ctx.beginPath();
          ctx.ellipse(0, -16, 8, 3.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(253, 224, 71, ${glow})`;
          ctx.beginPath();
          ctx.arc(Math.sin(this.time * 4 + slot) * 4, -26 - ((this.time * 20 + slot * 7) % 16), 3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#18181b';
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-12, 4);
          ctx.lineTo(-8, -32);
          ctx.lineTo(4, -38);
          ctx.lineTo(12, 4);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }

      ctx.restore();
    }
  }

  private drawMilestonePosts(ctx: CanvasRenderingContext2D, startX: number, endX: number): void {
    const fixedMilestones = [100, 250, 500, 750, 1000];
    const maxMeter = Math.ceil((endX - 160) / 14) + 50;
    const milestones = [...fixedMilestones];
    for (let m = 1500; m <= maxMeter; m += 500) {
      milestones.push(m);
    }

    for (const meters of milestones) {
      const mx = 160 + meters * 14;
      if (mx < startX - 40 || mx > endX + 40) continue;
      const my = this.terrainHeight(mx);
      const passed = this.carX >= mx;

      ctx.save();
      ctx.translate(mx, my);

      // Post pole
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-2.5, -54, 5, 58);

      // Signboard
      ctx.fillStyle = passed ? '#16a34a' : '#1e293b';
      ctx.strokeStyle = passed ? '#fde047' : '#fb923c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-24, -64, 48, 22, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${meters}m`, 0, -53);

      ctx.restore();
    }
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
    const isLandscape = w > h;

    // 1. Biome Sky Gradient
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, this.stage.skyTop);
    sky.addColorStop(1, this.stage.skyBot);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Sun / Moon disc in sky
    ctx.save();
    ctx.fillStyle =
      this.stage.id === 'glacier'
        ? 'rgba(224, 242, 254, 0.45)'
        : this.stage.id === 'volcano'
          ? 'rgba(251, 146, 60, 0.35)'
          : 'rgba(254, 240, 138, 0.4)';
    ctx.beginPath();
    ctx.arc(w * 0.78, h * 0.22, isLandscape ? 32 : 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Parallax Distant Mountains
    ctx.fillStyle = this.stage.hillColor;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let sx = 0; sx <= w + 30; sx += 30) {
      const worldX = sx + this.carX * 0.25;
      const my = h * (isLandscape ? 0.44 : 0.52) - Math.sin(worldX * 0.004) * 52 - Math.cos(worldX * 0.009) * 26;
      ctx.lineTo(sx, my);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Raise camera vertical offset in landscape so compact pedals NEVER obscure upcoming hills or fuel cans!
    const camX = this.carX - w * (isLandscape ? 0.26 : 0.32);
    const camY = this.carY - h * (isLandscape ? 0.43 : 0.54);

    ctx.save();
    ctx.translate(-camX, -camY);

    const startX = Math.floor(camX - 40);
    const endX = Math.ceil(camX + w + 60);

    // 1b. Background Biome Props planted behind road crust
    this.drawBiomeProps(ctx, startX, endX);

    // 1c. Distance Milestone Posts (100m, 250m, 500m...)
    this.drawMilestonePosts(ctx, startX, endX);

    // 2. Procedural Terrain Polygon & Layered Soil Strata Shading
    ctx.fillStyle = this.stage.groundColor;
    ctx.beginPath();
    ctx.moveTo(startX, camY + h + 260);
    for (let x = startX; x <= endX; x += 14) {
      ctx.lineTo(x, this.terrainHeight(x));
    }
    ctx.lineTo(endX, camY + h + 260);
    ctx.closePath();
    ctx.fill();

    // Subsurface Soil Strata Bands (2 layered depth bands)
    for (const [offsetY, alpha] of [
      [26, 0.2],
      [64, 0.32],
    ] as Array<[number, number]>) {
      ctx.fillStyle = `rgba(9, 13, 22, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(startX, camY + h + 260);
      for (let x = startX; x <= endX; x += 18) {
        const wave = Math.sin(x * 0.015 + offsetY) * 6;
        ctx.lineTo(x, this.terrainHeight(x) + offsetY + wave);
      }
      ctx.lineTo(endX, camY + h + 260);
      ctx.closePath();
      ctx.fill();
    }

    // Embedded subsurface pebbles
    const pebbleSlotStart = Math.floor(startX / 70);
    const pebbleSlotEnd = Math.ceil(endX / 70);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let ps = pebbleSlotStart; ps <= pebbleSlotEnd; ps++) {
      const px = ps * 70 + ((ps * 37) % 45);
      const py = this.terrainHeight(px) + 22 + Math.abs((ps * 29) % 58);
      ctx.beginPath();
      ctx.ellipse(px, py, 7 + Math.abs(ps % 5), 4, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

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
        // High-visibility jerrycan with handle
        ctx.fillStyle = '#ef4444';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(pk.x - 13, py - 15, 26, 30, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fde047';
        ctx.fillRect(pk.x - 6, py - 19, 12, 4);
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 9.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('FUEL', pk.x, py + 1);
      }
    }

    // 4. Tire Dust, Exhaust Puffs & Coin Sparkles
    for (const p of this.dust) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 5. Distinct Off-Road Vehicle with Animated Suspension & Helmeted Driver
    ctx.save();
    ctx.translate(this.carX, this.carY);
    ctx.rotate(this.angle);
    drawRallyVehicle(ctx, this.vehicle, this.wheelSpin, this.rearComp, this.frontComp, this.time);
    ctx.restore();

    // 6. Floating Stunt Text
    for (const s of this.stunts) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, s.alpha);
      ctx.font = '800 16px system-ui, sans-serif';
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
