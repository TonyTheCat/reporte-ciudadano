import type { APIContext } from "astro";
import { convertTo } from "astro-sst/event-mapper";
import { describe, expect, it, vi } from "vitest";
import { GET } from "../src/pages/tiles/[z]/[x]/[y]";

// Bytes >= 0x80: son los que se corrompían (U+FFFD) cuando el adaptador trataba el tile como texto.
const { tile } = vi.hoisted(() => ({ tile: Buffer.from([0x1a, 0x39, 0x0a, 0x08, 0x09, 0xc6, 0x38, 0xf4, 0x28, 0x80, 0xff]) }));
vi.mock("@rc/core/tiles", () => ({ reportTile: async () => tile }));

// El endpoint solo lee `params` y `url`.
function tileRequest(z: number, x: number, y: number, query = ""): APIContext {
  const params: APIContext["params"] = { z: String(z), x: String(x), y: `${y}.pbf` };
  return { params, url: new URL(`https://ciudadano.test/tiles/${z}/${x}/${y}.pbf${query}`) } as APIContext;
}

/** Cuerpo de la respuesta de Lambda decodificado; falla si no se envió como binario (base64). */
function lambdaBody(out: Awaited<ReturnType<typeof convertTo>>): Buffer {
  if (out && typeof out === "object" && "isBase64Encoded" in out && out.isBase64Encoded && typeof out.body === "string") {
    return Buffer.from(out.body, "base64");
  }
  throw new Error("El adaptador de Lambda envió el tile como texto: llega corrupto al navegador");
}

describe("tiles", () => {
  it("el tile MVT atraviesa el adaptador de Lambda sin perder bytes", async () => {
    const res = await GET(tileRequest(5, 10, 18, "?status=abiertos"));
    expect(res.status).toBe(200);
    const out = await convertTo({ type: "v2", response: res });
    expect(lambdaBody(out)).toEqual(tile);
  });
});
