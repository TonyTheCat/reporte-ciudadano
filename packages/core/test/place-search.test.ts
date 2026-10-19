import { describe, expect, it } from "vitest";
import { buildPlaceIndex, normSearch, searchPlaces, type PlaceRow } from "../src/place-search";

const rows: PlaceRow[] = [
  ["Avda. Aviadores del Chaco y San Martín", -57.58, -25.28, "stop"],
  ["Aviadores del Chaco casi Pablo Alborno", -57.57, -25.27, "stop"],
  ["Plaza Aviadores del Chaco", -57.59, -25.29, "park"],
  ["Shopping del Sol", -57.56, -25.28, "mall", ["Del Sol"]],
  ["Cines del Sol", -57.56, -25.281, "cinema"],
  ["Paseo La Galería", -57.57, -25.28, "mall"],
  ["Banco Central del Paraguay", -57.55, -25.29, "bank"],
  ["Mcal. López y Brasil", -57.62, -25.29, "stop"],
  ["Mcal. López y Brasil", -57.62, -25.29, "stop"],
];
const index = buildPlaceIndex({ version: "v1", places: rows });
const names = (q: string) => searchPlaces(index, q).map((p) => p.name);

describe("búsqueda de paradas y lugares", () => {
  it("normaliza tildes, signos y abreviaturas de calles", () => {
    expect(normSearch("Avda. Mcal. López c/ Gral. Díaz")).toBe("avenida mariscal lopez casi general diaz");
  });

  it("encuentra por cualquier parte del nombre, sin tildes ni mayúsculas", () => {
    expect(names("del sol")).toEqual(["Cines del Sol", "Shopping del Sol"]);
    expect(names("paseo la galeria")).toEqual(["Paseo La Galería"]);
    expect(names("aviadores")).toEqual(expect.arrayContaining(["Plaza Aviadores del Chaco", "Aviadores del Chaco casi Pablo Alborno"]));
    // Las palabras pueden ir en cualquier orden.
    expect(names("brasil lopez")).toEqual(["Mcal. López y Brasil"]);
  });

  it("entiende abreviaturas y siglas que no están en el nombre", () => {
    expect(names("mariscal lopez")).toEqual(["Mcal. López y Brasil"]);
    expect(names("av aviadores san martin")).toEqual(["Avda. Aviadores del Chaco y San Martín"]);
    expect(names("BCP")).toEqual(["Banco Central del Paraguay"]);
  });

  it("primero lo que empieza como lo buscado, y una parada repetida sale una vez", () => {
    expect(names("galer")).toEqual(["Paseo La Galería"]);
    expect(names("brasil")).toEqual(["Mcal. López y Brasil"]);
    expect(names("sol")[0]).toBe("Cines del Sol");
  });

  it("no busca con menos de dos letras", () => {
    expect(names("a")).toEqual([]);
    expect(names("  ")).toEqual([]);
  });
});
