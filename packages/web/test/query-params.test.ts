import type { APIContext } from "astro";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as listGet } from "../src/pages/api/reports/index";
import { GET as tileGet } from "../src/pages/tiles/[z]/[x]/[y]";

const { listReports, reportTile } = vi.hoisted(() => ({
  listReports: vi.fn(async () => []),
  reportTile: vi.fn(async () => Buffer.from([0x1a])),
}));
vi.mock("@rc/core/reports", async (importOriginal) => ({ ...(await importOriginal<typeof import("@rc/core/reports")>()), listReports }));
vi.mock("@rc/core/tiles", () => ({ reportTile }));

beforeEach(() => {
  listReports.mockClear();
  reportTile.mockClear();
});

// Los endpoints solo leen `url` (y `params` en los tiles).
function request(path: string, params: APIContext["params"] = {}): APIContext {
  return { params, url: new URL(`https://ciudadano.test${path}`) } as APIContext;
}

async function expectValidationError(res: Response) {
  expect(res.status).toBe(400);
  expect(await res.json()).toMatchObject({ error: { code: "validation" } });
}

describe("GET /api/reports", () => {
  it.each(["limit=abc", "limit=-1", "limit=0", "limit=201", "status=cualquiercosa", "bbox=1,2,3", "bbox=a,b,c,d"])(
    "rechaza %s con 400 sin consultar la base",
    async (query) => {
      await expectValidationError(await listGet(request(`/api/reports?${query}`)));
      expect(listReports).not.toHaveBeenCalled();
    },
  );

  it("pasa los filtros válidos ya convertidos", async () => {
    const res = await listGet(request("/api/reports?bbox=-57.7,-25.4,-57.5,-25.2&status=abiertos&category=baches&limit=50&q=calle"));
    expect(res.status).toBe(200);
    expect(listReports).toHaveBeenCalledWith({
      bbox: [-57.7, -25.4, -57.5, -25.2], status: "abiertos", category: "baches", limit: 50, q: "calle",
    });
  });

  it("ignora parámetros vacíos y no deja pedir otra visibilidad", async () => {
    await listGet(request("/api/reports?status=&visibility=hidden"));
    expect(listReports).toHaveBeenCalledWith({ limit: 30 });
  });
});

describe("GET /tiles", () => {
  const tile = (query: string) => request(`/tiles/5/10/18.pbf${query}`, { z: "5", x: "10", y: "18.pbf" });

  it("rechaza un estado desconocido con 400 sin consultar la base", async () => {
    await expectValidationError(await tileGet(tile("?status=cualquiercosa")));
    expect(reportTile).not.toHaveBeenCalled();
  });

  it("pasa los filtros válidos", async () => {
    expect((await tileGet(tile("?status=resuelto&category=baches"))).status).toBe(200);
    expect(reportTile).toHaveBeenCalledWith(5, 10, 18, { status: "resuelto", category: "baches" });
  });
});
