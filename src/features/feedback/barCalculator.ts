export type BarPosition = {
  bar: number | null;
  beat: number | null;
};

export function calculateBarPosition({
  timestampSeconds,
  bpm,
  beatsPerBar,
  barOffset,
}: {
  timestampSeconds: number;
  bpm: number;
  beatsPerBar: number;
  barOffset: number;
}): BarPosition {
  if (bpm <= 0 || beatsPerBar <= 0) {
    return { bar: null, beat: null };
  }

  const secondsPerBeat = 60 / bpm;
  const secondsPerBar = secondsPerBeat * beatsPerBar;
  const musicalSeconds = timestampSeconds - barOffset * secondsPerBar;

  if (musicalSeconds < 0) {
    return { bar: null, beat: null };
  }

  return {
    bar: Math.floor(musicalSeconds / secondsPerBar) + 1,
    beat: Math.floor((musicalSeconds % secondsPerBar) / secondsPerBeat) + 1,
  };
}

