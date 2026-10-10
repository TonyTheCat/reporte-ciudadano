import { useState } from "react";
import { STATUS_LABEL, type Status } from "@rc/core/status";
import { api, uploadPhotos } from "../../lib/client/api";
import { compressImage } from "../../lib/client/image";

export default function AdminReportPanel({ id, status, visibility, next }: { id: string; status: Status; visibility: string; next: Status[] }) {
  const [to, setTo] = useState<Status | "">("");
  const [note, setNote] = useState("");
  const [dup, setDup] = useState("");
  const [comment, setComment] = useState("");
  const [commentPublic, setCommentPublic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    setMsg("");
    try {
      await fn();
      setMsg(ok);
      setTimeout(() => location.reload(), 600);
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  const post = (body: object) => api(`/api/admin/reports/${id}`, { method: "POST", json: body });

  return (
    <div className="space-y-5">
      <section className="card space-y-3 p-4">
        <h2 className="font-bold">Cambiar estado</h2>
        <p className="text-sm text-fg-subtle">Actual: <b>{STATUS_LABEL[status]}</b></p>
        <div className="flex flex-wrap gap-2">
          {next.map((s) => (
            <button key={s} onClick={() => setTo(s)} className={`chip px-3 py-1.5 text-sm ${to === s ? "bg-brand-600 text-white" : "bg-fill text-fg-muted"}`}>{STATUS_LABEL[s]}</button>
          ))}
        </div>
        {to === "duplicado" && <input className="input" placeholder="Código del reporte original (PY-2026-…)" value={dup} onChange={(e) => setDup(e.target.value)} />}
        {to && (
          <>
            <textarea className="input min-h-20" placeholder="Nota pública para la ciudadanía (qué se hizo, a quién se derivó…)" value={note} onChange={(e) => setNote(e.target.value)} />
            <button className="btn-primary w-full" disabled={busy} onClick={() => run(() => post({ action: "status", status: to, note: note || undefined, duplicateOf: dup || undefined }), "Estado actualizado")}>
              Pasar a “{STATUS_LABEL[to]}”
            </button>
          </>
        )}
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="font-bold">Foto de la resolución</h2>
        <label className="btn-ghost w-full cursor-pointer">
          📷 Subir foto del “después”
          <input type="file" accept="image/*" className="sr-only" onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            await run(async () => {
              const blob = await compressImage(f);
              const { uploads } = await api<{ uploads: any[] }>(`/api/reports/${id}/photos`, { method: "POST", json: { count: 1, kind: "resolution" } });
              await uploadPhotos(uploads, [blob]);
            }, "Foto subida");
          }} />
        </label>
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="font-bold">Comentario</h2>
        <textarea className="input min-h-20" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Actualización o nota interna" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={commentPublic} onChange={(e) => setCommentPublic(e.target.checked)} /> Visible al público</label>
        <button className="btn-ghost w-full" disabled={busy || !comment.trim()} onClick={() => run(() => post({ action: "comment", note: comment, public: commentPublic }), "Comentario agregado")}>Agregar comentario</button>
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="font-bold">Visibilidad</h2>
        <p className="text-sm text-fg-subtle">Actual: <b>{visibility}</b></p>
        <div className="grid grid-cols-3 gap-2">
          {(["published", "pending", "hidden"] as const).map((v) => (
            <button key={v} disabled={busy || v === visibility} onClick={() => run(() => post({ action: "visibility", visibility: v }), "Visibilidad actualizada")}
              className="btn-ghost py-2 text-sm">{{ published: "Publicar", pending: "En revisión", hidden: "Ocultar" }[v]}</button>
          ))}
        </div>
      </section>
      {msg && <p className="text-center text-sm font-semibold" role="status">{msg}</p>}
    </div>
  );
}
