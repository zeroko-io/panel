// The theme choice, shared by the server (which draws <html> with it) and
// the switch (which changes it).

export type Theme = "system" | "light" | "dark"

export const THEME_COOKIE = "zeroko_theme"

/** The theme in a cookie's value; anything else is "system". */
export function parseTheme(value: string | undefined): Theme {
  return value === "light" || value === "dark" ? value : "system"
}

/** The data-theme attribute for <html>: none follows the system. */
export function themeAttribute(theme: Theme): string | undefined {
  return theme === "system" ? undefined : theme
}
