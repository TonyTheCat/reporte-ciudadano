import { getHome } from "@rc/core/users";
import type { Home } from "../../components/islands/HomePicker";
import type { User } from "./auth";

/** Ciudad del usuario lista para las islas (null si no hay sesión o no se sabe). */
export async function homeFor(user: User | undefined): Promise<Home | null> {
  if (!user) return null;
  const h = await getHome(user.id).catch(() => undefined);
  return h ? { id: h.area.id, name: h.area.name, deptId: h.area.parent_id, bbox: h.area.bbox, source: h.source } : null;
}
