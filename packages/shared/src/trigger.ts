/**
 * Decides which notes fire, and when, as the runner's distance grows.
 *
 * Notes with an explicit `mile_marker` fire when the odometer crosses that
 * mile. Notes left as "anytime" (null) are spread evenly across the course so
 * they still land at pleasant intervals rather than all at once.
 */

import { METERS_PER_MILE } from "./distance";

export interface NoteLike {
  id: string;
  mile_marker: number | null;
}

export interface ScheduledNote {
  id: string;
  /** The mile at which this note fires. */
  fireMile: number;
  /** True if this note had no mile and was auto-placed across the course. */
  wasAnytime: boolean;
}

/**
 * Assign a firing mile to every note. Explicit miles are kept (clamped to the
 * course); anytime notes are distributed at even fractions of the course.
 */
export function buildSchedule(
  notes: NoteLike[],
  distanceMiles: number,
): ScheduledNote[] {
  const explicit: ScheduledNote[] = [];
  const anytime: NoteLike[] = [];

  for (const n of notes) {
    if (n.mile_marker == null) {
      anytime.push(n);
    } else {
      const mile = Math.min(Math.max(n.mile_marker, 0), distanceMiles);
      explicit.push({ id: n.id, fireMile: mile, wasAnytime: false });
    }
  }

  // Evenly place anytime notes at k/(count+1) of the course (never at 0 or the
  // finish line), preserving their incoming order for a stable spread.
  anytime.forEach((n, i) => {
    const fireMile = (distanceMiles * (i + 1)) / (anytime.length + 1);
    explicit.push({ id: n.id, fireMile, wasAnytime: true });
  });

  return explicit.sort((a, b) => a.fireMile - b.fireMile);
}

/**
 * Stateful scheduler. Call `update(totalMeters)` on each GPS tick; it returns
 * the notes (in order) that just became due since the last call. Each note
 * fires exactly once, even if several thresholds are crossed in one big jump.
 */
export class TriggerScheduler {
  private readonly schedule: ScheduledNote[];
  private nextIndex = 0;

  constructor(notes: NoteLike[], distanceMiles: number) {
    this.schedule = buildSchedule(notes, distanceMiles);
  }

  /** Notes newly due at this distance, in firing order. */
  update(totalMeters: number): ScheduledNote[] {
    const miles = totalMeters / METERS_PER_MILE;
    const due: ScheduledNote[] = [];
    while (
      this.nextIndex < this.schedule.length &&
      this.schedule[this.nextIndex].fireMile <= miles
    ) {
      due.push(this.schedule[this.nextIndex]);
      this.nextIndex += 1;
    }
    return due;
  }

  /** Notes not yet fired, in firing order. */
  get upcoming(): ScheduledNote[] {
    return this.schedule.slice(this.nextIndex);
  }

  /** The full ordered plan (fired and unfired). */
  get plan(): ScheduledNote[] {
    return this.schedule.slice();
  }

  reset(): void {
    this.nextIndex = 0;
  }
}
