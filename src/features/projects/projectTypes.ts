export type ChecklistStatus = "pending" | "done";
export type ChecklistSource = "feedback" | "manual";

export type ChecklistCategory =
  | "voice"
  | "guitar"
  | "acoustic"
  | "drums"
  | "bass"
  | "piano"
  | "synth"
  | "mixbus"
  | "arrangement"
  | "editing"
  | "noise"
  | "other";

export type ChecklistItem = {
  id: string;
  sessionId: string;
  originalTimecode: string;
  seconds: number;
  bar: number | null;
  beat: number | null;
  description: string;
  category: ChecklistCategory;
  status: ChecklistStatus;
  notes: string;
  fingerprint: string;
  source: ChecklistSource;
  createdAt: string;
  updatedAt: string;
};

export type FeedbackSession = {
  id: string;
  name: string;
  sourceText: string;
  importedAt: string;
  notes: string;
};

export type Project = {
  id: string;
  songName: string;
  artistName: string;
  bpm: number;
  barOffset: number;
  beatsPerBar: number;
  sessions: FeedbackSession[];
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: ChecklistItem[];
};

export const categoryLabels: Record<ChecklistCategory, string> = {
  voice: "Voz",
  guitar: "Guitarra",
  acoustic: "Acustica",
  drums: "Bateria",
  bass: "Bajo",
  piano: "Piano",
  synth: "Sinte",
  arrangement: "Arreglo",
  editing: "Edicion",
  noise: "Ruido",
  mixbus: "Mixbus",
  other: "Otro",
};

export const instrumentCategories: ChecklistCategory[] = [
  "voice",
  "guitar",
  "acoustic",
  "drums",
  "bass",
  "piano",
  "synth",
];

export const mixPartCategories: ChecklistCategory[] = [
  "arrangement",
  "editing",
  "noise",
  "mixbus",
  "other",
];
