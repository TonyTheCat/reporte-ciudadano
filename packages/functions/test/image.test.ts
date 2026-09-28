import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { blurBoxes, decide, normalize, thumbnail } from "../src/image";

async function checkerboard(w: number, h: number) {
  const px = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const v = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 ? 255 : 0;
      px.fill(v, (y * w + x) * 3, (y * w + x) * 3 + 3);
    }
  return sharp(px, { raw: { width: w, height: h, channels: 3 } })
    .withMetadata({ exif: { IFD0: { Make: "TestCam" } } })
    .jpeg()
    .toBuffer();
}

async function stdevOf(buf: Buffer, region: { left: number; top: number; width: number; height: number }) {
  // stats() mide la entrada, así que primero se recorta a un buffer.
  const crop = await sharp(buf).extract(region).toBuffer();
  const s = await sharp(crop).stats();
  return s.channels[0].stdev;
}

describe("imagen", () => {
  it("normaliza, reduce y borra metadatos EXIF", async () => {
    const out = await normalize(await checkerboard(2400, 1200));
    expect(out.width).toBe(1600);
    expect(out.height).toBe(800);
    const meta = await sharp(out.data).metadata();
    expect(meta.exif).toBeUndefined();
  });

  it("difumina solo la zona de la cara", async () => {
    const img = (await normalize(await checkerboard(800, 600))).data;
    const blurred = await blurBoxes(img, 800, 600, [{ Left: 0.4, Top: 0.4, Width: 0.1, Height: 0.1 }]);
    const face = { left: 330, top: 250, width: 60, height: 50 };
    const corner = { left: 10, top: 10, width: 60, height: 50 };
    expect(await stdevOf(blurred, face)).toBeLessThan((await stdevOf(img, face)) / 3);
    expect(await stdevOf(blurred, corner)).toBeGreaterThan((await stdevOf(img, corner)) * 0.8);
  });

  it("genera miniaturas de 480px", async () => {
    const t = await thumbnail(await checkerboard(1000, 700));
    const meta = await sharp(t).metadata();
    expect([meta.width, meta.height]).toEqual([480, 480]);
  });

  it("clasifica etiquetas de moderación", () => {
    expect(decide([])).toBe("approved");
    expect(decide([{ Name: "Graphic Violence", ParentName: "Violence" }])).toBe("review");
    expect(decide([{ Name: "Exposed Male Genitalia", ParentName: "Explicit" }])).toBe("rejected");
  });
});
