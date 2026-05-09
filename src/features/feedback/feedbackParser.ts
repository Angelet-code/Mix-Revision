import type { ChecklistCategory, ChecklistItem } from "../projects/projectTypes";
import { calculateBarPosition } from "./barCalculator";
import { parseTimecode } from "./timecode";

export type ParsedFeedbackItem = {
  originalTimecode: string;
  seconds: number;
  hasTimecode: boolean;
  description: string;
  category: ChecklistCategory;
  fingerprint: string;
};

const timecodePattern = /(?:\d{1,2}:)?\d{1,2}:\d{2}|\d{1,3}\.\d{2}/g;

export function parseFeedback(text: string): ParsedFeedbackItem[] {
  return text
    .split(/\r?\n/)
    .flatMap(splitFeedbackLine)
    .filter(Boolean)
    .map((rawLine) => {
      const line = cleanFeedbackLine(rawLine);
      const extracted = extractTimecode(line);
      const description = cleanDescription(extracted.description);

      if (!description) {
        return null;
      }

      return {
        originalTimecode: extracted.timecode?.original ?? "Sin tiempo",
        seconds: extracted.timecode?.seconds ?? 0,
        hasTimecode: extracted.timecode !== null,
        description,
        category: inferCategory(description),
        fingerprint: createFeedbackFingerprint(
          extracted.timecode?.seconds ?? null,
          description,
        ),
      };
    })
    .filter((item): item is ParsedFeedbackItem => item !== null);
}

export function createChecklistItems({
  parsedItems,
  bpm,
  beatsPerBar,
  barOffset,
  sessionId,
}: {
  parsedItems: ParsedFeedbackItem[];
  bpm: number;
  beatsPerBar: number;
  barOffset: number;
  sessionId: string;
}): ChecklistItem[] {
  const now = new Date().toISOString();

  return parsedItems.map((item) => {
    const position = calculateBarPosition({
      timestampSeconds: item.seconds,
      bpm,
      beatsPerBar,
      barOffset,
    });

    return {
      id: crypto.randomUUID(),
      sessionId,
      originalTimecode: item.originalTimecode,
      seconds: item.seconds,
      bar: item.hasTimecode ? position.bar : null,
      beat: item.hasTimecode ? position.beat : null,
      description: item.description,
      category: item.category,
      status: "pending",
      notes: "",
      fingerprint: item.fingerprint,
      source: "feedback",
      createdAt: now,
      updatedAt: now,
    };
  });
}

export function createFeedbackFingerprint(seconds: number | null, description: string): string {
  return `${seconds ?? "untimed"}|${normalizeFeedbackText(description)}`;
}

function splitFeedbackLine(line: string): string[] {
  const cleaned = cleanFeedbackLine(line);

  if (!cleaned) {
    return [];
  }

  const matches = [...cleaned.matchAll(timecodePattern)];

  if (matches.length <= 1) {
    return [cleaned];
  }

  return matches
    .map((match, index) => {
      const start = match.index ?? 0;
      const end = matches[index + 1]?.index ?? cleaned.length;

      return cleaned.slice(start, end).trim();
    })
    .filter(Boolean);
}

function cleanFeedbackLine(line: string): string {
  return line
    .trim()
    .replace(/^[-*]+\s*/, "")
    .replace(/^\d+[.)]\s+/, "")
    .trim();
}

function extractTimecode(line: string): {
  timecode: ReturnType<typeof parseTimecode>;
  description: string;
} {
  const match = timecodePattern.exec(line);
  timecodePattern.lastIndex = 0;

  if (!match) {
    return { timecode: null, description: line };
  }

  const timecode = parseTimecode(match[0]);

  if (!timecode) {
    return { timecode: null, description: line };
  }

  const before = cleanTimecodePrefix(line.slice(0, match.index));
  const after = line.slice((match.index ?? 0) + match[0].length).trim();
  const description = [before, after].filter(Boolean).join(" ");

  return { timecode, description };
}

function cleanDescription(description: string): string {
  return description
    .replace(/^[,;:.)\]-]+\s*/, "")
    .replace(/^(?:-|->|=>)\s*/, "")
    .trim();
}

function cleanTimecodePrefix(prefix: string): string {
  return prefix
    .replace(/^[\s:([@-]+/, "")
    .replace(/\b(?:en|sobre|around|at|minuto|min|segundo|seg|time|timestamp|marca|parte|revisar|mirar|check)\s*$/i, "")
    .trim();
}

function normalizeFeedbackText(description: string): string {
  return description
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function inferCategory(description: string): ChecklistCategory {
  const normalized = description.toLowerCase();

  if (normalized.includes("voz") || normalized.includes("melodyne")) {
    return "voice";
  }

  if (normalized.includes("acustica") || normalized.includes("acústica")) {
    return "acoustic";
  }

  if (normalized.includes("guitarra") || normalized.includes("trasteo")) {
    return "guitar";
  }

  if (normalized.includes("bateria") || normalized.includes("baterÃ­a") || normalized.includes("bombo") || normalized.includes("caja")) {
    return "drums";
  }

  if (normalized.includes("bajo")) {
    return "bass";
  }

  if (normalized.includes("piano")) {
    return "piano";
  }

  if (normalized.includes("sinte") || normalized.includes("synth")) {
    return "synth";
  }

  if (normalized.includes("mixbus") || normalized.includes("master") || normalized.includes("bus")) {
    return "mixbus";
  }

  if (normalized.includes("arreglo")) {
    return "arrangement";
  }

  if (normalized.includes("claca") || normalized.includes("ruido")) {
    return "noise";
  }

  return "other";
}
