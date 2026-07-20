/**
 * A tiny observable store holding the live run state (distance so far). The
 * background location task writes to it; the Run screen subscribes. Kept module
 * -level so the headless task and the UI share one odometer.
 */
import { Odometer, Fix } from "@racenotes/shared";

type Listener = (meters: number) => void;

const odometer = new Odometer();
const listeners = new Set<Listener>();
let running = false;

export const runStore = {
  get meters() {
    return odometer.totalMeters;
  },
  get miles() {
    return odometer.totalMiles;
  },
  get isRunning() {
    return running;
  },
  start() {
    odometer.reset();
    running = true;
    this.emit();
  },
  stop() {
    running = false;
  },
  /** Called by the location task for each fix. */
  ingest(fix: Fix) {
    if (!running) return;
    odometer.add(fix);
    this.emit();
  },
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  emit() {
    for (const l of listeners) l(odometer.totalMeters);
  },
};
