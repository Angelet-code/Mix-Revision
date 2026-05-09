import type { Project } from "./projectTypes";
import { createFeedbackFingerprint } from "../feedback/feedbackParser";

const storageKey = "mixing-checklist:v1";
const legacySessionId = "legacy-session";

export function loadProjects(): Project[] {
  const stored = localStorage.getItem(storageKey);
  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.map(migrateProject) : [];
  } catch {
    return [];
  }
}

export function saveProjects(projects: Project[]): void {
  localStorage.setItem(storageKey, JSON.stringify(projects));
}

function migrateProject(project: Project): Project {
  const items = Array.isArray(project.items) ? project.items : [];
  const hasSessions = Array.isArray(project.sessions);
  const sessions = hasSessions
    ? project.sessions
    : items.length > 0
      ? [
          {
            id: legacySessionId,
            name: "Feedback importado",
            sourceText: "",
            importedAt: project.createdAt,
            notes: "Sesion creada automaticamente desde datos anteriores.",
          },
        ]
      : [];

  return {
    ...project,
    sessions,
    archivedAt: project.archivedAt ?? null,
    items: items.map((item) => ({
      ...item,
      sessionId: item.sessionId ?? legacySessionId,
      fingerprint: item.fingerprint ?? createFeedbackFingerprint(item.seconds, item.description),
      source: item.source ?? "feedback",
    })),
  };
}
