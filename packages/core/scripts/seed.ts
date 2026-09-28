/**
 * Carga las áreas administrativas en la base local.
 *   pnpm seed [--demo]   (--demo agrega reportes de ejemplo, solo para desarrollo)
 */
import { closeDb } from "../src/db";
import { seedAreas } from "../src/seed-areas";

process.env.DATABASE_URL ??= "postgres://postgres:password@localhost:5433/reporte";

async function seedDemo() {
  const { createReport } = await import("../src/reports");
  const samples = [
    { category: "bache", title: "Bache enorme sobre Mcal. López", lat: -25.2933, lng: -57.5906 },
    { category: "raudal", title: "Raudal peligroso en Av. Artigas", lat: -25.2751, lng: -57.6155 },
    { category: "vertedero-ilegal", title: "Basura acumulada frente a la plaza", lat: -25.3372, lng: -57.5089 },
    { category: "alumbrado", title: "Cuadra entera sin luz en San Lorenzo", lat: -25.3395, lng: -57.5087 },
    { category: "inseguridad", title: "Asaltos frecuentes en la parada", lat: -25.3025, lng: -57.5810 },
    { category: "propaganda-electoral", title: "Carteles de campaña siguen en la rotonda", lat: -25.5167, lng: -54.6167 },
    { category: "bache", title: "Calle destruida en Encarnación centro", lat: -27.3306, lng: -55.8667 },
  ];
  for (const s of samples) {
    const { report } = await createReport({ ...s, description: "Reporte de ejemplo", extra: {} }, {});
    console.log(`  ${report.public_code} → ${report.district_name ?? "?"}, ${report.dept_name ?? "?"}`);
  }
}

await seedAreas();
if (process.argv.includes("--demo")) await seedDemo();
await closeDb();
