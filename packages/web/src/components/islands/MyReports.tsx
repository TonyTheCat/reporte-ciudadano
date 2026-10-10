import { useEffect, useState } from "react";
import { getMyReports, type MyReport } from "../../lib/client/my-reports";
import { pendingCount } from "../../lib/client/outbox";
import { timeAgo } from "../../lib/format";

/** Reportes hechos desde este dispositivo sin cuenta. */
export default function MyReports() {
  const [items, setItems] = useState<MyReport[]>([]);
  const [pending, setPending] = useState(0);
  const [code, setCode] = useState("");
  useEffect(() => {
    setItems(getMyReports());
    pendingCount().then(setPending);
  }, []);
  return (
    <div className="space-y-4">
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (code.trim()) location.href = `/r/${code.trim().toLowerCase()}`; }}>
        <input className="input" placeholder="Buscar por código (PY-2026-000123)" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Código de seguimiento" />
        <button className="btn-primary">Buscar</button>
      </form>
      {pending > 0 && <p className="rounded-xl bg-warning-soft p-3 text-sm text-warning">{pending} reporte(s) esperando conexión para enviarse.</p>}
      {items.length === 0 ? (
        <p className="text-fg-subtle">Todavía no hiciste reportes desde este dispositivo.</p>
      ) : (
        <ul className="card divide-y divide-line">
          {items.map((r) => (
            <li key={r.id}>
              <a href={r.path} className="block p-4 hover:bg-surface-2">
                <p className="font-semibold">{r.title}</p>
                <p className="text-sm text-fg-subtle"><span className="font-mono">{r.code}</span> · {timeAgo(r.created_at)}</p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
