import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Eraser,
  FilePlus2,
  Gauge,
  Layers3,
  ListFilter,
  Music2,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  Upload,
} from "lucide-react";
import { createChecklistItems, parseFeedback } from "../features/feedback/feedbackParser";
import { formatDuration } from "../features/feedback/timecode";
import { loadProjects, saveProjects } from "../features/projects/projectStorage";
import {
  categoryLabels,
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

const emptyDraft: ProjectDraft = {
  songName: "",
  artistName: "",
  bpm: 120,
  barOffset: 0,
  beatsPerBar: 4,
};

export function App() {
  const [projects, setProjects] = useState<Project[]>(() => loadProjects());
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => loadProjects()[0]?.id ?? null);
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
  const parsedFeedback = useMemo(() => parseFeedback(feedback), [feedback]);
  const pendingCount = activeProject?.items.filter((item) => item.status === "pending").length ?? 0;
  const doneCount = activeProject?.items.filter((item) => item.status === "done").length ?? 0;
  const totalCount = activeProject?.items.length ?? 0;
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const fallbackSessionName = activeProject ? `Feedback #${activeProject.sessions.length + 1}` : "Feedback #1";
  const targetSessionId = selectedSessionId || activeProject?.sessions[0]?.id || "";
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
    setSelectedSessionId(activeProject?.sessions[0]?.id ?? "");
    setSessionFilter("all");
    setSessionName(activeProject ? `Feedback #${activeProject.sessions.length + 1}` : "Feedback #1");
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
      items: [...existingItems, ...items].sort((a, b) => a.seconds - b.seconds),
    });
    setSelectedSessionId(sessionId);
    setSessionFilter(sessionId);
    setSessionName(`Feedback #${activeProject.sessions.length + 2}`);
    setActiveView("checklist");
  }

  function resetChecklist(projectId: string) {
    if (!window.confirm("Vaciar todas las tareas y sesiones de feedback de esta cancion?")) {
      return;
    }

    updateProject(projectId, {
      sessions: [],
      items: [],
    });
    setSessionFilter("all");
    setSelectedSessionId("");
    setSessionName("Feedback #1");
  }

  function deleteSession(sessionId: string) {
    if (!activeProject) {
      return;
    }

    if (!window.confirm("Borrar esta sesion y todos sus puntos de feedback?")) {
      return;
    }

    updateProject(activeProject.id, {
      sessions: activeProject.sessions.filter((session) => session.id !== sessionId),
      items: activeProject.items.filter((item) => item.sessionId !== sessionId),
    });
    setSessionFilter("all");
    setSelectedSessionId(activeProject.sessions.find((session) => session.id !== sessionId)?.id ?? "");
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

  function deleteProject(projectId: string) {
    const nextProjects = projects.filter((project) => project.id !== projectId);
    setProjects(nextProjects);

    if (activeProjectId === projectId) {
      setActiveProjectId(nextProjects[0]?.id ?? null);
      setIsCreateOpen(nextProjects.length === 0);
    }
  }

  return (
    <main className="appShell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">
            <Music2 aria-hidden="true" />
          </div>
          <div>
            <strong>Mixing Checklist</strong>
            <span>Sesion de correcciones</span>
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
          <div className="sidebarLabel">Proyectos</div>
          {projects.map((project) => {
            const pending = project.items.filter((item) => item.status === "pending").length;
            const done = project.items.filter((item) => item.status === "done").length;

            return (
              <button
                className={`projectListItem ${project.id === activeProjectId ? "active" : ""}`}
                key={project.id}
                onClick={() => {
                  setActiveProjectId(project.id);
                  setActiveView("checklist");
                }}
              >
                <span>{project.songName}</span>
                <small>{project.artistName}</small>
                <em>
                  {done}/{project.items.length || 0} hechas · {project.sessions.length} feedbacks
                  <ChevronRight aria-hidden="true" />
                </em>
                {pending > 0 && <b>{pending}</b>}
              </button>
            );
          })}
        </section>
      </aside>

      <section className="workspace">
        {activeProject ? (
          <>
            <header className="projectHeader">
              <div className="titleBlock">
                <p className="eyebrow">{activeProject.artistName}</p>
                <h1>{activeProject.songName}</h1>
                <p>
                  {activeProject.bpm} BPM / {activeProject.beatsPerBar}/4 / offset{" "}
                  {activeProject.barOffset}
                </p>
              </div>

              <div className="sessionStats">
                <div
                  className="progressDial"
                  style={{ "--progress": `${progress}%` } as CSSProperties}
                  aria-label={`${progress}% completado`}
                >
                  <span>{progress}%</span>
                </div>
                <StatPill icon={<ClipboardList aria-hidden="true" />} label="Pendientes" value={pendingCount} />
                <StatPill icon={<CheckCircle2 aria-hidden="true" />} label="Hechas" value={doneCount} />
                <StatPill icon={<Layers3 aria-hidden="true" />} label="Feedbacks" value={activeProject.sessions.length} />
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
                      <option value="new-session">Nueva sesion sin duplicar</option>
                      <option value="replace-session" disabled={activeProject.sessions.length === 0}>
                        Reemplazar sesion
                      </option>
                      <option value="append-deduped" disabled={activeProject.sessions.length === 0}>
                        Anadir a sesion sin duplicar
                      </option>
                    </select>
                  </label>

                  {importMode === "new-session" ? (
                    <label>
                      Nombre de sesion
                      <input
                        value={sessionName}
                        onChange={(event) => setSessionName(event.target.value)}
                        placeholder={fallbackSessionName}
                      />
                    </label>
                  ) : (
                    <label>
                      Sesion destino
                      <select value={targetSessionId} onChange={(event) => setSelectedSessionId(event.target.value)}>
                        {activeProject.sessions.map((session) => (
                          <option key={session.id} value={session.id}>
                            {session.name}
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
                    <p>Gestiona datos musicales, sesiones y acciones de limpieza.</p>
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
                    <p>Borra todas las tareas y sesiones de feedback de esta cancion.</p>
                  </div>
                  <button className="dangerButton" onClick={() => resetChecklist(activeProject.id)}>
                    <Eraser aria-hidden="true" />
                    Vaciar checklist
                  </button>
                </div>

                {activeProject.sessions.length > 0 && (
                  <div className="sessionManager">
                    <h3>Sesiones de feedback</h3>
                    {activeProject.sessions.map((session) => {
                      const sessionItems = activeProject.items.filter((item) => item.sessionId === session.id);

                      return (
                        <div className="sessionRow" key={session.id}>
                          <div>
                            <strong>{session.name}</strong>
                            <span>
                              {sessionItems.length} puntos /{" "}
                              {new Date(session.importedAt).toLocaleDateString("es-ES")}
                            </span>
                          </div>
                          <button className="iconButton danger" onClick={() => deleteSession(session.id)} title="Borrar sesion">
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
              <Music2 aria-hidden="true" />
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

function ChecklistTable({
  filter,
  items,
  sessionFilter,
  sessions,
  onFilterChange,
  onSessionFilterChange,
  onUpdate,
}: {
  filter: ItemFilter;
  items: ChecklistItem[];
  sessionFilter: string;
  sessions: FeedbackSession[];
  onFilterChange: (filter: ItemFilter) => void;
  onSessionFilterChange: (sessionId: string) => void;
  onUpdate: (itemId: string, patch: Partial<ChecklistItem>) => void;
}) {
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

  if (items.length === 0) {
    return (
      <section className="panel emptyChecklist">
        <ClipboardList aria-hidden="true" />
        <h2>Checklist vacia</h2>
        <p>Importa feedback para generar tareas ordenadas por tiempo, compas y categoria.</p>
      </section>
    );
  }

  return (
    <section className="panel checklist">
      <div className="sectionHeading">
        <div>
          <h2>Checklist de mezcla</h2>
          <p>{items.length} correcciones en esta cancion</p>
        </div>
        <label className="sessionFilter">
          Sesion
          <select value={sessionFilter} onChange={(event) => onSessionFilterChange(event.target.value)}>
            <option value="all">Todas</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.name}
              </option>
            ))}
          </select>
        </label>
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

      <div className="taskList">
        {visibleItems.map((item) => (
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
              <span>{formatDuration(item.seconds)}</span>
            </div>

            <div className="barCell">
              <Gauge aria-hidden="true" />
              <span>C{item.bar ?? "-"}</span>
              <small>P{item.beat ?? "-"}</small>
            </div>

            <div className={`categoryBadge ${item.category}`}>
              <select
                value={item.category}
                onChange={(event) => onUpdate(item.id, { category: event.target.value as ChecklistCategory })}
                aria-label="Categoria"
              >
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sessionTag">
              {sessions.find((session) => session.id === item.sessionId)?.name ?? "Feedback"}
            </div>

            <input
              className="descriptionInput"
              value={item.description}
              onChange={(event) => onUpdate(item.id, { description: event.target.value })}
              aria-label="Descripcion"
            />

            <input
              className="notesInput"
              value={item.notes}
              onChange={(event) => onUpdate(item.id, { notes: event.target.value })}
              placeholder="Notas"
              aria-label="Notas"
            />
          </article>
        ))}
      </div>
    </section>
  );
}
