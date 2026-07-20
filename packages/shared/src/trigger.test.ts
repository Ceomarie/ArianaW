import { describe, it, expect } from "vitest";
import { buildSchedule, TriggerScheduler } from "./trigger";
import { METERS_PER_MILE } from "./distance";

const mile = (m: number) => m * METERS_PER_MILE;

describe("buildSchedule", () => {
  it("keeps explicit miles and sorts ascending", () => {
    const plan = buildSchedule(
      [
        { id: "b", mile_marker: 8 },
        { id: "a", mile_marker: 3 },
      ],
      13.1,
    );
    expect(plan.map((p) => p.id)).toEqual(["a", "b"]);
    expect(plan[0].fireMile).toBe(3);
    expect(plan[1].fireMile).toBe(8);
  });

  it("clamps explicit miles into the course length", () => {
    const plan = buildSchedule([{ id: "x", mile_marker: 99 }], 13.1);
    expect(plan[0].fireMile).toBe(13.1);
  });

  it("spreads anytime notes evenly across the course", () => {
    const plan = buildSchedule(
      [
        { id: "n1", mile_marker: null },
        { id: "n2", mile_marker: null },
        { id: "n3", mile_marker: null },
      ],
      12,
    );
    // 3 notes -> quarters: 3, 6, 9.
    expect(plan.map((p) => p.fireMile)).toEqual([3, 6, 9]);
    expect(plan.every((p) => p.wasAnytime)).toBe(true);
  });

  it("interleaves explicit and anytime notes by mile", () => {
    const plan = buildSchedule(
      [
        { id: "explicit10", mile_marker: 10 },
        { id: "any1", mile_marker: null },
        { id: "any2", mile_marker: null },
      ],
      12,
    );
    // anytime at 4 and 8, explicit at 10.
    expect(plan.map((p) => p.id)).toEqual(["any1", "any2", "explicit10"]);
  });
});

describe("TriggerScheduler", () => {
  it("fires each note exactly once at its mile", () => {
    const sched = new TriggerScheduler(
      [
        { id: "m2", mile_marker: 2 },
        { id: "m8", mile_marker: 8 },
      ],
      13.1,
    );

    const fired: string[] = [];
    // Simulate crossing distance in 0.1-mile ticks.
    for (let d = 0; d <= 9; d += 0.1) {
      for (const n of sched.update(mile(d))) fired.push(n.id);
    }

    expect(fired).toEqual(["m2", "m8"]);
    // A further tick fires nothing new.
    expect(sched.update(mile(13))).toEqual([]);
  });

  it("fires multiple notes crossed in a single big jump, in order", () => {
    const sched = new TriggerScheduler(
      [
        { id: "m1", mile_marker: 1 },
        { id: "m2", mile_marker: 2 },
        { id: "m3", mile_marker: 3 },
      ],
      13.1,
    );
    // Signal reacquired at mile 4 after a gap — all three are now due.
    const due = sched.update(mile(4));
    expect(due.map((d) => d.id)).toEqual(["m1", "m2", "m3"]);
  });

  it("reports upcoming notes shrinking as they fire", () => {
    const sched = new TriggerScheduler(
      [
        { id: "m2", mile_marker: 2 },
        { id: "m5", mile_marker: 5 },
      ],
      13.1,
    );
    expect(sched.upcoming.map((u) => u.id)).toEqual(["m2", "m5"]);
    sched.update(mile(2));
    expect(sched.upcoming.map((u) => u.id)).toEqual(["m5"]);
    sched.update(mile(5));
    expect(sched.upcoming).toEqual([]);
  });
});
