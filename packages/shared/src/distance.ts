/**
 * GPS distance accumulation. Framework-agnostic and pure so it can be unit
 * tested without a device — feed it fixes, read the running total in meters.
 */

export const METERS_PER_MILE = 1609.344;

export interface Fix {
  latitude: number;
  longitude: number;
  /** Reported horizontal accuracy in meters (smaller is better). */
  accuracy?: number;
  /** Epoch milliseconds. Used to reject impossible speeds. */
  timestamp?: number;
}

/** Great-circle distance between two points, in meters. */
export function haversineMeters(a: Fix, b: Fix): number {
  const R = 6_371_000; // Earth radius, meters
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface OdometerOptions {
  /** Discard fixes reporting worse accuracy than this (meters). Default 25. */
  maxAccuracyMeters?: number;
  /** Ignore sub-jitter moves smaller than this (meters). Default 3. */
  minStepMeters?: number;
  /** Reject jumps implying a speed above this (m/s). Default 12 (~2:14/mi). */
  maxSpeedMps?: number;
}

/**
 * Accumulates distance from a stream of GPS fixes, filtering the noise that
 * would otherwise inflate the total (poor-accuracy fixes, standing-still
 * jitter, and teleport-like jumps from a lost signal reacquiring).
 */
export class Odometer {
  totalMeters = 0;
  private last: Fix | null = null;
  private readonly maxAccuracy: number;
  private readonly minStep: number;
  private readonly maxSpeed: number;

  constructor(opts: OdometerOptions = {}) {
    this.maxAccuracy = opts.maxAccuracyMeters ?? 25;
    this.minStep = opts.minStepMeters ?? 3;
    this.maxSpeed = opts.maxSpeedMps ?? 12;
  }

  /** Add a fix; returns the updated total distance in meters. */
  add(fix: Fix): number {
    if (fix.accuracy != null && fix.accuracy > this.maxAccuracy) {
      return this.totalMeters; // too fuzzy to trust
    }
    const prev = this.last;
    if (!prev) {
      this.last = fix;
      return this.totalMeters;
    }

    const step = haversineMeters(prev, fix);

    // Reject jitter while standing still.
    if (step < this.minStep) {
      return this.totalMeters;
    }

    // Reject implausible jumps (signal reacquisition). Only when we have a
    // time delta to judge speed against.
    if (prev.timestamp != null && fix.timestamp != null) {
      const dtSec = (fix.timestamp - prev.timestamp) / 1000;
      if (dtSec > 0 && step / dtSec > this.maxSpeed) {
        this.last = fix; // move the anchor but don't count the jump
        return this.totalMeters;
      }
    }

    this.totalMeters += step;
    this.last = fix;
    return this.totalMeters;
  }

  get totalMiles(): number {
    return this.totalMeters / METERS_PER_MILE;
  }

  reset(): void {
    this.totalMeters = 0;
    this.last = null;
  }
}
