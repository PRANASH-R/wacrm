/**
 * Single source of truth for the color-theme catalog.
 *
 * The CSS variables themselves live in `src/app/globals.css` under
 * `html[data-theme="..."]` blocks — that file is the one we paste
 * theme tokens into. This module only carries the metadata the UI
 * (settings picker, no-flash boot script) needs.
 *
 * Adding a new theme is a two-step change:
 *   1. Append the new `html[data-theme="<id>"]` block in globals.css
 *      with every token from an existing theme (use cobalt as the
 *      shape reference).
 *   2. Add an entry below. The order here drives the picker grid.
 */

export const THEME_IDS = [
  "cobalt",
  "emerald",
  "amber",
  "cyan",
  "rose",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME: ThemeId = "cobalt";

export const STORAGE_KEY = "wacrm.theme";

/**
 * MODE — the light/dark dimension, orthogonal to the accent theme.
 *
 * The CSS variables live in `src/app/globals.css` under
 * `html[data-mode="..."]` blocks (neutral surfaces only). Applied
 * at runtime via `document.documentElement.dataset.mode`. Dark is
 * the historical default and stays the app's identity; light is the
 * opt-in eye-strain-friendly alternative.
 *
 * Persisted under its own localStorage key so it composes freely
 * with the accent choice (you can run Cobalt-light or Cobalt-dark).
 */
export const MODES = ["light", "dark"] as const;

export type Mode = (typeof MODES)[number];

export const DEFAULT_MODE: Mode = "dark";

export const MODE_STORAGE_KEY = "wacrm.mode";

export function isMode(value: unknown): value is Mode {
  return (
    typeof value === "string" && (MODES as ReadonlyArray<string>).includes(value)
  );
}

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  tagline: string;
  /**
   * Static swatch color for the picker chip. Hard-coded so the boot
   * script / picker cards don't need a getComputedStyle round trip
   * before the page settles. Must mirror `--primary` of the same
   * theme in globals.css.
   */
  swatch: string;
}

export const THEMES: ReadonlyArray<ThemeMeta> = [
  {
    id: "cobalt",
    name: "Cobalt & Cyan",
    tagline: "Option A — High-tech SaaS command center in electric cobalt and cyan.",
    swatch: "oklch(0.585 0.2 254)",
  },
  {
    id: "emerald",
    name: "WhatsApp Emerald",
    tagline: "Option B — Authentic Meta WhatsApp Business dark pine and fresh mint.",
    swatch: "oklch(0.62 0.16 162)",
  },
  {
    id: "amber",
    name: "Sunset Orange",
    tagline: "Option C — Nordic slate with warm sunset orange and golden amber.",
    swatch: "oklch(0.745 0.16 65)",
  },
  {
    id: "cyan",
    name: "Luminous Cyan",
    tagline: "Vibrant electric cyan & ocean teal — energetic, clean, and modern.",
    swatch: "oklch(0.68 0.16 210)",
  },
  {
    id: "rose",
    name: "Coral Rose",
    tagline: "Warm coral sunset — bold, modern, and distinctive.",
    swatch: "oklch(0.645 0.22 16)",
  },
];

export function isThemeId(value: unknown): value is ThemeId {
  return (
    typeof value === "string" &&
    (THEME_IDS as ReadonlyArray<string>).includes(value)
  );
}
