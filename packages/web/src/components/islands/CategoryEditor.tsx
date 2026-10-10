import { useState } from "react";
import { api } from "../../lib/client/api";

interface ExtraField { key?: string; label: string }

export interface CategoryData {
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  sort_order: number;
  extra_fields: ExtraField[];
}

const ICONS = ["📍", "🕳️", "🚨", "🌊", "🗑️", "💡", "🚦", "🌳", "💧", "🚽", "♿", "🐕", "🔊", "🚌", "🏗️", "🔥", "🧱", "🚧", "🅿️", "🏫", "🏥", "🧹", "⚠️", "🛣️"];

/** Alta (sin `initial`) o edición de una categoría. Al guardar recarga la página para ver la lista actualizada. */
export default function CategoryEditor({ initial }: { initial?: CategoryData }) {
  const editing = !!initial;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "📍");
  const [color, setColor] = useState(initial?.color ?? "#1971c2");
  const [order, setOrder] = useState(String(initial?.sort_order ?? 500));
  const [fields, setFields] = useState<ExtraField[]>(initial?.extra_fields ?? []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (!open) {
    return (
      <button className={editing ? "btn-ghost py-2 text-sm" : "btn-primary"} onClick={() => setOpen(true)}>
        {editing ? "Editar" : "+ Nueva categoría"}
      </button>
    );
  }

  const setField = (i: number, label: string) => setFields(fields.map((f, j) => (j === i ? { ...f, label } : f)));

  async function save() {
    setBusy(true);
    setErr("");
    const body = {
      name, description: description.trim() || null, icon, color, sort_order: Number(order) || 0,
      extra_fields: fields.filter((f) => f.label.trim()).map((f) => ({ key: f.key, label: f.label })),
    };
    try {
      if (editing) await api(`/api/admin/categories/${initial.slug}`, { method: "PUT", json: body });
      else await api("/api/admin/categories", { method: "POST", json: body });
      location.reload();
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} className="card w-full space-y-4 p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full text-xl ring-2 ring-surface shadow" style={{ background: color }} aria-hidden>{icon}</span>
        <p className="font-bold">{editing ? `Editar “${initial.name}”` : "Nueva categoría"}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="cat-name">Nombre</label>
          <input id="cat-name" className="input" required minLength={2} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Obra abandonada" />
          {editing && <p className="mt-1 text-xs text-fg-subtle">Identificador fijo: <code>{initial.slug}</code></p>}
        </div>
        <div>
          <label className="label" htmlFor="cat-desc">Descripción <span className="font-normal text-fg-subtle">(opcional)</span></label>
          <input id="cat-desc" className="input" maxLength={200} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Se muestra al elegir la categoría" />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="cat-icon">Ícono</label>
        <div className="flex flex-wrap items-center gap-1.5">
          <input id="cat-icon" className="input w-20 text-center text-xl" required maxLength={16} value={icon} onChange={(e) => setIcon(e.target.value)} />
          {ICONS.map((i) => (
            <button type="button" key={i} onClick={() => setIcon(i)}
              className={`h-9 w-9 rounded-lg text-lg hover:bg-surface-2 ${icon === i ? "ring-2 ring-brand-500" : ""}`}>{i}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="cat-color">Color del marcador</label>
          <div className="flex items-center gap-2">
            <input id="cat-color" type="color" className="h-11 w-14 cursor-pointer rounded-lg border border-line-strong" value={color} onChange={(e) => setColor(e.target.value)} />
            <input className="input" pattern="#[0-9a-fA-F]{6}" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Color hexadecimal" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="cat-order">Orden</label>
          <input id="cat-order" type="number" min={0} max={9999} className="input" value={order} onChange={(e) => setOrder(e.target.value)} />
          <p className="mt-1 text-xs text-fg-subtle">Menor aparece primero. “Otros” usa 999.</p>
        </div>
      </div>

      <div>
        <p className="label">Campos extra <span className="font-normal text-fg-subtle">(opcional, texto libre)</span></p>
        <div className="space-y-2">
          {fields.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className="input py-2" maxLength={60} value={f.label} onChange={(e) => setField(i, e.target.value)} placeholder="Ej.: Empresa responsable" />
              {f.key && <code className="shrink-0 text-xs text-fg-subtle">{f.key}</code>}
              <button type="button" className="btn-ghost py-2 text-sm" onClick={() => setFields(fields.filter((_, j) => j !== i))} aria-label="Quitar campo">✕</button>
            </div>
          ))}
          {fields.length < 10 && (
            <button type="button" className="btn-ghost py-2 text-sm" onClick={() => setFields([...fields, { label: "" }])}>+ Agregar campo</button>
          )}
        </div>
      </div>

      {err && <p className="rounded-xl bg-danger-soft p-3 text-sm text-danger" role="alert">{err}</p>}

      <div className="flex gap-2">
        <button className="btn-primary" disabled={busy}>{busy ? "Guardando…" : editing ? "Guardar cambios" : "Crear categoría"}</button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
      </div>
    </form>
  );
}
