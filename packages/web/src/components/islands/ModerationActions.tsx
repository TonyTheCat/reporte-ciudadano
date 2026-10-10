import { useState } from "react";
import { api } from "../../lib/client/api";

export function PhotoDecision({ id }: { id: string }) {
  const [done, setDone] = useState<string>();
  if (done) return <p className="text-sm font-semibold">{done === "approved" ? "Aprobada" : "Rechazada"}</p>;
  const go = async (status: "approved" | "rejected") => {
    await api(`/api/admin/photos/${id}`, { method: "POST", json: { status } });
    setDone(status);
  };
  return (
    <div className="grid grid-cols-2 gap-2">
      <button className="btn-primary py-2 text-sm" onClick={() => go("approved")}>Aprobar</button>
      <button className="btn-ghost py-2 text-sm" onClick={() => go("rejected")}>Rechazar</button>
    </div>
  );
}

export function FlagDecision({ id }: { id: string }) {
  const [done, setDone] = useState<string>();
  if (done) return <p className="text-sm font-semibold">{done}</p>;
  const go = async (visibility: "published" | "hidden", label: string) => {
    await api(`/api/admin/reports/${id}`, { method: "POST", json: { action: "visibility", visibility, note: "Revisión de denuncias" } });
    setDone(label);
  };
  return (
    <div className="grid grid-cols-2 gap-2">
      <button className="btn-primary py-2 text-sm" onClick={() => go("published", "Publicado")}>Mantener</button>
      <button className="btn-ghost py-2 text-sm text-alert-fg" onClick={() => go("hidden", "Ocultado")}>Ocultar</button>
    </div>
  );
}

export function CategoryWindow({ slug, from, to }: { slug: string; from: string | null; to: string | null }) {
  const [f, setF] = useState(from?.slice(0, 10) ?? "");
  const [t, setT] = useState(to?.slice(0, 10) ?? "");
  const [msg, setMsg] = useState("");
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="text-xs">Desde<input type="date" className="input py-1.5" value={f} onChange={(e) => setF(e.target.value)} /></label>
      <label className="text-xs">Hasta<input type="date" className="input py-1.5" value={t} onChange={(e) => setT(e.target.value)} /></label>
      <button className="btn-ghost py-2 text-sm" onClick={async () => {
        try {
          await api(`/api/admin/categories/${slug}`, { method: "POST", json: { from: f || null, to: t || null } });
          setMsg("Guardado");
        } catch (e: any) { setMsg(e.message); }
      }}>Guardar</button>
      {msg && <span className="text-xs">{msg}</span>}
    </div>
  );
}
