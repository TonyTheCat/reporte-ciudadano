import { hit } from "@rc/core/ratelimit";
import { FLAG_REASONS, flagReport } from "@rc/core/reports";
import type { APIRoute } from "astro";
import { z } from "zod";
import { error, handle, json, voterId } from "../../../../lib/server/http";

const schema = z.object({ reason: z.enum(FLAG_REASONS), note: z.string().max(500).optional() });

export const POST: APIRoute = handle(async (ctx) => {
  const body = schema.parse(await ctx.request.json());
  const voter = voterId(ctx);
  if (!(await hit(`flag:${voter}`, 20, 3600))) return error(429, "rate_limited", "Demasiadas denuncias.");
  await flagReport(ctx.params.id!, voter, body.reason, body.note);
  return json({ ok: true });
});
