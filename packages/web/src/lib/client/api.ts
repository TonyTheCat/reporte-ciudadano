import { saveMyReport } from "./my-reports";

export interface NewReport {
  category: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  address?: string;
  extra: Record<string, string>;
  turnstile?: string;
}

export interface Created {
  report: { id: string; code: string; path: string; title: string };
  anonToken?: string;
  photosUploaded: number;
}

export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
  }
}

export async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  // Las escrituras siempre van como JSON: el servidor rechaza otros tipos (protección CSRF).
  const isWrite = !!init?.method && !["GET", "HEAD"].includes(init.method);
  const json = init?.json ?? (isWrite ? {} : undefined);
  const res = await fetch(url, {
    ...init,
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...init?.headers },
    body: json !== undefined ? JSON.stringify(json) : init?.body,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.error?.code ?? "http", data?.error?.message ?? `Error ${res.status}`, res.status);
  return data as T;
}

type Upload = { url: string; fields: Record<string, string> };

export async function uploadPhotos(uploads: Upload[], photos: Blob[], onProgress?: (done: number) => void) {
  let done = 0;
  await Promise.all(
    uploads.map(async (u, i) => {
      const form = new FormData();
      for (const [k, v] of Object.entries(u.fields)) form.append(k, v);
      form.append("file", photos[i], "foto.jpg");
      const res = await fetch(u.url, { method: "POST", body: form });
      if (!res.ok) throw new Error("No se pudo subir una foto");
      onProgress?.(++done);
    }),
  );
  return done;
}

export async function submitReport(data: NewReport, photos: Blob[], onProgress?: (msg: string) => void): Promise<Created> {
  onProgress?.("Enviando reporte…");
  const res = await api<{ report: Created["report"]; anonToken?: string; uploads: Upload[] }>("/api/reports", {
    method: "POST",
    json: { ...data, photos: photos.length },
  });
  saveMyReport({ ...res.report, token: res.anonToken, created_at: new Date().toISOString() });
  let photosUploaded = 0;
  if (res.uploads.length) {
    onProgress?.(`Subiendo fotos (0/${res.uploads.length})…`);
    photosUploaded = await uploadPhotos(res.uploads, photos, (n) => onProgress?.(`Subiendo fotos (${n}/${res.uploads.length})…`));
  }
  return { report: res.report, anonToken: res.anonToken, photosUploaded };
}
