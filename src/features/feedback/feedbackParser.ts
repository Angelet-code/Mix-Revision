import type { ChecklistCategory, ChecklistItem } from "../projects/projectTypes";
import { calculateBarPosition } from "./barCalculator";
import { parseTimecode } from "./timecode";

export type ParsedFeedbackItem = {
  originalTimecode: string;
  seconds: number;
  description: string;
  category: ChecklistCategory;
  fingerprint: string;
};

const linePattern = /^\s*(\d{1,2}:\d{2}|\d{1,2}:\d{1,2}:\d{2}|\d{1,3}\.\d{2})\s*,?\s*(.+?)\s*$/;

export function parseFeedback(text: string): ParsedFeedbackItem[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(linePattern);
      if (!match) {
        return null;
      }

      const timecode = parseTimecode(match[1]);
      if (!timecode) {
        return null;
      }

      const description = match[2].trim();

      return {
        originalTimecode: timecode.original,
        seconds: timecode.seconds,
        description,
        category: inferCategory(description),
        fingerprint: createFeedbackFingerprint(timecode.seconds, description),
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
      bar: position.bar,
      beat: position.beat,
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

export function createFeedbackFingerprint(seconds: number, description: string): string {
  return `${seconds}|${normalizeFeedbackText(description)}`;
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
