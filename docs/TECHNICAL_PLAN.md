# Plan tecnico

## Stack recomendado

Para empezar simple:

- Frontend: React + TypeScript + Vite.
- Estilos: CSS modules o Tailwind, segun preferencia.
- Estado: Zustand o estado local de React al inicio.
- Persistencia MVP: `localStorage` o IndexedDB.
- Testing: Vitest para parser y calculos.

Cuando haga falta multiusuario o sincronizacion:

- Backend/API: Next.js, Hono o Express.
- Base de datos: SQLite/Turso para simpleza, o Postgres/Supabase si se quiere autenticacion y colaboracion.

## Estructura propuesta

```text
mixing-checklist/
  README.md
  docs/
    PRODUCT_PLAN.md
    TECHNICAL_PLAN.md
  src/
    app/
      App.tsx
      routes.tsx
    components/
      ProjectForm.tsx
      FeedbackImporter.tsx
      ChecklistTable.tsx
      StatusToggle.tsx
      CategorySelect.tsx
    features/
      projects/
        projectTypes.ts
        projectStorage.ts
        projectService.ts
      feedback/
        feedbackParser.ts
        timecode.ts
        barCalculator.ts
    pages/
      ProjectListPage.tsx
      ProjectDetailPage.tsx
      ImportFeedbackPage.tsx
    styles/
      global.css
    tests/
      feedbackParser.test.ts
      barCalculator.test.ts
```

## Modelo de datos inicial

```ts
type Project = {
  id: string;
  songName: string;
  artistName: string;
  bpm: number;
  barOffset: number;
  beatsPerBar: number;
  sessions: FeedbackSession[];
  createdAt: string;
  updatedAt: string;
  items: ChecklistItem[];
};

type FeedbackSession = {
  id: string;
  name: string;
  sourceText: string;
  importedAt: string;
  notes: string;
};

type ChecklistItem = {
  id: string;
  sessionId: string;
  originalTimecode: string;
  seconds: number;
  bar: number | null;
  beat: number | null;
  description: string;
  category: ChecklistCategory;
  status: "pending" | "done";
  notes: string;
  fingerprint: string;
  createdAt: string;
  updatedAt: string;
};

type ChecklistCategory =
  | "voice"
  | "guitar"
  | "acoustic"
  | "arrangement"
  | "editing"
  | "noise"
  | "other";
```

## Calculo de compases

Suposicion del MVP:

- Compas por defecto: `4/4`.
- `beatsPerBar = 4`.
- El offset indica cuantos compases pasan antes del inicio musical real.

Formula:

```ts
const secondsPerBeat = 60 / bpm;
const secondsPerBar = secondsPerBeat * beatsPerBar;
const musicalSeconds = timestampSeconds - barOffset * secondsPerBar;

if (musicalSeconds < 0) {
  return { bar: null, beat: null };
}

const bar = Math.floor(musicalSeconds / secondsPerBar) + 1;
const beat = Math.floor((musicalSeconds % secondsPerBar) / secondsPerBeat) + 1;
```

Ejemplo conceptual con `BPM = 120`, `4/4`, `offset = 0`:

- 1 beat dura `0.5s`.
- 1 compas dura `2s`.
- `00:09` cae en el compas `5`, pulso `3`.

## Parser de feedback

Entrada:

```text
1:05 Voz ("darte") ojo en el "dar", colocar con melodyne.
```

Salida:

```ts
{
  originalTimecode: "1:05",
  seconds: 65,
  description: 'Voz ("darte") ojo en el "dar", colocar con melodyne.'
}
```

Patrones iniciales:

```text
MM:SS descripcion
M:SS descripcion
HH:MM:SS descripcion
M.SS descripcion
MM.SS descripcion
```

Regla especial del MVP:

- Si una marca tiene punto y dos digitos despues, por ejemplo `0.25`, se interpreta como minuto/segundo: `0:25`.
- No se interpretara como decimal de segundos salvo que el usuario lo active en una preferencia futura.

## Persistencia inicial

MVP:

- Guardar todos los proyectos en `localStorage` bajo una clave versionada, por ejemplo `mixing-checklist:v1`.
- Exportar/importar JSON como copia de seguridad.
- Migrar automaticamente proyectos antiguos sin sesiones creando una sesion historica.

## Sesiones y duplicados

Cada importacion puede crear una nueva sesion de feedback o reemplazar/anadir a una sesion existente. Para evitar duplicados, cada punto genera una huella:

```ts
fingerprint = seconds + "|" + normalizedDescription;
```

La descripcion se normaliza a minusculas, sin acentos, sin puntuacion y con espacios compactados. Si el usuario pega el mismo feedback dos veces, la segunda importacion detecta `0` puntos nuevos y no duplica el checklist.

Acciones disponibles:

- Nueva sesion sin duplicar.
- Reemplazar sesion.
- Anadir a sesion sin duplicar.
- Vaciar checklist completo.
- Borrar una sesion concreta.

Futuro:

- Migrar a IndexedDB si hay audio o datos grandes.
- Migrar a base de datos si se anade login, colaboracion o sincronizacion.

## Tests importantes

Cubrir desde el principio:

- Parseo de `00:09`.
- Parseo de `0:21`.
- Parseo de `0.25` como `0:25`.
- Parseo con comas despues del timestamp.
- Calculo de compas con BPM 120 y 4/4.
- Calculo de compas con offset.
- Caso timestamp anterior al inicio musical.

## Decisiones pendientes

- Confirmar si el offset debe restarse del tiempo, como "compases antes de que empiece la cancion", o sumarse para coincidir con la numeracion del DAW.
- Confirmar si quieres trabajar siempre en `4/4` al principio.
- Decidir si el MVP debe usar solo navegador o si quieres login desde el primer dia.
