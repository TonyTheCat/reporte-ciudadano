import { ulid } from "ulid";
import { sql } from "./db";

export const MAX_PHOTOS_PER_REPORT = 4;

/** "public/abc/def.jpg" → "/media/abc/def.jpg" (ruta servida por CloudFront). */
export function mediaUrl(key: string | null): string | null {
  return key ? `/media/${key.replace(/^public\//, "")}` : null;
}

export interface Photo {
  id: string;
  report_id: string;
  kind: "report" | "resolution";
  s3_key_original: string;
  s3_key_public: string | null;
  s3_key_thumb: string | null;
  width: number | null;
  height: number | null;
  status: "processing" | "approved" | "rejected" | "review";
  moderation: Record<string, unknown>;
  created_at: Date;
}

/** Reserva filas para fotos que el cliente va a subir; devuelve las keys de S3. */
export async function reservePhotos(reportId: string, count: number, kind: Photo["kind"] = "report") {
  const [{ n }] = await sql()<{ n: number }[]>`
    SELECT count(*)::int AS n FROM report_photos WHERE report_id = ${reportId} AND kind = ${kind}`;
  const allowed = Math.max(0, Math.min(count, MAX_PHOTOS_PER_REPORT - n));
  const rows = Array.from({ length: allowed }, () => {
    const id = ulid();
    return { id, report_id: reportId, kind, s3_key_original: `uploads/${reportId}/${id}.jpg` };
  });
  if (rows.length) await sql()`INSERT INTO report_photos ${sql()(rows)}`;
  return rows;
}

export async function getPhotoByKey(key: string): Promise<Photo | undefined> {
  const [row] = await sql()<Photo[]>`SELECT * FROM report_photos WHERE s3_key_original = ${key}`;
  return row;
}

export async function completePhoto(
  id: string,
  r: { status: Photo["status"]; publicKey?: string; thumbKey?: string; width?: number; height?: number; moderation: object },
) {
  await sql()`
    UPDATE report_photos SET status = ${r.status}, s3_key_public = ${r.publicKey ?? null},
      s3_key_thumb = ${r.thumbKey ?? null}, width = ${r.width ?? null}, height = ${r.height ?? null},
      moderation = ${sql().json(r.moderation as any)}
    WHERE id = ${id}`;
  if (r.status === "approved") {
    const [p] = await sql()<{ report_id: string; kind: string }[]>`SELECT report_id, kind FROM report_photos WHERE id = ${id}`;
    await sql()`INSERT INTO report_events (report_id, type, note, actor_role)
      VALUES (${p.report_id}, 'photo', ${p.kind === "resolution" ? "Foto de la resolución" : null}, 'sistema')`;
  }
}

export async function listPhotos(reportId: string, includeAll = false): Promise<Photo[]> {
  return sql()<Photo[]>`
    SELECT * FROM report_photos WHERE report_id = ${reportId}
      ${includeAll ? sql()`` : sql()`AND status = 'approved'`}
    ORDER BY kind, created_at`;
}

export async function photoReviewQueue(): Promise<(Photo & { public_code: string; title: string })[]> {
  return sql()`
    SELECT p.*, r.public_code, r.title FROM report_photos p JOIN reports r ON r.id = p.report_id
    WHERE p.status = 'review' ORDER BY p.created_at LIMIT 100` as any;
}

export async function setPhotoStatus(id: string, status: "approved" | "rejected") {
  await sql()`UPDATE report_photos SET status = ${status} WHERE id = ${id}`;
}
