import { useEffect, useState } from "react";
import { api } from "../../lib/client/api";

type Option = { id: number; name: string };
export interface Home {
  id: number;
  name: string;
  deptId: number | null;
  bbox: [number, number, number, number];
  source: "elegida" | "reportes";
}

const LATER_KEY = "rc:home-later";

/**
 * "Contanos de dónde sos": guarda el distrito del usuario para que el mapa abra en su ciudad.
 * `prompt` es la tarjeta del mapa (solo si todavía no eligió); `settings` es el bloque de "Mis casos".
 */
export default function HomePicker({ home: initialHome, variant }: { home: Home | null; variant: "prompt" | "settings" }) {
  const [home, setHome] = useState(initialHome);
  const [hidden, setHidden] = useState(variant === "prompt");
  const [picking, setPicking] = useState(false);
  const [depts, setDepts] = useState<Option[]>([]);
  const [districts, setDistricts] = useState<Option[]>([]);
  const [dept, setDept] = useState<number>();
  const [district, setDistrict] = useState<number>();
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (variant !== "prompt" || initialHome?.source === "elegida") return;
    try {
      if (localStorage.getItem(LATER_KEY)) return;
    } catch {}
    setHidden(false);
  }, []);

  useEffect(() => {
    if (!picking || depts.length) return;
    api<Option[]>("/api/areas").then(setDepts).catch(() => setMsg("No se pudieron cargar los departamentos."));
    if (home?.deptId) changeDept(home.deptId, home.id);
  }, [picking]);

  async function changeDept(id: number, keep?: number) {
    setDept(id);
    setDistrict(keep);
    setDistricts([]);
    setDistricts(await api<Option[]>(`/api/areas?parent=${id}`).catch(() => []));
  }

  async function save(districtId: number) {
    setBusy("save");
    setMsg("");
    try {
      const saved = await api<Home>("/api/me/home", { method: "PUT", json: { districtId } });
      setHome(saved);
      setPicking(false);
      window.dispatchEvent(new CustomEvent("rc:home", { detail: saved.bbox }));
      setMsg(`Listo: el mapa va a abrir en ${saved.name}.`);
      if (variant === "prompt") setTimeout(() => setHidden(true), 2500);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) return setMsg("Tu navegador no permite ubicarte. Elegí tu ciudad de la lista.");
    setBusy("locate");
    setMsg("");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const r = await api<{ district: string | null; districtId: number | null }>(`/api/locate?lat=${coords.latitude}&lng=${coords.longitude}`).catch(() => null);
        setBusy("");
        if (r?.districtId) await save(r.districtId);
        else {
          setMsg("No encontramos tu ciudad desde tu ubicación. Elegila de la lista.");
          setPicking(true);
        }
      },
      () => {
        setBusy("");
        setMsg("No pudimos acceder a tu ubicación. Elegí tu ciudad de la lista.");
        setPicking(true);
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  async function remove() {
    await api("/api/me/home", { method: "DELETE" }).catch(() => null);
    setHome(null);
    setMsg("Quitamos tu ciudad.");
  }

  function later() {
    try {
      localStorage.setItem(LATER_KEY, "1");
    } catch {}
    setHidden(true);
  }

  if (hidden) return null;

  const picker = (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="sr-only">Departamento</span>
          <select className="input py-2.5" value={dept ?? ""} onChange={(e) => changeDept(Number(e.target.value))}>
            <option value="" disabled>Departamento</option>
            {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="sr-only">Ciudad</span>
          <select className="input py-2.5" value={district ?? ""} disabled={!districts.length} onChange={(e) => setDistrict(Number(e.target.value))}>
            <option value="" disabled>Ciudad</option>
            {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
      </div>
      <button className="btn-primary w-full py-2.5 text-sm" disabled={!district || !!busy} onClick={() => district && save(district)}>
        {busy === "save" ? "Guardando…" : "Guardar mi ciudad"}
      </button>
    </div>
  );

  if (variant === "settings") {
    return (
      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-fg-muted">
            {home?.source === "elegida" ? <>Tu ciudad: <b>{home.name}</b>. El mapa abre ahí.</>
              : <>Todavía no nos contaste de dónde sos{home ? <> (por tus reportes, parece <b>{home.name}</b>)</> : null}. Mientras tanto, el mapa abre en {home?.name ?? "Asunción"}.</>}
          </p>
          {!picking && (
            <div className="flex gap-2">
              <button className="btn-ghost py-2 text-sm" onClick={() => setPicking(true)}>{home?.source === "elegida" ? "Cambiar" : "Elegir mi ciudad"}</button>
              {home?.source === "elegida" && <button className="btn-ghost py-2 text-sm text-alert-fg" onClick={remove}>Quitar</button>}
            </div>
          )}
        </div>
        {picking && (
          <>
            <button className="btn-ghost w-full py-2.5 text-sm" disabled={!!busy} onClick={useMyLocation}>{busy === "locate" ? "Ubicándote…" : "📍 Usar mi ubicación"}</button>
            {picker}
          </>
        )}
        {msg && <p className="text-sm text-fg-muted" role="status">{msg}</p>}
      </div>
    );
  }

  const suggested = home?.source === "reportes" ? home : null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[6.75rem] z-20 flex justify-center px-3 md:justify-start">
      <section className="card pointer-events-auto w-full max-w-sm space-y-3 p-4 shadow-lg" aria-label="Contanos de dónde sos">
        <div>
          <h2 className="font-display text-lg font-extrabold">Contanos de dónde sos</h2>
          <p className="text-sm text-fg-muted">Así el mapa abre en tu ciudad cada vez que entrás.</p>
        </div>
        {msg && <p className="text-sm font-semibold text-accent" role="status">{msg}</p>}
        {!picking && suggested && (
          <button className="btn-primary w-full py-2.5 text-sm" disabled={!!busy} onClick={() => save(suggested.id)}>Soy de {suggested.name}</button>
        )}
        {!picking && (
          <button className={`${suggested ? "btn-ghost" : "btn-primary"} w-full py-2.5 text-sm`} disabled={!!busy} onClick={useMyLocation}>
            {busy === "locate" ? "Ubicándote…" : "📍 Usar mi ubicación"}
          </button>
        )}
        {picking ? picker : (
          <button className="w-full text-sm font-semibold text-accent hover:underline" onClick={() => setPicking(true)}>Elegir de la lista</button>
        )}
        <button className="w-full text-xs text-fg-subtle hover:underline" onClick={later}>Ahora no</button>
      </section>
    </div>
  );
}
