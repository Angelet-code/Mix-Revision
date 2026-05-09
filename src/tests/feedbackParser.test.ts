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
});

