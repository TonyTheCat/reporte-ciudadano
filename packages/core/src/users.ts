import { getArea, type Area } from "./areas";
import { sql } from "./db";
import { DomainError } from "./reports";

export interface Home {
  area: Area;
  /** "elegida": la indicó el usuario; "reportes": inferida del distrito donde más reportó. */
  source: "elegida" | "reportes";
}

/** Ciudad (distrito) del usuario para centrar el mapa. */
export async function getHome(userId: string): Promise<Home | undefined> {
  const [pref] = await sql()<{ district_id: number }[]>`SELECT district_id FROM user_prefs WHERE user_id = ${userId}`;
  if (pref) {
    const area = await getArea(pref.district_id);
    if (area) return { area, source: "elegida" };
  }
  const [top] = await sql()<{ district_id: number }[]>`
    SELECT district_id FROM reports
    WHERE reporter_user_id = ${userId} AND district_id IS NOT NULL
    GROUP BY district_id ORDER BY count(*) DESC, max(created_at) DESC LIMIT 1`;
  const area = top && (await getArea(top.district_id));
  return area ? { area, source: "reportes" } : undefined;
}

export async function setHome(userId: string, districtId: number): Promise<Area> {
  const area = await getArea(districtId);
  if (!area || area.level !== 2) throw new DomainError("validation", "Elegí un distrito válido.");
  await sql()`
    INSERT INTO user_prefs (user_id, district_id) VALUES (${userId}, ${districtId})
    ON CONFLICT (user_id) DO UPDATE SET district_id = EXCLUDED.district_id, updated_at = now()`;
  return area;
}

export async function clearHome(userId: string) {
  await sql()`DELETE FROM user_prefs WHERE user_id = ${userId}`;
}
