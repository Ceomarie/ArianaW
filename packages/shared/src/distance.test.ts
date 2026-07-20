import { describe, it, expect } from "vitest";
import { haversineMeters, Odometer, METERS_PER_MILE, Fix } from "./distance";

describe("haversineMeters", () => {
  it("is ~0 for the same point", () => {
    const p = { latitude: 40.0, longitude: -105.0 };
    expect(haversineMeters(p, p)).toBeCloseTo(0, 6);
  });

  it("matches a known one-degree-of-latitude distance (~111.2km)", () => {
    const d = haversineMeters(
      { latitude: 40.0, longitude: -105.0 },
      { latitude: 41.0, longitude: -105.0 },
    );
    // One degree of latitude is ~111.19 km.
    expect(d).toBeGreaterThan(111_000);
    expect(d).toBeLessThan(111_400);
  });
});

/** Walk due east from a start point, one fix every `stepM` meters. */
function eastwardTrace(
  startLat: number,
  startLon: number,
  stepM: number,
  count: number,
  intervalMs = 1000,
): Fix[] {
  const metersPerDegLon = 111_320 * Math.cos((startLat * Math.PI) / 180);
  const fixes: Fix[] = [];
  for (let i = 0; i < count; i++) {
    fixes.push({
      latitude: startLat,
      longitude: startLon + (i * stepM) / metersPerDegLon,
      accuracy: 5,
      timestamp: i * intervalMs,
    });
  }
  return fixes;
}

describe("Odometer", () => {
  it("accumulates roughly the true distance walked", () => {
    const odo = new Odometer();
    const fixes = eastwardTrace(40, -105, 10, 101); // 100 steps of 10m = 1000m
    for (const f of fixes) odo.add(f);
    expect(odo.totalMeters).toBeGreaterThan(995);
    expect(odo.totalMeters).toBeLessThan(1005);
  });

  it("ignores standing-still jitter below minStep", () => {
    const odo = new Odometer({ minStepMeters: 3 });
    const base = { latitude: 40, longitude: -105, accuracy: 5, timestamp: 0 };
    odo.add(base);
    // ~1m of jitter, many times, should not accumulate.
    for (let i = 1; i < 50; i++) {
      odo.add({
        latitude: 40 + (i % 2 === 0 ? 1e-5 : -1e-5) * 0.1,
        longitude: -105,
        accuracy: 5,
        timestamp: i * 1000,
      });
    }
    expect(odo.totalMeters).toBeLessThan(3);
  });

  it("discards poor-accuracy fixes", () => {
    const odo = new Odometer({ maxAccuracyMeters: 25 });
    odo.add({ latitude: 40, longitude: -105, accuracy: 5, timestamp: 0 });
    // A far, but fuzzy, fix must not count.
    odo.add({ latitude: 40, longitude: -104.99, accuracy: 100, timestamp: 1000 });
    expect(odo.totalMeters).toBe(0);
  });

  it("rejects teleport jumps that imply impossible speed", () => {
    const odo = new Odometer({ maxSpeedMps: 12 });
    odo.add({ latitude: 40, longitude: -105, accuracy: 5, timestamp: 0 });
    // ~850m in 1s => ~850 m/s. Should be rejected but re-anchor.
    odo.add({ latitude: 40, longitude: -104.99, accuracy: 5, timestamp: 1000 });
    expect(odo.totalMeters).toBe(0);
    // Continue walking normally from the new anchor; counts again.
    odo.add({ latitude: 40, longitude: -104.9899, accuracy: 5, timestamp: 2000 });
    expect(odo.totalMeters).toBeGreaterThan(0);
  });

  it("totalMiles converts correctly", () => {
    const odo = new Odometer();
    // Fake a total by walking one mile east.
    const fixes = eastwardTrace(40, -105, 10, Math.round(METERS_PER_MILE / 10) + 1);
    for (const f of fixes) odo.add(f);
    expect(odo.totalMiles).toBeCloseTo(1, 1);
  });
});
