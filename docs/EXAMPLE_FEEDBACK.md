# Feedback de ejemplo

Este archivo conserva el ejemplo inicial de feedback y define como deberia transformarse en la app.

## Entrada original

```text
00:09 arreglo acustica
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
3:33 se cuela claca de Lola
```

## Resultado esperado del parser

Sin BPM todavia no se calculan los compases. La app debe extraer primero tiempo y descripcion:

| Tiempo | Segundos | Descripcion |
| --- | ---: | --- |
| 00:09 | 9 | arreglo acustica |
| 0:21 | 21 | Arreglo acustica |
| 0.25 | 25 | Trasteo guitarra, buscar otra toma. |
| 00:32 | 32 | paron acustica |
| 00:36 | 36 | Voz ("veo") buscar otra toma. |
| 1:03 | 63 | Acorde falluco en acustica, mirar otra toma. |
| 1:05 | 65 | Voz ("darte") ojo en el "dar", colocar con melodyne un micronanomilimetro. |
| 1:14 | 74 | trasteo guitarra acustica. |
| 1:47 | 107 | Voz ("tendre") buscar otra toma o tocar con melodyne |
| 1:48 | 108 | acustica revisar otras tomas, no son los acordes |
| 2:57 | 177 | en ese silencio, hay alguna nota por ahi coleando, a ver si se puede quitar. |
| 3:21 | 201 | arreglo de guitarra (Jesus), primera nota mal, buscar en otra toma. |
| 3:33 | 213 | se cuela claca de Lola |

## Checklist generado

Columnas finales en la app:

| Hecho | Tiempo | Compas | Pulso | Categoria | Descripcion | Notas |
| --- | --- | --- | --- | --- | --- | --- |
| No | 00:09 | Calculado por BPM | Calculado por BPM | Arreglo | arreglo acustica |  |
| No | 0:21 | Calculado por BPM | Calculado por BPM | Arreglo | Arreglo acustica |  |
| No | 0.25 | Calculado por BPM | Calculado por BPM | Guitarra | Trasteo guitarra, buscar otra toma. |  |

