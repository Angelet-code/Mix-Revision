# Plan de producto

## Vision

Mixing Checklist sera una app de apoyo para sesiones de mezcla. Su funcion principal es convertir feedback desordenado del artista en una lista de tareas clara, ordenada por tiempo musical y facil de ir completando.

El usuario principal es un tecnico/productor que recibe notas como:

```text
00:09 arreglo acustica
0:21 Arreglo acustica
0.25 Trasteo guitarra, buscar otra toma.
00:32 paron acustica
```

La app debe interpretar esas marcas, calcular la posicion musical y permitir trabajar sin perder el hilo.

## MVP

### 1. Proyectos de cancion

Campos iniciales:

- Nombre de la cancion.
- Artista.
- BPM.
- Offset de compases hasta empezar, por defecto `0`.
- Compas musical, por defecto `4/4`.

El compas musical puede estar oculto o avanzado al principio, pero conviene contemplarlo desde el modelo de datos.

### 2. Importador de feedback

Vista con un textarea grande para pegar el feedback del artista.

La app debe aceptar formatos comunes:

- `00:09 arreglo acustica`
- `0:21 Arreglo acustica`
- `0.25 Trasteo guitarra, buscar otra toma.`
- `1:14, trasteo guitarra acustica.`

En la primera version, `0.25` se interpretara como `0:25`, porque en feedback musical es frecuente usar punto por error o rapidez al escribir.

### 3. Tabla checklist

Columnas recomendadas:

- Estado: pendiente / hecho.
- Tiempo original.
- Compas.
- Pulso.
- Descripcion.
- Categoria.
- Notas internas.

Categorias iniciales:

- Voz.
- Guitarra.
- Acustica.
- Arreglo.
- Edicion.
- Ruido.
- Otro.

La categoria puede asignarse manualmente en el MVP. Mas adelante se puede sugerir automaticamente por palabras clave.

### 4. Flujo principal

1. Crear proyecto.
2. Introducir datos musicales.
3. Pegar feedback.
4. Revisar items detectados.
5. Generar checklist.
6. Ir marcando correcciones como hechas.
7. Mantener notas internas por item.

## Vistas iniciales

### Dashboard de proyectos

Lista de proyectos con:

- Cancion.
- Artista.
- BPM.
- Tareas pendientes.
- Ultima modificacion.

### Crear / editar proyecto

Formulario simple con los campos musicales.

### Importar feedback

Textarea de pegado, preview de items detectados y boton de importacion.

### Checklist del proyecto

Vista principal de trabajo. Debe sentirse como una herramienta de estudio: directa, densa y escaneable.

Acciones:

- Marcar hecho.
- Editar texto.
- Cambiar categoria.
- Anadir nota.
- Filtrar pendientes/hechos.
- Ordenar por tiempo.

## Fases futuras

### Fase 2: Mejoras de organizacion

- Busqueda por texto.
- Filtros por categoria.
- Prioridad: baja, media, alta.
- Duplicar proyecto.
- Exportar checklist a PDF, CSV o Markdown.

### Fase 3: Trabajo con audio

- Subir o vincular archivo de audio.
- Reproductor integrado.
- Saltar al timestamp de cada incidencia.
- Atajos de teclado para avanzar entre errores.

### Fase 4: Colaboracion

- Compartir checklist con artista.
- Comentarios por tarea.
- Estados: pendiente, en revision, corregido, aprobado.
- Historial de cambios.

### Fase 5: Inteligencia asistida

- Deteccion automatica de categorias.
- Normalizacion avanzada de feedback.
- Sugerencias de agrupacion por instrumento.
- Resumen de cambios para enviar al artista.

