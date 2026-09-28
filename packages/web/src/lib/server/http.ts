import { DomainError } from "@rc/core/reports";
import { hashIp } from "@rc/core/util";
import type { APIContext } from "astro";
import { ZodError } from "zod";
import { config } from "./config";

export function json(data: unknown, init: ResponseInit & { cache?: string } = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", init.cache ?? "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function error(status: number, code: string, message: string) {
  return json({ error: { code, message } }, { status });
}

/** Envuelve un handler y traduce errores de dominio/validación a respuestas JSON. */
export function handle(fn: (ctx: APIContext) => Promise<Response>) {
  return async (ctx: APIContext) => {
    try {
      return await fn(ctx);
    } catch (err) {
      if (err instanceof DomainError) return error(err.status, err.code, err.message);
      if (err instanceof SyntaxError) return error(400, "bad_json", "El cuerpo de la solicitud no es JSON válido.");
      if (err instanceof ZodError) return error(400, "validation", err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
      console.error(err);
      return error(500, "internal", "Ocurrió un error inesperado.");
    }
  };
}

export function clientIp(ctx: APIContext): string {
  // CloudFront agrega la IP real del visitante.
  const h = ctx.request.headers;
  return (
    h.get("cloudfront-viewer-address")?.replace(/:\d+$/, "") ??
    h.get("x-forwarded-for")?.split(",")[0].trim() ??
    (() => {
      try {
        return ctx.clientAddress;
      } catch {
        return "0.0.0.0";
      }
    })()
  );
}

export function ipHash(ctx: APIContext) {
  return hashIp(clientIp(ctx), config.ipSalt);
}

/** Identidad para confirmaciones/denuncias: el usuario si inició sesión; si no, IP + navegador. */
export function voterId(ctx: APIContext): string {
  if (ctx.locals.user) return `u:${ctx.locals.user.id}`;
  const ua = ctx.request.headers.get("user-agent") ?? "";
  return `a:${hashIp(`${clientIp(ctx)}|${ua}`, config.ipSalt)}`;
}

export function requireStaff(ctx: APIContext) {
  const u = ctx.locals.user;
  if (!u?.isStaff) throw new DomainError("forbidden", "Necesitás permisos de moderación.", 403);
  return { id: u.id, role: u.role! };
}
