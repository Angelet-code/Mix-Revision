# AGENTS.md

Guia rapida para futuros chats/agentes que trabajen en este proyecto.

## Resumen del producto

Mixing Checklist es una app web local-first para organizar revisiones de mezcla musical. El usuario crea proyectos por cancion, pega feedback del artista con marcas de tiempo, la app calcula compas/pulso segun BPM y genera una checklist editable.

El foco actual es mantener la app simple, rapida y util en sesiones de estudio.

## Stack

- React 19
- TypeScript
- Vite
- CSS global en `src/styles/global.css`
- Iconos con `lucide-react`
- Tests con Vitest
- Persistencia en `localStorage`
- Deploy con GitHub Actions a GitHub Pages

## Comandos

```bash
npm install
npm run dev
npm test
npm run build
```

Servidor local habitual:

```text
http://127.0.0.1:5173/
```

URL esperada de GitHub Pages:

```text
https://angelet-code.github.io/Mix-Revision/
```

## Estructura importante

```text
src/
  app/
    App.tsx
  features/
    feedback/
      barCalculator.ts
      feedbackParser.ts
      timecode.ts
    projects/
      projectStorage.ts
      projectTypes.ts
  styles/
    global.css
  tests/
    barCalculator.test.ts
    feedbackParser.test.ts
docs/
  PRODUCT_PLAN.md
  TECHNICAL_PLAN.md
  EXAMPLE_FEEDBACK.md
.github/
  workflows/
    deploy-pages.yml
```

## Donde tocar cada cosa

- UI, flujo de pantallas, estados React: `src/app/App.tsx`
- Estilos visuales y responsive: `src/styles/global.css`
- Tipos principales de proyecto, sesiones e items: `src/features/projects/projectTypes.ts`
- Carga/guardado/migracion de `localStorage`: `src/features/projects/projectStorage.ts`
- Parseo de feedback pegado por el artista: `src/features/feedback/feedbackParser.ts`
- Parseo/formato de timestamps: `src/features/feedback/timecode.ts`
- Calculo de compas y pulso: `src/features/feedback/barCalculator.ts`
- Tests de logica pura: `src/tests/`
- Planificacion de producto/tecnica: `docs/`
- Deploy a Pages: `.github/workflows/deploy-pages.yml`

## Modelo de datos actual

`Project` contiene:

- datos musicales: cancion, artista, BPM, offset, pulsos por compas
- `sessions`: rondas de feedback del artista
- `items`: puntos de checklist

`FeedbackSession` representa una importacion/ronda de feedback.

`ChecklistItem` incluye:

- `sessionId`
- timestamp original
- segundos calculados
- compas y pulso
- descripcion
- categoria
- estado pendiente/hecho
- notas internas
- `fingerprint` para evitar duplicados

## Importacion y duplicados

El parser acepta formatos como:

```text
00:09 arreglo acustica
0:21 Arreglo acustica
0.25 Trasteo guitarra, buscar otra toma.
1:14, trasteo guitarra acustica.
```

Regla importante:

- `0.25` se interpreta como `0:25`, no como 0.25 segundos.

La deduplicacion usa:

```ts
fingerprint = seconds + "|" + normalizedDescription;
```

La descripcion se normaliza a minusculas, sin acentos, sin puntuacion y con espacios compactados.

## Sesiones de feedback

La app soporta:

- nueva sesion sin duplicar
- reemplazar sesion
- anadir a sesion sin duplicar
- filtrar checklist por sesion
- borrar una sesion
- vaciar checklist completo

Al modificar esta parte, revisar bien:

- `importFeedback()` en `App.tsx`
- tipos en `projectTypes.ts`
- migracion en `projectStorage.ts`
- tests del parser si cambia la huella o normalizacion

## Calculo musical

Formula actual:

```ts
secondsPerBeat = 60 / bpm
secondsPerBar = secondsPerBeat * beatsPerBar
musicalSeconds = timestampSeconds - barOffset * secondsPerBar
bar = floor(musicalSeconds / secondsPerBar) + 1
beat = floor((musicalSeconds % secondsPerBar) / secondsPerBeat) + 1
```

Si `musicalSeconds < 0`, compas y pulso son `null`.

## Persistencia

La app guarda proyectos en:

```text
localStorage["mixing-checklist:v1"]
```

`projectStorage.ts` incluye migracion suave para datos antiguos sin sesiones. Evitar cambios incompatibles sin migracion.

## Diseno

El estilo deseado es herramienta de estudio: oscuro, compacto, escaneable, profesional. Evitar convertirlo en una landing page o en un dashboard decorativo.

Prioridades visuales:

- checklist como centro de trabajo
- tiempos, compases y estado visibles rapido
- importador claro
- sesiones de feedback faciles de distinguir
- controles densos pero legibles

## Verificacion antes de entregar cambios

Siempre que se toque logica o UI principal:

```bash
npm test
npm run build
```

Si se cambian estilos importantes, abrir la app en navegador y revisar:

- pantalla vacia
- crear proyecto
- importar feedback de ejemplo
- checklist con varias tareas
- filtros por estado y sesion
- vista de ajustes
- ancho movil/estrecho si aplica

## GitHub Pages

El deploy usa GitHub Actions:

```text
.github/workflows/deploy-pages.yml
```

`vite.config.ts` usa:

```ts
base: "./"
```

Esto ayuda a que los assets funcionen bajo GitHub Pages.

Si Pages falla con `Failed to create deployment (status: 404)`, normalmente falta habilitar Pages en:

```text
Settings > Pages > Source: GitHub Actions
```

Si falla por permisos, revisar:

```text
Settings > Actions > General > Workflow permissions > Read and write permissions
```

## Notas de trabajo

- No subir `node_modules` ni `dist`; estan en `.gitignore`.
- Mantener la app local-first hasta que el usuario pida backend/login/sync.
- Preferir funciones puras y testeables para parser/calculos.
- No mezclar refactors grandes con cambios funcionales pequenos.
- Documentar decisiones relevantes en `docs/TECHNICAL_PLAN.md` cuando cambie el modelo o el flujo.

