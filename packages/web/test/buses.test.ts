import type { APIContext } from "astro";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BusFeature } from "../src/lib/server/buses";

// Cada test importa el módulo de nuevo: guarda en memoria la lista de empresas y los últimos buses.
async function load() {
  vi.resetModules();
  return { ...(await import("../src/lib/server/buses")), ...(await import("../src/pages/api/buses")) };
}

// El endpoint no lee nada del pedido.
const ctx = {} as APIContext;
const NOW = Date.parse("2026-10-11T15:00:00Z");
const bus = (id: number, secondsAgo: number, extra: object = {}) => ({
  id_bus: id, latitude: -25.3, longitude: -57.6, rumbo: 90, velocidad: 20,
  fecha_hora: new Date(NOW - secondsAgo * 1000).toISOString(), linea_label: "41 - 1", eot_nombre: "1° DE DICIEMBRE SRL", ...extra,
});
const ok = (data: unknown[]) => new Response(JSON.stringify({ success: true, data }));

let routes: Record<string, () => Response | Promise<Response>>;
beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
  routes = {};
  vi.stubGlobal("fetch", async (url: string) => {
    const path = url.replace("https://sistemas.mopc.gov.py/prototipo_vmt/api", "");
    const route = routes[path];
    if (!route) throw new Error(`fetch inesperado: ${path}`);
    return route();
  });
});

describe("colectivos en vivo", () => {
  it("deja afuera los buses que no reportan hace más de 2 minutos y los repetidos", async () => {
    const { liveBuses } = await load();
    const out = liveBuses([bus(1, 600), bus(2, 600), bus(1, 30), bus(1, 45), bus(3, 10, { latitude: null })], NOW);
    expect(out.map((f) => [f.properties.id, f.properties.at])).toEqual([[1, new Date(NOW - 30_000).toISOString()]]);
    expect(out[0]).toMatchObject({ geometry: { coordinates: [-57.6, -25.3] }, properties: { line: "41 - 1", bearing: 90, speed: 20 } });
  });

  it("junta los buses de todas las empresas aunque una no responda", async () => {
    routes["/empresas"] = () => ok([{ cod_catalogo: 22 }, { cod_catalogo: 44 }, { cod_catalogo: 8 }]);
    routes["/buses?cod_catalogo=22"] = () => ok([bus(1, 5)]);
    routes["/buses?cod_catalogo=44"] = () => ok([bus(2, 5)]);
    routes["/buses?cod_catalogo=8"] = () => new Response("", { status: 500 });
    const { GET } = await load();
    const res = await GET(ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=10");
    const body = (await res.json()) as { features: BusFeature[] };
    expect(body.features.map((f) => f.properties.id)).toEqual([1, 2]);
  });

  it("si el prototipo no responde devuelve 502 y el siguiente pedido vuelve a intentar", async () => {
    routes["/empresas"] = () => new Response("", { status: 503 });
    const { GET } = await load();
    expect((await GET(ctx)).status).toBe(502);
    routes["/empresas"] = () => ok([{ cod_catalogo: 22 }]);
    routes["/buses?cod_catalogo=22"] = () => ok([bus(1, 5)]);
    expect((await GET(ctx)).status).toBe(200);
  });
});
