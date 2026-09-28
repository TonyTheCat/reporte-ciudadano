import { listCategories } from "@rc/core/categories";
import type { APIRoute } from "astro";
import { handle, json } from "../../lib/server/http";

export const GET: APIRoute = handle(async () => json(await listCategories(), { cache: "public, max-age=60, s-maxage=300" }));
