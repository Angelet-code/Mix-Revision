export type ParsedTimecode = {
  original: string;
  seconds: number;
};

const colonTimecode = /^(\d{1,2}:)?\d{1,2}:\d{2}$/;
const dottedMinuteSecond = /^\d{1,3}\.\d{2}$/;

export function parseTimecode(input: string): ParsedTimecode | null {
  const value = input.trim().replace(/,$/, "");

  if (colonTimecode.test(value)) {
    const parts = value.split(":").map(Number);
    const seconds =
      parts.length === 3
        ? parts[0] * 3600 + parts[1] * 60 + parts[2]
        : parts[0] * 60 + parts[1];

    return { original: value, seconds };
  }

  if (dottedMinuteSecond.test(value)) {
    const [minutes, seconds] = value.split(".").map(Number);

    return {
      original: value,
      seconds: minutes * 60 + seconds,
    };
  }

  return null;
}

export function formatDuration(seconds: number): string {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(wholeSeconds / 60);
  const remainder = wholeSeconds % 60;

  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

