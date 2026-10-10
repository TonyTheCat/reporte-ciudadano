import { useEffect, useState } from "react";
import { api, uploadPhotos } from "../../lib/client/api";
import { compressImage } from "../../lib/client/image";
import { getMyReports } from "../../lib/client/my-reports";

const REASONS = [
  ["falso", "Es falso o no existe"],
  ["duplicado", "Está repetido"],
  ["ofensivo", "Tiene contenido ofensivo"],
  ["datos_personales", "Expone datos personales o acusa a alguien"],
  ["spam", "Es spam o publicidad"],
  ["otro", "Otro motivo"],
] as const;

export default function ReportActions(props: {
  id: string; code: string; title: string; url: string; confirmations: number;
  open: boolean; loggedIn: boolean; following: boolean; isOwner: boolean; photoCount: number;
}) {
  const [count, setCount] = useState(props.confirmations);
  const [confirmed, setConfirmed] = useState(false);
  const [following, setFollowing] = useState(props.following);
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [token, setToken] = useState<string>();
  const [uploading, setUploading] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    try {
      setConfirmed(localStorage.getItem(`rc:confirmed:${props.id}`) === "1");
    } catch {}
    setToken(getMyReports().find((r) => r.id === props.id)?.token);
  }, []);

  async function confirm() {
    const r = await api<{ added: boolean; count: number }>(`/api/reports/${props.id}/confirm`, { method: "POST" }).catch(() => null);
    if (r) setCount(r.count);
    setConfirmed(true);
    try { localStorage.setItem(`rc:confirmed:${props.id}`, "1"); } catch {}
  }

  async function toggleFollow() {
    if (!props.loggedIn) return (location.href = `/auth/login?next=${encodeURIComponent(location.pathname)}`);
    const r = await api<{ following: boolean }>(`/api/reports/${props.id}/follow`, { method: following ? "DELETE" : "POST" });
    setFollowing(r.following);
  }

  async function share() {
    const data = { title: props.title, text: `${props.title} — sumate confirmando este reporte`, url: props.url };
    if (navigator.share) return navigator.share(data).catch(() => {});
    await navigator.clipboard.writeText(props.url);
    setMsg("Enlace copiado");
    setTimeout(() => setMsg(""), 2000);
  }

  async function flag(reason: string) {
    await api(`/api/reports/${props.id}/flag`, { method: "POST", json: { reason } }).catch(() => null);
    setFlagged(true);
    setFlagOpen(false);
  }

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, 4 - props.photoCount);
    setUploading("Preparando…");
    try {
      const blobs = await Promise.all(list.map((f) => compressImage(f)));
      const { uploads } = await api<{ uploads: any[] }>(`/api/reports/${props.id}/photos`, { method: "POST", json: { count: blobs.length, anonToken: token } });
      await uploadPhotos(uploads, blobs, (n) => setUploading(`Subiendo ${n}/${uploads.length}…`));
      setMsg("Fotos enviadas. Aparecen en unos segundos.");
    } catch (e: any) {
      setMsg(e.message ?? "No se pudieron subir las fotos");
    } finally {
      setUploading("");
    }
  }

  const canAddPhotos = (props.isOwner || !!token) && props.photoCount < 4;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {props.open && (
          <button onClick={confirm} disabled={confirmed} className={`btn col-span-2 ${confirmed ? "bg-success-soft text-success" : "bg-brand-600 text-white"}`}>
            {confirmed ? "✓ Confirmaste que sigue así" : "👥 A mí también me afecta"}
            <span className="rounded-full bg-white/20 px-2 text-sm">{count}</span>
          </button>
        )}
        <button onClick={toggleFollow} className="btn-ghost">{following ? "🔔 Siguiendo" : "🔔 Seguir caso"}</button>
        <button onClick={share} className="btn-ghost">↗ Compartir</button>
        <a className="btn-ghost tint col-span-2" style={{ "--tint": "#25D366" } as React.CSSProperties} target="_blank" rel="noopener"
          href={`https://wa.me/?text=${encodeURIComponent(`${props.title} (${props.code}) — ${props.url}`)}`}>
          Compartir por WhatsApp
        </a>
      </div>
      {canAddPhotos && (
        <label className="btn-ghost w-full cursor-pointer">
          {uploading || "📷 Agregar fotos a mi reporte"}
          <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addPhotos(e.target.files)} disabled={!!uploading} />
        </label>
      )}
      {msg && <p className="text-center text-sm text-fg-muted" role="status">{msg}</p>}
      <div className="text-center">
        {flagged ? (
          <p className="text-xs text-fg-subtle">Gracias, lo vamos a revisar.</p>
        ) : (
          <button onClick={() => setFlagOpen(!flagOpen)} className="text-xs text-fg-subtle underline">Denunciar este reporte</button>
        )}
        {flagOpen && (
          <div className="popover mt-2 p-2 text-left">
            {REASONS.map(([k, label]) => (
              <button key={k} onClick={() => flag(k)} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2">{label}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
