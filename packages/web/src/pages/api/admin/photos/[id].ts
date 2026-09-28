import { setPhotoStatus } from "@rc/core/photos";
import type { APIRoute } from "astro";
import { z } from "zod";
import { handle, json, requireStaff } from "../../../../lib/server/http";

export const POST: APIRoute = handle(async (ctx) => {
  requireStaff(ctx);
  const { status } = z.object({ status: z.enum(["approved", "rejected"]) }).parse(await ctx.request.json());
  await setPhotoStatus(ctx.params.id!, status);
  return json({ ok: true });
});
