import type { APIRoute } from "astro";
import { currentBuses } from "../../../lib/server/buses";
import { error, handle, json } from "../../../lib/server/http";

export const GET: APIRoute = handle(async () => {
  try {
    const features = await currentBuses();
    return json({ type: "FeatureCollection", features }, { cache: "public, max-age=10, s-maxage=10" });
  } catch (err) {
    console.error(err);
    return error(502, "upstream", "No pudimos obtener la ubicación de los colectivos.");
  }
});
