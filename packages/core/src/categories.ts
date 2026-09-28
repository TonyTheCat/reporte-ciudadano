import { sql } from "./db";

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

export async function listCategories(): Promise<Category[]> {
  return sql()<Category[]>`
    SELECT *,
      (coalesce(active_from <= now(), true) AND coalesce(active_to > now(), true)) AS accepting
    FROM categories ORDER BY sort_order, name`;
}

export async function getCategoryBySlug(slug: string): Promise<Category | undefined> {
  const [row] = await sql()<Category[]>`
    SELECT *,
      (coalesce(active_from <= now(), true) AND coalesce(active_to > now(), true)) AS accepting
    FROM categories WHERE slug = ${slug}`;
  return row;
}

export async function setCategoryWindow(slug: string, from: Date | null, to: Date | null) {
  await sql()`UPDATE categories SET active_from = ${from}, active_to = ${to} WHERE slug = ${slug}`;
}
