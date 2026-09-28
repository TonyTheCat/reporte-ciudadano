import { reservePhotos } from "@rc/core/photos";
import { DomainError, getReportById, verifyAnonToken } from "@rc/core/reports";
import type { APIRoute } from "astro";
import { z } from "zod";
import { handle, json } from "../../../../lib/server/http";
import { presignUpload } from "../../../../lib/server/services";

const schema = z.object({ count: z.number().int().min(1).max(4), anonToken: z.string().optional(), kind: z.enum(["report", "resolution"]).default("report") });

/** Reserva fotos adicionales: quien reportó (sesión o token anónimo) o staff (fotos de resolución). */
export const POST: APIRoute = handle(async (ctx) => {
  const body = schema.parse(await ctx.request.json());
  const report = await getReportById(ctx.params.id!);
  if (!report) throw new DomainError("not_found", "Reporte no encontrado.", 404);
  const user = ctx.locals.user;
  const isOwner = (user && report.reporter_user_id === user.id) || (body.anonToken && (await verifyAnonToken(report.id, body.anonToken)));
  if (body.kind === "resolution" ? !user?.isStaff : !(isOwner || user?.isStaff)) {
    throw new DomainError("forbidden", "No podés agregar fotos a este reporte.", 403);
  }
  const reserved = await reservePhotos(report.id, body.count, body.kind);
  const uploads = (await Promise.all(reserved.map((p) => presignUpload(p.s3_key_original)))).filter(Boolean);
  return json({ uploads });
});
