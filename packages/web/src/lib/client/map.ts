import { setWorkerUrl, type ExpressionSpecification, type Map as MLMap } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

// MapLibre 6 es solo ESM y con bundlers hay que indicarle la URL de su worker (Vite la empaqueta aparte).
setWorkerUrl(workerUrl);

// OpenFreeMap: teselas vectoriales de OSM gratuitas y sin API key.
export const BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
export const PY_CENTER: [number, number] = [-57.58, -25.3];
// Vista inicial por defecto (y para quien todavía no nos contó de dónde es).
export const ASU_BOUNDS: [[number, number], [number, number]] = [[-57.68, -25.38], [-57.52, -25.21]];
export const PY_BOUNDS: [[number, number], [number, number]] = [[-62.8, -27.7], [-54.2, -19.2]];

export const STATUS_COLORS: Record<string, string> = {
  nuevo: "#1c7ed6", verificado: "#7048e8", en_proceso: "#f08c00", derivado: "#e8590c",
  resuelto: "#2f9e44", rechazado: "#868e96", duplicado: "#868e96",
};

export function tileUrl(filters: { category?: string; status?: string }) {
  const q = new URLSearchParams();
  if (filters.category) q.set("category", filters.category);
  if (filters.status) q.set("status", filters.status);
  const qs = q.toString();
  return `${location.origin}/tiles/{z}/{x}/{y}.pbf${qs ? `?${qs}` : ""}`;
}

/** Agrega la fuente y las capas de reportes (clusters en zoom bajo, puntos en zoom alto). */
export function addReportLayers(map: MLMap, filters: { category?: string; status?: string }) {
  map.addSource("reports", { type: "vector", tiles: [tileUrl(filters)], minzoom: 0, maxzoom: 16 });
  map.addLayer({
    id: "clusters", type: "circle", source: "reports", "source-layer": "clusters",
    paint: {
      "circle-color": ["case", [">=", ["/", ["get", "resolved"], ["max", ["get", "count"], 1]], 0.5], "#2f9e44", "#d6336c"],
      "circle-opacity": 0.85,
      "circle-radius": ["interpolate", ["linear"], ["get", "count"], 1, 12, 10, 18, 100, 26, 1000, 36],
      "circle-stroke-width": 3, "circle-stroke-color": "#fff",
    },
  });
  map.addLayer({
    id: "cluster-count", type: "symbol", source: "reports", "source-layer": "clusters",
    layout: { "text-field": ["to-string", ["get", "count"]], "text-size": 12, "text-font": ["Noto Sans Bold"], "text-allow-overlap": true },
    paint: { "text-color": "#fff" },
  });
  map.addLayer({
    id: "report-points", type: "circle", source: "reports", "source-layer": "reports",
    paint: {
      "circle-color": ["get", "color"],
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 6, 16, 11],
      "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 11, 2, 16, 4],
      "circle-stroke-color": ["match", ["get", "status"], "resuelto", "#2f9e44", "en_proceso", "#f08c00", "derivado", "#e8590c", "#ffffff"],
      "circle-opacity": ["match", ["get", "status"], "resuelto", 0.55, 1],
    },
  });
}

const BUS_COLOR = "#343a40";

// Ícono "directions_bus" de Material Icons (Google, Apache-2.0), el mismo dibujo de colectivo que usa Google Maps.
const BUS_PATH = "M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z";
// Los dos íconos se dibujan al doble de resolución (pixelRatio 2) y comparten centro.
const BUS_SIZE = 44, HEADING_SIZE = 64;

function canvas(size: number) {
  const ctx = document.createElement("canvas").getContext("2d")!;
  ctx.canvas.width = ctx.canvas.height = size;
  return ctx;
}

/** Colectivo: círculo con el dibujo del bus en blanco. No gira: el rumbo lo marca la flecha de busHeadingIcon. */
function busIcon(): ImageData {
  const ctx = canvas(BUS_SIZE), c = BUS_SIZE / 2;
  ctx.beginPath();
  ctx.arc(c, c, c - 2, 0, Math.PI * 2);
  ctx.fillStyle = BUS_COLOR;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#fff";
  ctx.stroke();
  // El path es de 24x24: se escala a 26 px y se centra.
  ctx.translate(c - 13, c - 13);
  ctx.scale(26 / 24, 26 / 24);
  ctx.fillStyle = "#fff";
  ctx.fill(new Path2D(BUS_PATH));
  return ctx.getImageData(0, 0, BUS_SIZE, BUS_SIZE);
}

