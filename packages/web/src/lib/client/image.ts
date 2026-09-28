/**
 * Reduce la foto a 1600px y la re-codifica como JPEG en el navegador.
 * Re-dibujar en canvas elimina todos los metadatos EXIF (incluida la ubicación GPS).
 */
export async function compressImage(file: File, max = 1600, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions).catch(() => null);
  const source: CanvasImageSource & { width: number; height: number } = bitmap ?? (await loadImg(file));
  const scale = Math.min(1, max / Math.max(source.width, source.height));
  const w = Math.round(source.width * scale), h = Math.round(source.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(source, 0, 0, w, h);
  bitmap?.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo procesar la imagen"))), "image/jpeg", quality));
}

function loadImg(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
