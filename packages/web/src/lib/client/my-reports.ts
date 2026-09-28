// Reportes hechos desde este dispositivo (sin cuenta). El token permite agregar fotos luego.
export interface MyReport {
  id: string;
  code: string;
  path: string;
  title: string;
  token?: string;
  created_at: string;
}

const KEY = "rc:my-reports";

export function getMyReports(): MyReport[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveMyReport(r: MyReport) {
  try {
    const list = getMyReports().filter((x) => x.id !== r.id);
    localStorage.setItem(KEY, JSON.stringify([r, ...list].slice(0, 200)));
  } catch {
    /* almacenamiento no disponible */
  }
}
