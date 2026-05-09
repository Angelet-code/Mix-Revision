import { describe, expect, it } from "vitest";
import { calculateBarPosition } from "../features/feedback/barCalculator";

describe("calculateBarPosition", () => {
  it("calculates bar and beat for 120 bpm in 4/4", () => {
    expect(
      calculateBarPosition({
        timestampSeconds: 9,
        bpm: 120,
        beatsPerBar: 4,
        barOffset: 0,
      }),
    ).toEqual({ bar: 5, beat: 3 });
  });

  it("applies bar offset before calculating musical position", () => {
    expect(
      calculateBarPosition({
        timestampSeconds: 9,
        bpm: 120,
        beatsPerBar: 4,
        barOffset: 2,
      }),
    ).toEqual({ bar: 3, beat: 3 });
  });

  it("returns empty position when timestamp is before musical start", () => {
    expect(
      calculateBarPosition({
        timestampSeconds: 1,
        bpm: 120,
        beatsPerBar: 4,
        barOffset: 1,
      }),
    ).toEqual({ bar: null, beat: null });
  });
});

