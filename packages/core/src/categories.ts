import { z } from "zod";
import { sql } from "./db";
import { DomainError } from "./reports";
import { slugify } from "./util";

export interface ExtraField {
  key: string;
  label: string;
  type: "text";
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  sort_order: number;
  active_from: Date | null;
  active_to: Date | null;
  extra_fields: ExtraField[];
  accepting: boolean;
}

const extraFieldSchema = z.object({
  key: z.string().trim().regex(/^[a-z0-9_-]{1,40}$/, "solo minúsculas, números, - y _").optional(),
  label: z.string().trim().min(1).max(60),
  type: z.literal("text").default("text"),
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(200).nullable().default(null),
  icon: z.string().trim().min(1).max(16),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "color hexadecimal, p. ej. #e8590c"),
  sort_order: z.number().int().min(0).max(9999).default(500),
  extra_fields: z.array(extraFieldSchema).max(10).default([]),
});
export type CategoryInput = z.input<typeof categoryInputSchema>;

/** Normaliza los campos extra: la clave sale de la etiqueta si no viene, y no puede repetirse. */
function normalizeExtraFields(fields: z.infer<typeof extraFieldSchema>[]): ExtraField[] {
  const out: ExtraField[] = [];
  for (const f of fields) {
    const key = f.key || slugify(f.label, 40).replace(/-/g, "_");
    if (!key) throw new DomainError("validation", `El campo “${f.label}” necesita una clave.`);
    if (out.some((o) => o.key === key)) throw new DomainError("validation", `Hay dos campos extra con la clave “${key}”.`);
    out.push({ key, label: f.label, type: "text" });
  }
  return out;
}

const SELECT = (s: ReturnType<typeof sql>) => s`
  SELECT *,
    (coalesce(active_from <= now(), true) AND coalesce(active_to > now(), true)) AS accepting
  FROM categories`;

export async function listCategories(): Promise<Category[]> {
  const s = sql();
  return s<Category[]>`${SELECT(s)} ORDER BY sort_order, name`;
}

export async function getCategoryBySlug(slug: string): Promise<Category | undefined> {
  const s = sql();
  const [row] = await s<Category[]>`${SELECT(s)} WHERE slug = ${slug}`;
  return row;
}

/** Crea una categoría. El slug sale del nombre y queda fijo: se usa en URLs y filtros. */
export async function createCategory(input: CategoryInput & { slug?: string }): Promise<Category> {
  const data = categoryInputSchema.parse(input);
  const slug = slugify(input.slug || data.name);
  if (!slug) throw new DomainError("validation", "No se pudo generar un identificador a partir del nombre.");
  const s = sql();
  const [row] = await s<{ id: number }[]>`
    INSERT INTO categories (slug, name, description, icon, color, sort_order, extra_fields)
    VALUES (${slug}, ${data.name}, ${data.description || null}, ${data.icon}, ${data.color.toLowerCase()},
      ${data.sort_order}, ${s.json(normalizeExtraFields(data.extra_fields) as any)})
    ON CONFLICT (slug) DO NOTHING
    RETURNING id`;
  if (!row) throw new DomainError("category_exists", `Ya existe una categoría con el identificador “${slug}”.`, 409);
  return (await getCategoryBySlug(slug))!;
}

export async function updateCategory(slug: string, input: CategoryInput): Promise<Category> {
  const data = categoryInputSchema.parse(input);
  const s = sql();
  const [row] = await s<{ id: number }[]>`
    UPDATE categories SET name = ${data.name}, description = ${data.description || null}, icon = ${data.icon},
      color = ${data.color.toLowerCase()}, sort_order = ${data.sort_order},
      extra_fields = ${s.json(normalizeExtraFields(data.extra_fields) as any)}
    WHERE slug = ${slug}
    RETURNING id`;
  if (!row) throw new DomainError("not_found", "La categoría no existe.", 404);
  return (await getCategoryBySlug(slug))!;
}

export async function setCategoryWindow(slug: string, from: Date | null, to: Date | null) {
  await sql()`UPDATE categories SET active_from = ${from}, active_to = ${to} WHERE slug = ${slug}`;
}
