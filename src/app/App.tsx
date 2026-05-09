import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import {
  Archive,
  ArchiveRestore,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Eraser,
  FilePlus2,
  Gauge,
  Layers3,
  ListFilter,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { calculateBarPosition } from "../features/feedback/barCalculator";
import { createChecklistItems, parseFeedback } from "../features/feedback/feedbackParser";
import { formatDuration, parseTimecode } from "../features/feedback/timecode";
import { loadProjects, saveProjects } from "../features/projects/projectStorage";
import {
  categoryLabels,
  instrumentCategories,
  mixPartCategories,
  type ChecklistCategory,
  type ChecklistItem,
  type FeedbackSession,
  type Project,
} from "../features/projects/projectTypes";

const sampleFeedback = `00:09 arreglo acustica
0:21 Arreglo acustica
0.25 Trasteo guitarra, buscar otra toma.
00:32 paron acustica
00:36 Voz ("veo") buscar otra toma.
1:03 Acorde falluco en acustica, mirar otra toma.
1:05 Voz ("darte") ojo en el "dar", colocar con melodyne un micronanomilimetro.
1:14, trasteo guitarra acustica.
1:47 Voz ("tendre") buscar otra toma o tocar con melodyne
1:48 acustica revisar otras tomas, no son los acordes
2:57, en ese silencio, hay alguna nota por ahi coleando, a ver si se puede quitar.
3:21 arreglo de guitarra (Jesus), primera nota mal, buscar en otra toma.
3:33 se cuela claca de Lola`;

type ProjectDraft = Pick<Project, "songName" | "artistName" | "bpm" | "barOffset" | "beatsPerBar">;
type ActiveView = "checklist" | "import" | "settings";
type ItemFilter = "all" | "pending" | "done";
type ImportMode = "new-session" | "replace-session" | "append-deduped";
type ManualCheckpointInput = {
  sessionId: string;
  timecode: string;
  description: string;
  category: ChecklistCategory;
  notes: string;
};

const emptyDraft: ProjectDraft = {
  songName: "",
  artistName: "",
  bpm: 120,
  barOffset: 0,
  beatsPerBar: 4,
};

const revisionLogoSrc = "./revision-logo-transparent.png";

function getDefaultRevisionName(index: number): string {
  return `Revision nº ${index}`;
}

function getProjectCompletion(project: Project): number {
  if (project.items.length === 0) {
    return 0;
  }

  const done = project.items.filter((item) => item.status === "done").length;
  return Math.round((done / project.items.length) * 100);
}

function getPreferredProjectId(projects: Project[]): string | null {
  return projects.find((project) => !project.archivedAt)?.id ?? projects[0]?.id ?? null;
}

function getRevisionLabel(sessions: FeedbackSession[], sessionId: string): string {
  const index = sessions.findIndex((session) => session.id === sessionId);
  return index >= 0 ? getDefaultRevisionName(index + 1) : "Revision";
}

function getRevisionOptionLabel(sessions: FeedbackSession[], session: FeedbackSession): string {
  const revisionLabel = getRevisionLabel(sessions, session.id);
  return session.name && session.name !== revisionLabel
    ? `${revisionLabel} / ${session.name}`
    : revisionLabel;
}

function sortChecklistItems(items: ChecklistItem[]): ChecklistItem[] {
  return [...items].sort((a, b) => {
    const aUntimed = a.source === "manual" && a.originalTimecode === "Manual";
    const bUntimed = b.source === "manual" && b.originalTimecode === "Manual";

    if (aUntimed !== bUntimed) {
      return aUntimed ? 1 : -1;
    }

    if (a.seconds !== b.seconds) {
      return a.seconds - b.seconds;
    }

    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

function createEmptyManualCheckpoint(sessionId: string): ManualCheckpointInput {
  return {
    sessionId,
    timecode: "",
    description: "",
    category: "other",
    notes: "",
  };
}

function getNoteRows(value: string): number {
  if (!value.trim()) {
    return 1;
  }

  return Math.max(
    1,
    value.split(/\r?\n/).reduce((rows, line) => rows + Math.max(1, Math.ceil(line.length / 22)), 0),
  );
}

export function App() {
  const [projects, setProjects] = useState<Project[]>(() => loadProjects());
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => getPreferredProjectId(loadProjects()));
  const [draft, setDraft] = useState<ProjectDraft>(emptyDraft);
  const [feedback, setFeedback] = useState(sampleFeedback);
  const [activeView, setActiveView] = useState<ActiveView>("checklist");
  const [itemFilter, setItemFilter] = useState<ItemFilter>("all");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [importMode, setImportMode] = useState<ImportMode>("new-session");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(() => loadProjects().length === 0);

  const activeProject = projects.find((project) => project.id === activeProjectId) ?? null;
  const activeProjects = projects.filter((project) => !project.archivedAt);
  const archivedProjects = projects.filter((project) => project.archivedAt);
  const parsedFeedback = useMemo(() => parseFeedback(feedback), [feedback]);
  const pendingCount = activeProject?.items.filter((item) => item.status === "pending").length ?? 0;
  const doneCount = activeProject?.items.filter((item) => item.status === "done").length ?? 0;
  const totalCount = activeProject?.items.length ?? 0;
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const fallbackSessionName = activeProject
    ? getDefaultRevisionName(activeProject.sessions.length + 1)
    : getDefaultRevisionName(1);
  const lastSessionId = activeProject?.sessions[activeProject.sessions.length - 1]?.id ?? "";
  const targetSessionId = selectedSessionId || lastSessionId;
  const duplicateFingerprints = useMemo(() => {
    if (!activeProject) {
      return new Set<string>();
    }

    const ignoredSessionId = importMode === "replace-session" ? targetSessionId : "";
    return new Set(
      activeProject.items
        .filter((item) => item.sessionId !== ignoredSessionId)
        .map((item) => item.fingerprint),
    );
  }, [activeProject, importMode, targetSessionId]);
  const newParsedItems = parsedFeedback.filter((item) => !duplicateFingerprints.has(item.fingerprint));
  const duplicateCount = parsedFeedback.length - newParsedItems.length;
  const importableCount = newParsedItems.length;

  useEffect(() => {
    saveProjects(projects);
  }, [projects]);

  useEffect(() => {
    setSelectedSessionId(activeProject?.sessions[activeProject.sessions.length - 1]?.id ?? "");
    setSessionFilter("all");
    setSessionName(activeProject ? getDefaultRevisionName(activeProject.sessions.length + 1) : getDefaultRevisionName(1));
  }, [activeProject?.id]);

  function createProject() {
    const now = new Date().toISOString();
    const project: Project = {
      id: crypto.randomUUID(),
      songName: draft.songName.trim() || "Cancion sin titulo",
      artistName: draft.artistName.trim() || "Artista sin nombre",
      bpm: Number(draft.bpm) || 120,
      barOffset: Number(draft.barOffset) || 0,
      beatsPerBar: Number(draft.beatsPerBar) || 4,
      sessions: [],
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
      items: [],
    };

    setProjects((current) => [project, ...current]);
    setActiveProjectId(project.id);
    setDraft(emptyDraft);
    setActiveView("import");
    setIsCreateOpen(false);
  }

  function importFeedback() {
    if (!activeProject || parsedFeedback.length === 0) {
      return;
    }

    const now = new Date().toISOString();
    const replacing = importMode === "replace-session" && targetSessionId;
    const appending = importMode === "append-deduped" && targetSessionId;
    const sessionId = replacing || appending ? targetSessionId : crypto.randomUUID();
    const sessionLabel =
      replacing || appending
        ? activeProject.sessions.find((session) => session.id === sessionId)?.name ?? fallbackSessionName
        : sessionName.trim() || fallbackSessionName;
    const parsedItemsToImport =
      importMode === "replace-session"
        ? parsedFeedback.filter((item) => !duplicateFingerprints.has(item.fingerprint))
        : newParsedItems;

    if (parsedItemsToImport.length === 0) {
      return;
    }

    const items = createChecklistItems({
      parsedItems: parsedItemsToImport,
      bpm: activeProject.bpm,
      beatsPerBar: activeProject.beatsPerBar,
      barOffset: activeProject.barOffset,
      sessionId,
    });
    const nextSession: FeedbackSession = {
      id: sessionId,
      name: sessionLabel,
      sourceText: feedback,
      importedAt: now,
      notes: "",
    };
    const existingSessions = replacing || appending
      ? activeProject.sessions.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                name: sessionLabel,
                sourceText: feedback,
                importedAt: now,
              }
            : session,
        )
      : [...activeProject.sessions, nextSession];
    const existingItems = replacing
      ? activeProject.items.filter((item) => item.sessionId !== sessionId)
      : activeProject.items;

    updateProject(activeProject.id, {
      sessions: existingSessions,
      items: sortChecklistItems([...existingItems, ...items]),
    });
    setSelectedSessionId(sessionId);
    setSessionFilter(sessionId);
    setSessionName(getDefaultRevisionName(existingSessions.length + 1));
    setActiveView("checklist");
  }

  function resetChecklist(projectId: string) {
    if (!window.confirm("Vaciar todas las tareas y revisiones de esta cancion?")) {
      return;
    }

    updateProject(projectId, {
      sessions: [],
      items: [],
    });
    setSessionFilter("all");
    setSelectedSessionId("");
    setSessionName(getDefaultRevisionName(1));
  }

  function deleteSession(sessionId: string) {
    if (!activeProject) {
      return;
    }

    const revisionLabel = getRevisionLabel(activeProject.sessions, sessionId);

    if (!window.confirm(`Borrar ${revisionLabel} y todos sus checkpoints?`)) {
      return;
    }

    const nextSessionId = activeProject.sessions.find((session) => session.id !== sessionId)?.id ?? "";

    updateProject(activeProject.id, {
      sessions: activeProject.sessions.filter((session) => session.id !== sessionId),
      items: activeProject.items.filter((item) => item.sessionId !== sessionId),
    });
    setSessionFilter(nextSessionId || "all");
    setSelectedSessionId(nextSessionId);
  }

  function updateProject(projectId: string, patch: Partial<Project>) {
    const updatedAt = new Date().toISOString();

    setProjects((current) =>
      current.map((project) =>
        project.id === projectId
          ? {
              ...project,
              ...patch,
              updatedAt,
            }
          : project,
      ),
    );
  }

  function updateActiveProjectSettings(patch: Partial<ProjectDraft>) {
    if (!activeProject) {
      return;
    }

    updateProject(activeProject.id, {
      ...patch,
      bpm: patch.bpm === undefined ? activeProject.bpm : Number(patch.bpm) || activeProject.bpm,
      barOffset:
        patch.barOffset === undefined ? activeProject.barOffset : Number(patch.barOffset) || 0,
      beatsPerBar:
        patch.beatsPerBar === undefined
          ? activeProject.beatsPerBar
          : Number(patch.beatsPerBar) || activeProject.beatsPerBar,
    });
  }

  function updateItem(itemId: string, patch: Partial<ChecklistItem>) {
    if (!activeProject) {
      return;
    }

    updateProject(activeProject.id, {
      items: activeProject.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    });
  }

  function createRevision(): string {
    if (!activeProject) {
      return "";
    }

    const now = new Date().toISOString();
    const session: FeedbackSession = {
      id: crypto.randomUUID(),
      name: getDefaultRevisionName(activeProject.sessions.length + 1),
      sourceText: "",
      importedAt: now,
      notes: "",
    };

    updateProject(activeProject.id, {
      sessions: [...activeProject.sessions, session],
    });
    setSelectedSessionId(session.id);
    setSessionFilter(session.id);
    setSessionName(getDefaultRevisionName(activeProject.sessions.length + 2));

    return session.id;
  }

  function addManualCheckpoint(input: ManualCheckpointInput) {
    if (!activeProject) {
      return;
    }

    const now = new Date().toISOString();
    let sessionId = input.sessionId || activeProject.sessions[activeProject.sessions.length - 1]?.id || "";
    let sessions = activeProject.sessions;

    if (!sessionId) {
      const session: FeedbackSession = {
        id: crypto.randomUUID(),
        name: getDefaultRevisionName(activeProject.sessions.length + 1),
        sourceText: "",
        importedAt: now,
        notes: "",
      };
      sessionId = session.id;
      sessions = [...sessions, session];
    }

    const parsedTimecode = input.timecode.trim() ? parseTimecode(input.timecode) : null;
    const position = parsedTimecode
      ? calculateBarPosition({
          timestampSeconds: parsedTimecode.seconds,
          bpm: activeProject.bpm,
          beatsPerBar: activeProject.beatsPerBar,
          barOffset: activeProject.barOffset,
        })
      : { bar: null, beat: null };

    const item: ChecklistItem = {
      id: crypto.randomUUID(),
      sessionId,
      originalTimecode: parsedTimecode?.original ?? "Manual",
      seconds: parsedTimecode?.seconds ?? 0,
      bar: position.bar,
      beat: position.beat,
      description: input.description.trim() || "Correccion manual",
      category: input.category,
      status: "pending",
      notes: input.notes.trim(),
      fingerprint: `manual|${crypto.randomUUID()}`,
      source: "manual",
      createdAt: now,
      updatedAt: now,
    };

    updateProject(activeProject.id, {
      sessions,
      items: sortChecklistItems([...activeProject.items, item]),
    });
    setSelectedSessionId(sessionId);
    setSessionFilter(sessionId);
  }

  function deleteItem(itemId: string) {
    if (!activeProject) {
      return;
    }

    updateProject(activeProject.id, {
      items: activeProject.items.filter((item) => item.id !== itemId),
    });
  }

  function archiveProject(projectId: string) {
    updateProject(projectId, {
      archivedAt: new Date().toISOString(),
    });
  }

  function restoreProject(projectId: string) {
    updateProject(projectId, {
      archivedAt: null,
    });
    setActiveProjectId(projectId);
  }

  function deleteProject(projectId: string) {
    const project = projects.find((project) => project.id === projectId);

    if (!window.confirm(`Eliminar "${project?.songName ?? "este proyecto"}"? Esta accion no se puede deshacer.`)) {
      return;
    }

    const nextProjects = projects.filter((project) => project.id !== projectId);
    setProjects(nextProjects);

    if (activeProjectId === projectId) {
      setActiveProjectId(getPreferredProjectId(nextProjects));
      setIsCreateOpen(nextProjects.length === 0);
    }
  }

  return (
    <main className="appShell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">
            <img src={revisionLogoSrc} alt="" aria-hidden="true" />
          </div>
          <div>
            <strong>Revision</strong>
            <span>Review your mix</span>
          </div>
        </div>

        <button className="newProjectButton" onClick={() => setIsCreateOpen((open) => !open)}>
          <Plus aria-hidden="true" />
          Nuevo proyecto
        </button>

        {isCreateOpen && (
          <section className="projectCreator" aria-labelledby="new-project">
            <h2 id="new-project">Datos de la cancion</h2>
            <label>
              Cancion
              <input
                value={draft.songName}
                onChange={(event) => setDraft({ ...draft, songName: event.target.value })}
                placeholder="Nombre de la cancion"
              />
            </label>
            <label>
              Artista
              <input
                value={draft.artistName}
                onChange={(event) => setDraft({ ...draft, artistName: event.target.value })}
                placeholder="Artista"
              />
            </label>
            <div className="splitFields">
              <label>
                BPM
                <input
                  type="number"
                  min="1"
                  value={draft.bpm}
                  onChange={(event) => setDraft({ ...draft, bpm: Number(event.target.value) })}
                />
              </label>
              <label>
                Offset
                <input
                  type="number"
                  min="0"
                  value={draft.barOffset}
                  onChange={(event) => setDraft({ ...draft, barOffset: Number(event.target.value) })}
                />
              </label>
            </div>
            <label>
              Pulsos por compas
              <input
                type="number"
                min="1"
                value={draft.beatsPerBar}
                onChange={(event) => setDraft({ ...draft, beatsPerBar: Number(event.target.value) })}
              />
            </label>
            <button className="primaryButton fullWidth" onClick={createProject}>
              <FilePlus2 aria-hidden="true" />
              Crear
            </button>
          </section>
        )}

        <section className="projectList" aria-label="Proyectos">
          <div className="sidebarLabel">Proyectos activos</div>
          {activeProjects.length === 0 && <p className="sidebarEmpty">No hay proyectos activos.</p>}
          {activeProjects.map((project) => (
            <ProjectListEntry
              active={project.id === activeProjectId}
              key={project.id}
              project={project}
              onArchive={() => archiveProject(project.id)}
              onDelete={() => deleteProject(project.id)}
              onRestore={() => restoreProject(project.id)}
              onSelect={() => {
                setActiveProjectId(project.id);
                setActiveView("checklist");
              }}
            />
          ))}

          {archivedProjects.length > 0 && (
            <>
              <div className="sidebarLabel archivedLabel">Archivados</div>
              {archivedProjects.map((project) => (
                <ProjectListEntry
                  active={project.id === activeProjectId}
                  key={project.id}
                  project={project}
                  onArchive={() => archiveProject(project.id)}
                  onDelete={() => deleteProject(project.id)}
                  onRestore={() => restoreProject(project.id)}
                  onSelect={() => {
                    setActiveProjectId(project.id);
                    setActiveView("checklist");
                  }}
                />
              ))}
            </>
          )}
        </section>
      </aside>

      <section className="workspace">
        {activeProject ? (
          <>
            <header className="projectHeader">
              <div className="titleBlock">
                <p className="eyebrow">{activeProject.artistName}</p>
                <div className="titleLine">
                  <h1>{activeProject.songName}</h1>
                  {activeProject.archivedAt && <span className="archivedBadge">Archivado</span>}
                </div>
                <p>
                  {activeProject.bpm} BPM / {activeProject.beatsPerBar}/4 / offset{" "}
                  {activeProject.barOffset}
                </p>
              </div>

              <div className="sessionStats">
                <div className="projectHeaderActions">
                  <button
                    className="iconButton"
                    onClick={() =>
                      activeProject.archivedAt
                        ? restoreProject(activeProject.id)
                        : archiveProject(activeProject.id)
                    }
                    title={activeProject.archivedAt ? "Restaurar proyecto" : "Archivar proyecto"}
                  >
                    {activeProject.archivedAt ? (
                      <ArchiveRestore aria-hidden="true" />
                    ) : (
                      <Archive aria-hidden="true" />
                    )}
                  </button>
                  <button
                    className="iconButton danger"
                    onClick={() => deleteProject(activeProject.id)}
                    title="Eliminar proyecto"
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
                <div
                  className="progressDial"
                  style={{ "--progress": `${progress}%` } as CSSProperties}
                  aria-label={`${progress}% completado`}
                >
                  <span>{progress}%</span>
                </div>
                <StatPill icon={<ClipboardList aria-hidden="true" />} label="Pendientes" value={pendingCount} />
                <StatPill icon={<CheckCircle2 aria-hidden="true" />} label="Hechas" value={doneCount} />
                <StatPill icon={<Layers3 aria-hidden="true" />} label="Revisiones" value={activeProject.sessions.length} />
              </div>
            </header>

            <nav className="viewTabs" aria-label="Vistas del proyecto">
              <TabButton active={activeView === "checklist"} onClick={() => setActiveView("checklist")}>
                <ClipboardList aria-hidden="true" />
                Checklist
              </TabButton>
              <TabButton active={activeView === "import"} onClick={() => setActiveView("import")}>
                <Upload aria-hidden="true" />
                Importar
              </TabButton>
              <TabButton active={activeView === "settings"} onClick={() => setActiveView("settings")}>
                <SlidersHorizontal aria-hidden="true" />
                Ajustes
              </TabButton>
            </nav>

            {activeView === "checklist" && (
              <ChecklistTable
                filter={itemFilter}
                items={activeProject.items}
                sessionFilter={sessionFilter}
                sessions={activeProject.sessions}
                onAddManualItem={addManualCheckpoint}
                onCreateSession={createRevision}
                onDeleteItem={deleteItem}
                onDeleteSession={deleteSession}
                onFilterChange={setItemFilter}
                onSessionFilterChange={setSessionFilter}
                onUpdate={updateItem}
              />
            )}

            {activeView === "import" && (
              <section className="panel importer">
                <div className="sectionHeading">
                  <div>
                    <h2>Feedback del artista</h2>
                    <p>
                      {parsedFeedback.length} detectadas / {newParsedItems.length} nuevas / {duplicateCount} duplicadas
                    </p>
                  </div>
                  <button className="secondaryButton" onClick={() => setFeedback(sampleFeedback)}>
                    <RotateCcw aria-hidden="true" />
                    Ejemplo
                  </button>
                </div>
                <div className="importControls">
                  <label>
                    Modo de importacion
                    <select value={importMode} onChange={(event) => setImportMode(event.target.value as ImportMode)}>
                      <option value="new-session">Nueva revision sin duplicar</option>
                      <option value="replace-session" disabled={activeProject.sessions.length === 0}>
                        Reemplazar revision
                      </option>
                      <option value="append-deduped" disabled={activeProject.sessions.length === 0}>
                        Anadir a revision sin duplicar
                      </option>
                    </select>
                  </label>

                  {importMode === "new-session" ? (
                    <label>
                      Nombre de revision
                      <input
                        value={sessionName}
                        onChange={(event) => setSessionName(event.target.value)}
                        placeholder={fallbackSessionName}
                      />
                    </label>
                  ) : (
                    <label>
                      Revision destino
                      <select value={targetSessionId} onChange={(event) => setSelectedSessionId(event.target.value)}>
                        {activeProject.sessions.map((session) => (
                          <option key={session.id} value={session.id}>
                            {getRevisionOptionLabel(activeProject.sessions, session)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
                <textarea
                  value={feedback}
                  onChange={(event) => setFeedback(event.target.value)}
                  spellCheck={false}
                />
                <div className="previewBar">
                  <span>
                    Primera marca:{" "}
                    {parsedFeedback[0]
                      ? `${parsedFeedback[0].originalTimecode} (${parsedFeedback[0].seconds}s)`
                      : "sin datos"}
                  </span>
                  <button className="primaryButton" onClick={importFeedback} disabled={importableCount === 0}>
                    <Upload aria-hidden="true" />
                    Importar {importableCount}
                  </button>
                </div>
              </section>
            )}

            {activeView === "settings" && (
              <section className="panel settingsPanel">
                <div className="sectionHeading">
                  <div>
                    <h2>Ajustes del proyecto</h2>
                    <p>Gestiona datos musicales, revisiones y acciones de limpieza.</p>
                  </div>
                  <button
                    className="iconButton danger"
                    onClick={() => deleteProject(activeProject.id)}
                    title="Eliminar proyecto"
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
                <div className="settingsGrid">
                  <label>
                    Cancion
                    <input
                      value={activeProject.songName}
                      onChange={(event) => updateActiveProjectSettings({ songName: event.target.value })}
                    />
                  </label>
                  <label>
                    Artista
                    <input
                      value={activeProject.artistName}
                      onChange={(event) => updateActiveProjectSettings({ artistName: event.target.value })}
                    />
                  </label>
                  <label>
                    BPM
                    <input
                      type="number"
                      min="1"
                      value={activeProject.bpm}
                      onChange={(event) => updateActiveProjectSettings({ bpm: Number(event.target.value) })}
                    />
                  </label>
                  <label>
                    Offset de compases
                    <input
                      type="number"
                      min="0"
                      value={activeProject.barOffset}
                      onChange={(event) => updateActiveProjectSettings({ barOffset: Number(event.target.value) })}
                    />
                  </label>
                  <label>
                    Pulsos por compas
                    <input
                      type="number"
                      min="1"
                      value={activeProject.beatsPerBar}
                      onChange={(event) => updateActiveProjectSettings({ beatsPerBar: Number(event.target.value) })}
                    />
                  </label>
                </div>
                <div className="dangerZone">
                  <div>
                    <h3>Reset del checklist</h3>
                    <p>Borra todas las tareas y revisiones de esta cancion.</p>
                  </div>
                  <button className="dangerButton" onClick={() => resetChecklist(activeProject.id)}>
                    <Eraser aria-hidden="true" />
                    Vaciar checklist
                  </button>
                </div>

                {activeProject.sessions.length > 0 && (
                  <div className="sessionManager">
                    <h3>Revisiones</h3>
                    {activeProject.sessions.map((session) => {
                      const sessionItems = activeProject.items.filter((item) => item.sessionId === session.id);

                      return (
                        <div className="sessionRow" key={session.id}>
                          <div>
                            <strong>{getRevisionOptionLabel(activeProject.sessions, session)}</strong>
                            <span>
                              {sessionItems.length} puntos /{" "}
                              {new Date(session.importedAt).toLocaleDateString("es-ES")}
                            </span>
                          </div>
                          <button className="iconButton danger" onClick={() => deleteSession(session.id)} title="Borrar revision">
                            <Trash2 aria-hidden="true" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </>
        ) : (
          <div className="emptyState">
            <div className="brandMark large">
              <img src={revisionLogoSrc} alt="" aria-hidden="true" />
            </div>
            <h1>Crea tu primer proyecto</h1>
            <p>Introduce cancion, artista y BPM para convertir feedback en una lista de mezcla clara.</p>
          </div>
        )}
      </section>
    </main>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className={`tabButton ${active ? "active" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}

function StatPill({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="statPill">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProjectListEntry({
  active,
  project,
  onArchive,
  onDelete,
  onRestore,
  onSelect,
}: {
  active: boolean;
  project: Project;
  onArchive: () => void;
  onDelete: () => void;
  onRestore: () => void;
  onSelect: () => void;
}) {
  const pending = project.items.filter((item) => item.status === "pending").length;
  const done = project.items.filter((item) => item.status === "done").length;
  const progress = getProjectCompletion(project);

  return (
    <article className={`projectListItem ${active ? "active" : ""} ${project.archivedAt ? "archived" : ""}`}>
      <button className="projectListMain" onClick={onSelect}>
        <span>{project.songName}</span>
        <small>{project.artistName}</small>
        <em>
          {done}/{project.items.length || 0} hechas / {project.sessions.length} revisiones
          <ChevronRight aria-hidden="true" />
        </em>
      </button>
      <div className="projectActions">
        <button
          className="miniIconButton"
          onClick={project.archivedAt ? onRestore : onArchive}
          title={project.archivedAt ? "Restaurar proyecto" : "Archivar proyecto"}
        >
          {project.archivedAt ? <ArchiveRestore aria-hidden="true" /> : <Archive aria-hidden="true" />}
        </button>
        <button className="miniIconButton danger" onClick={onDelete} title="Eliminar proyecto">
          <Trash2 aria-hidden="true" />
        </button>
      </div>
      <div className="sidebarProgress" aria-label={`${progress}% completado`}>
        <span style={{ width: `${progress}%` }} />
      </div>
      {pending > 0 && <b>{pending}</b>}
    </article>
  );
}

function ChecklistTable({
  filter,
  items,
  sessionFilter,
  sessions,
  onAddManualItem,
  onCreateSession,
  onDeleteItem,
  onDeleteSession,
  onFilterChange,
  onSessionFilterChange,
  onUpdate,
}: {
  filter: ItemFilter;
  items: ChecklistItem[];
  sessionFilter: string;
  sessions: FeedbackSession[];
  onAddManualItem: (input: ManualCheckpointInput) => void;
  onCreateSession: () => string;
  onDeleteItem: (itemId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onFilterChange: (filter: ItemFilter) => void;
  onSessionFilterChange: (sessionId: string) => void;
  onUpdate: (itemId: string, patch: Partial<ChecklistItem>) => void;
}) {
  const defaultManualSessionId =
    sessionFilter !== "all" ? sessionFilter : sessions[sessions.length - 1]?.id ?? "";
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [manualDraft, setManualDraft] = useState<ManualCheckpointInput>(() =>
    createEmptyManualCheckpoint(defaultManualSessionId),
  );
  const [manualError, setManualError] = useState("");

  useEffect(() => {
    setManualDraft((current) => {
      const sessionStillExists = sessions.some((session) => session.id === current.sessionId);

      if (current.sessionId && sessionStillExists) {
        return current;
      }

      return {
        ...current,
        sessionId: defaultManualSessionId,
      };
    });
  }, [defaultManualSessionId, sessions]);

  const visibleItems = items.filter((item) => {
    const matchesSession = sessionFilter === "all" || item.sessionId === sessionFilter;

    if (filter === "pending") {
      return matchesSession && item.status === "pending";
    }

    if (filter === "done") {
      return matchesSession && item.status === "done";
    }

    return matchesSession;
  });

  function openManualForm() {
    const sessionId = sessions.length === 0 ? onCreateSession() : defaultManualSessionId;
    setManualDraft(createEmptyManualCheckpoint(sessionId));
    setManualError("");
    setIsManualOpen(true);
  }

  function submitManualItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const description = manualDraft.description.trim();
    const timecode = manualDraft.timecode.trim();

    if (!description) {
      setManualError("Escribe la correccion.");
      return;
    }

    if (timecode && !parseTimecode(timecode)) {
      setManualError("Ese tiempo no parece valido.");
      return;
    }

    const sessionId = manualDraft.sessionId || defaultManualSessionId || onCreateSession();
    onAddManualItem({
      ...manualDraft,
      sessionId,
      description,
      timecode,
    });
    setManualDraft(createEmptyManualCheckpoint(sessionId));
    setManualError("");
    setIsManualOpen(false);
  }

  const revisionLabel =
    sessionFilter === "all" ? "Revisiones" : getRevisionLabel(sessions, sessionFilter);

  return (
    <section className="panel checklist">
      <div className="sectionHeading">
        <div>
          <h2>Checklist de mezcla</h2>
          <p>{items.length} correcciones en esta cancion</p>
        </div>
        <div className="revisionControls">
          <label className="sessionFilter">
            {revisionLabel}
            <select value={sessionFilter} onChange={(event) => onSessionFilterChange(event.target.value)}>
              <option value="all">Todas las revisiones</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {getRevisionOptionLabel(sessions, session)}
                </option>
              ))}
            </select>
          </label>
          <button className="iconButton" onClick={onCreateSession} title="Nueva revision">
            <Plus aria-hidden="true" />
          </button>
          <button
            className="iconButton danger"
            disabled={sessionFilter === "all" || sessions.length === 0}
            onClick={() => onDeleteSession(sessionFilter)}
            title="Borrar revision seleccionada"
          >
            <Trash2 aria-hidden="true" />
          </button>
        </div>
        <div className="filterGroup" aria-label="Filtro de tareas">
          <ListFilter aria-hidden="true" />
          <button className={filter === "all" ? "active" : ""} onClick={() => onFilterChange("all")}>
            Todas
          </button>
          <button className={filter === "pending" ? "active" : ""} onClick={() => onFilterChange("pending")}>
            Pendientes
          </button>
          <button className={filter === "done" ? "active" : ""} onClick={() => onFilterChange("done")}>
            Hechas
          </button>
        </div>
      </div>

      {visibleItems.length === 0 ? (
        <div className="emptyChecklist compact">
          <ClipboardList aria-hidden="true" />
          <h2>{items.length === 0 ? "Checklist vacia" : "Sin correcciones con este filtro"}</h2>
          <p>
            {items.length === 0
              ? "Importa feedback o anade un checkpoint manual."
              : "Cambia el filtro o anade una correccion manual a esta revision."}
          </p>
        </div>
      ) : (
        <div className="taskList">
          {visibleItems.map((item) => {
            const hasTimecode = item.originalTimecode !== "Manual" && item.originalTimecode !== "Sin tiempo";

            return (
              <article key={item.id} className={`taskRow ${item.status === "done" ? "doneRow" : ""}`}>
                <button
                  className="statusToggle"
                  onClick={() => onUpdate(item.id, { status: item.status === "done" ? "pending" : "done" })}
                  aria-label={`Marcar ${item.description} como ${item.status === "done" ? "pendiente" : "hecho"}`}
                >
                  {item.status === "done" && <Check aria-hidden="true" />}
                </button>

                <div className="timeCell">
                  <strong>{item.originalTimecode}</strong>
                  <span>{hasTimecode ? formatDuration(item.seconds) : "sin tiempo"}</span>
                </div>

                <div className="barCell">
                  <Gauge aria-hidden="true" />
                  <span>Compás {item.bar ?? "-"}</span>
                  <small>Pulso {item.beat ?? "-"}</small>
                </div>

                <div className={`categoryBadge ${item.category}`}>
                  <select
                    value={item.category}
                    onChange={(event) => onUpdate(item.id, { category: event.target.value as ChecklistCategory })}
                    aria-label="Categoria"
                  >
                    {instrumentCategories.map((category) => (
                      <option key={category} value={category}>
                        {categoryLabels[category]}
                      </option>
                    ))}
                    <option disabled value="">
                      ----------
                    </option>
                    {mixPartCategories.map((category) => (
                      <option key={category} value={category}>
                        {categoryLabels[category]}
                      </option>
                    ))}
                  </select>
                </div>

                <input
                  className="descriptionInput"
                  value={item.description}
                  onChange={(event) => onUpdate(item.id, { description: event.target.value })}
                  aria-label="Descripcion"
                />

                <textarea
                  className="notesInput"
                  value={item.notes}
                  onChange={(event) => onUpdate(item.id, { notes: event.target.value })}
                  placeholder="Notas"
                  aria-label="Notas"
                  rows={getNoteRows(item.notes)}
                />

                <button
                  className="iconButton danger itemDeleteButton"
                  onClick={() => onDeleteItem(item.id)}
                  title="Borrar checkpoint"
                >
                  <Trash2 aria-hidden="true" />
                </button>
              </article>
            );
          })}
        </div>
      )}

      {isManualOpen ? (
        <form className="manualCheckpointForm" onSubmit={submitManualItem}>
          <select
            value={manualDraft.sessionId}
            onChange={(event) => setManualDraft({ ...manualDraft, sessionId: event.target.value })}
            aria-label="Revision"
          >
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {getRevisionOptionLabel(sessions, session)}
              </option>
            ))}
          </select>
          <input
            value={manualDraft.timecode}
            onChange={(event) => setManualDraft({ ...manualDraft, timecode: event.target.value })}
            placeholder="Tiempo opcional"
            aria-label="Tiempo opcional"
          />
          <input
            value={manualDraft.description}
            onChange={(event) => setManualDraft({ ...manualDraft, description: event.target.value })}
            placeholder="Nueva correccion"
            aria-label="Nueva correccion"
          />
          <select
            value={manualDraft.category}
            onChange={(event) =>
              setManualDraft({ ...manualDraft, category: event.target.value as ChecklistCategory })
            }
            aria-label="Categoria"
          >
            {instrumentCategories.map((category) => (
              <option key={category} value={category}>
                {categoryLabels[category]}
              </option>
            ))}
            <option disabled value="">
              ----------
            </option>
            {mixPartCategories.map((category) => (
              <option key={category} value={category}>
                {categoryLabels[category]}
              </option>
            ))}
          </select>
          <textarea
            value={manualDraft.notes}
            onChange={(event) => setManualDraft({ ...manualDraft, notes: event.target.value })}
            placeholder="Notas"
            aria-label="Notas"
            rows={2}
          />
          {manualError && <p className="manualError">{manualError}</p>}
          <button className="primaryButton" type="submit">
            <Plus aria-hidden="true" />
            Anadir
          </button>
          <button className="iconButton" type="button" onClick={() => setIsManualOpen(false)} title="Cancelar">
            <X aria-hidden="true" />
          </button>
        </form>
      ) : (
        <button className="addCheckpointButton" onClick={openManualForm}>
          <Plus aria-hidden="true" />
          Anadir checkpoint manual
        </button>
      )}
    </section>
  );
}
