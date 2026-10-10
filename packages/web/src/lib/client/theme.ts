/**
 * Tema de colores elegido a mano. "system" (sin atributo ni clave guardada) deja que el CSS siga al sistema.
 * ThemeScript.astro aplica la misma clave antes del primer pintado; esto maneja los cambios posteriores.
 */
export const THEME_KEY = "rc-theme";
export type ThemeChoice = "system" | "light" | "dark";

export function readTheme(): ThemeChoice {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

/** Tema efectivo: el elegido, o el del sistema si no hay elección. */
export function resolvedTheme(): "light" | "dark" {
  const t = document.documentElement.dataset.theme;
  if (t === "light" || t === "dark") return t;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(choice: ThemeChoice, { save = false } = {}) {
  const root = document.documentElement;
  // Sin esto, cada elemento con `transition` anima su cambio de color y la página "parpadea" al cambiar.
  root.setAttribute("data-theme-switching", "");
  if (choice === "system") delete root.dataset.theme;
  else root.dataset.theme = choice;
  requestAnimationFrame(() => requestAnimationFrame(() => root.removeAttribute("data-theme-switching")));
  if (save) {
    try {
      if (choice === "system") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, choice);
    } catch {
      // Navegación privada o almacenamiento bloqueado: el tema vale solo para esta página.
    }
  }
  syncThemeColor(choice);
}

/**
 * Las <meta name="theme-color"> traen un color por esquema (atributo media). Con un tema elegido a mano, las
 * dos pasan a usar el color de ese tema; con "system" vuelven a su valor original.
 */
export function syncThemeColor(choice: ThemeChoice) {
  const metas = [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')];
  for (const m of metas) m.dataset.original ??= m.content;
  const forced = choice !== "system" && metas.find((m) => m.media.includes(choice))?.dataset.original;
  for (const m of metas) m.content = forced || m.dataset.original!;
}
