# Mixing Checklist

App web sencilla para organizar correcciones de mezcla a partir del feedback de artistas.

La idea inicial es crear proyectos por cancion, pegar una lista de marcas de tiempo con comentarios, calcular automaticamente en que compas cae cada incidencia segun el BPM, y convertirlo todo en una checklist de trabajo.

## Objetivo del MVP

- Crear un proyecto de cancion.
- Guardar nombre de cancion, artista, BPM y offset de compases hasta el inicio.
- Pegar feedback en texto libre con marcas de tiempo.
- Detectar cada marca de tiempo y su descripcion.
- Calcular compas y pulso aproximado del error.
- Mostrar una tabla tipo checklist.
- Marcar tareas como hechas.
- Editar descripcion, categoria y notas internas.
- Guardar el estado localmente en el navegador al inicio.

## Documentacion

- [Plan de producto](docs/PRODUCT_PLAN.md)
- [Plan tecnico](docs/TECHNICAL_PLAN.md)
- [Feedback de ejemplo](docs/EXAMPLE_FEEDBACK.md)

## Enfoque recomendado

Primero se construira como una app web local-first: rapida, sin login, sin servidor y con datos guardados en el navegador. Cuando el flujo este validado en el estudio, se podra expandir con base de datos, usuarios, audio, exportaciones, colaboracion y plantillas.

## Comandos

```bash
npm install
npm run dev
npm test
npm run build
```

La app se guarda inicialmente en `localStorage`, asi que los proyectos quedan en el navegador desde el que se usan.

## Publicacion

El repositorio incluye un workflow de GitHub Actions para publicar en GitHub Pages cada vez que se hace push a `main`.

URL esperada:

```text
https://angelet-code.github.io/Mix-Revision/
```
