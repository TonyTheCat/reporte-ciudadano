import { submitReport, type NewReport } from "./api";

// Cola de reportes hechos sin conexión (IndexedDB guarda también las fotos).
const DB = "rc-outbox", STORE = "reports";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then((db) => new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

export async function queueReport(data: NewReport, photos: Blob[]) {
  await tx("readwrite", (s) => s.add({ data: { ...data, turnstile: undefined }, photos, queued_at: Date.now() }));
}

export async function pendingCount(): Promise<number> {
  try {
    return await tx("readonly", (s) => s.count());
  } catch {
    return 0;
  }
}

let flushing = false;
export async function flushOutbox() {
  if (flushing || !navigator.onLine || typeof indexedDB === "undefined") return;
  flushing = true;
  try {
    const items = await tx<any[]>("readonly", (s) => s.getAll());
    for (const item of items) {
      try {
        await submitReport(item.data, item.photos);
        await tx("readwrite", (s) => s.delete(item.id));
      } catch (err: any) {
        // Errores de validación no se van a arreglar reintentando.
        if (err?.status && err.status < 500 && err.status !== 429) await tx("readwrite", (s) => s.delete(item.id));
        else break;
      }
    }
  } catch {
    /* IndexedDB no disponible */
  } finally {
    flushing = false;
  }
}