/** Flecha que asoma por arriba del círculo del bus; la capa la gira según el rumbo. */
function busHeadingIcon(): ImageData {
  const ctx = canvas(HEADING_SIZE), c = HEADING_SIZE / 2, edge = c - BUS_SIZE / 2;
  ctx.beginPath();
  ctx.moveTo(c, 1);
  ctx.lineTo(c + 9, edge + 5);
  ctx.lineTo(c - 9, edge + 5);
  ctx.closePath();
  ctx.fillStyle = BUS_COLOR;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#fff";
  ctx.stroke();
  return ctx.getImageData(0, 0, HEADING_SIZE, HEADING_SIZE);
}

/** Fuente y capas de los colectivos en vivo (datos del VMT, ver /api/buses). Arrancan ocultas, debajo de los reportes. */
export function addBusLayers(map: MLMap) {
  // "bus" ya existe en el sprite de la base (paradas); el nuestro lleva prefijo.
  if (!map.hasImage("rc-bus")) map.addImage("rc-bus", busIcon(), { pixelRatio: 2 });
  if (!map.hasImage("rc-bus-heading")) map.addImage("rc-bus-heading", busHeadingIcon(), { pixelRatio: 2 });
  map.addSource("buses", { type: "geojson", data: { type: "FeatureCollection", features: [] }, attribution: "Colectivos: VMT/MOPC (prototipo)" });
  const size: ExpressionSpecification = ["interpolate", ["linear"], ["zoom"], 11, 0.8, 16, 1.2];
  map.addLayer({
    id: "bus-heading", type: "symbol", source: "buses",
    layout: {
      visibility: "none",
      "icon-image": "rc-bus-heading", "icon-rotate": ["get", "bearing"], "icon-rotation-alignment": "map",
      "icon-allow-overlap": true, "icon-ignore-placement": true, "icon-size": size,
    },
  }, "clusters");
  map.addLayer({
    id: "bus-points", type: "symbol", source: "buses",
    layout: {
      visibility: "none",
      "icon-image": "rc-bus", "icon-allow-overlap": true, "icon-ignore-placement": true, "icon-size": size,
    },
  }, "clusters");
  map.addLayer({
    id: "bus-labels", type: "symbol", source: "buses", minzoom: 13,
    layout: {
      visibility: "none",
      "text-field": ["coalesce", ["get", "line"], ""], "text-font": ["Noto Sans Bold"], "text-size": 11,
      "text-offset": [0, 1.4], "text-anchor": "top", "text-optional": true,
    },
    paint: { "text-color": BUS_COLOR, "text-halo-color": "#fff", "text-halo-width": 1.5 },
  }, "clusters");
}

export function setBusesVisible(map: MLMap, visible: boolean) {
  for (const id of ["bus-heading", "bus-points", "bus-labels"]) map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
}

export function setReportFilters(map: MLMap, filters: { category?: string; status?: string }) {
  const src = map.getSource("reports") as any;
  src?.setTiles([tileUrl(filters)]);
}

/** En pantallas chicas la atribución arranca expandida y tapa el mapa; se muestra colapsada (ícono ⓘ). */
export function collapseAttribution(map: MLMap) {
  // Se cierra apenas aparece abierta, cuando llega el texto de las fuentes. Esperar a "load" no alcanza: sin
  // conexión (estilo en la caché HTTP, tiles que fallan) nunca llega, y abierta tapa los botones del mapa.
  const collapse = () => {
    const el = map.getContainer().querySelector(".maplibregl-ctrl-attrib");
    if (!el?.classList.contains("maplibregl-compact-show")) return;
    el.classList.remove("maplibregl-compact-show");
    stop();
  };
  const stop = () => {
    map.off("styledata", collapse);
    map.off("sourcedata", collapse);
    map.off("idle", last);
  };
  // En pantallas anchas no hay modo compacto: en el primer "idle" se revisa una última vez y se deja de mirar.
  const last = () => {
    collapse();
    stop();
  };
  map.on("styledata", collapse);
  map.on("sourcedata", collapse);
  map.on("idle", last);
}
