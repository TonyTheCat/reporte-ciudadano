import { listChildren, listDepartments } from "@rc/core/areas";
import type { APIRoute } from "astro";
import { handle, json } from "../../lib/server/http";

/** Departamentos, o los distritos de `?parent=<id>` (para elegir "de dónde sos"). */
export const GET: APIRoute = handle(async (ctx) => {
  const parent = Number(ctx.url.searchParams.get("parent"));
  const areas = parent > 0 ? await listChildren(parent) : await listDepartments();
  return json(areas.map((a) => ({ id: a.id, name: a.name })), { cache: "public, max-age=86400" });
});
