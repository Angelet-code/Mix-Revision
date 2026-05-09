import { describe, expect, it } from "vitest";
import { parseFeedback } from "../features/feedback/feedbackParser";

describe("parseFeedback", () => {
  it("parses common artist feedback timecodes", () => {
    const result = parseFeedback(`00:09 arreglo acustica
0:21 Arreglo acustica
0.25 Trasteo guitarra, buscar otra toma.
1:14, trasteo guitarra acustica.`);

    expect(result).toMatchObject([
      { originalTimecode: "00:09", seconds: 9, description: "arreglo acustica" },
      { originalTimecode: "0:21", seconds: 21, description: "Arreglo acustica" },
      { originalTimecode: "0.25", seconds: 25, description: "Trasteo guitarra, buscar otra toma." },
      { originalTimecode: "1:14", seconds: 74, description: "trasteo guitarra acustica." },
    ]);
  });

  it("infers useful starting categories", () => {
    const result = parseFeedback(`00:36 Voz ("veo") buscar otra toma.
3:33 se cuela claca de Lola`);

    expect(result[0].category).toBe("voice");
    expect(result[1].category).toBe("noise");
  });

  it("keeps untimed lines as checklist tasks", () => {
    const result = parseFeedback(`Revisar balance general del estribillo
- Subir el bajo en el segundo verso
1) Mirar automatizacion del delay`);

    expect(result).toMatchObject([
      {
        originalTimecode: "Sin tiempo",
        seconds: 0,
        hasTimecode: false,
        description: "Revisar balance general del estribillo",
      },
      {
        originalTimecode: "Sin tiempo",
        seconds: 0,
        hasTimecode: false,
        description: "Subir el bajo en el segundo verso",
        category: "bass",
      },
      {
        originalTimecode: "Sin tiempo",
        seconds: 0,
        hasTimecode: false,
        description: "Mirar automatizacion del delay",
      },
    ]);
  });

  it("accepts flexible timecode placement and multiple tasks per line", () => {
    const result = parseFeedback(`[0:36] Voz ("veo") buscar otra toma. 1:14 - guitarra acustica revisar otra toma.
Voz 2:05 demasiado fuerte`);

    expect(result).toMatchObject([
      {
        originalTimecode: "0:36",
        seconds: 36,
        hasTimecode: true,
        description: "Voz (\"veo\") buscar otra toma.",
      },
      {
        originalTimecode: "1:14",
        seconds: 74,
        hasTimecode: true,
        description: "guitarra acustica revisar otra toma.",
      },
      {
        originalTimecode: "2:05",
        seconds: 125,
        hasTimecode: true,
        description: "Voz demasiado fuerte",
      },
    ]);
  });
});
