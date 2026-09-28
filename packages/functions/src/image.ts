import sharp from "sharp";

export interface Box {
  Left: number;
  Top: number;
  Width: number;
  Height: number;
}

export interface ModerationLabel {
  Name?: string;
  ParentName?: string;
  Confidence?: number;
}

// Categorías de Rekognition (v7). Lo sexual se rechaza; lo violento/gráfico queda para revisión humana
// porque un reporte de inseguridad puede incluirlo legítimamente.
const REJECT = new Set(["Explicit", "Explicit Nudity", "Non-Explicit Nudity of Intimate parts and Kissing"]);
const REVIEW = new Set(["Violence", "Visually Disturbing", "Hate Symbols", "Drugs & Tobacco", "Rude Gestures", "Swimwear or Underwear"]);

export function decide(labels: ModerationLabel[]): "approved" | "review" | "rejected" {
  const names = labels.flatMap((l) => [l.Name, l.ParentName]).filter(Boolean) as string[];
  if (names.some((n) => REJECT.has(n))) return "rejected";
  if (names.some((n) => REVIEW.has(n))) return "review";
  return "approved";
}

/** Normaliza: corrige orientación, limita tamaño y quita EXIF (incluido GPS). */
export async function normalize(input: Buffer) {
  const { data, info } = await sharp(input, { failOn: "error", limitInputPixels: 50_000_000 })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** Difumina cada caja (coordenadas relativas 0..1 de Rekognition) con un margen extra. */
export async function blurBoxes(input: Buffer, width: number, height: number, boxes: Box[], pad = 0.2) {
  if (!boxes.length) return input;
  const overlays = await Promise.all(
    boxes.map(async (b) => {
      const left = Math.max(0, Math.floor((b.Left - b.Width * pad) * width));
      const top = Math.max(0, Math.floor((b.Top - b.Height * pad) * height));
      const w = Math.min(width - left, Math.ceil(b.Width * (1 + 2 * pad) * width));
      const h = Math.min(height - top, Math.ceil(b.Height * (1 + 2 * pad) * height));
      if (w < 2 || h < 2) return null;
      const sigma = Math.max(8, Math.min(w, h) / 6);
      const patch = await sharp(input).extract({ left, top, width: w, height: h }).blur(sigma).toBuffer();
      return { input: patch, left, top };
    }),
  );
  return sharp(input)
    .composite(overlays.filter((o) => o !== null))
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
}

export async function thumbnail(input: Buffer) {
  return sharp(input).resize({ width: 480, height: 480, fit: "cover" }).jpeg({ quality: 72, mozjpeg: true }).toBuffer();
}
