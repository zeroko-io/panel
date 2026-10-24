// Zeroko's mark: a Z of two pieces that meet at the center, on a
// 1000 × 1000 square (the Z spans 100 to 900 across, 157 to 843 down). The
// one source of the logo's mark and the apps' icons.

export const markPaths = [
  "M785.714 157V247.654C785.714 262.816 779.694 277.356 768.978 288.077L557.143 500V271.333H375.91C345.6 271.333 316.531 283.379 295.098 304.821L214.286 385.667H100V157H785.714Z",
  "M442.857 500L231.022 711.923C220.306 722.644 214.286 737.184 214.286 752.346V843H900V614.333H785.714L704.902 695.179C683.469 716.621 654.4 728.667 624.09 728.667H442.857V500Z",
]

const colors = {
  light: { ground: "#f5f3ee", mark: "#d0532a" },
  dark: { ground: "#0f0e0d", mark: "#e8673a" },
}

const paths = markPaths.map((d) => `<path d="${d}"/>`).join("")

/** The icon for browsers: the mark alone, on nothing, in the accent of the
 * system's theme. The whole square, so the Z keeps its margin. */
export const faviconSvg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">` +
  `<style>path{fill:${colors.light.mark}}` +
  `@media (prefers-color-scheme:dark){path{fill:${colors.dark.mark}}}</style>` +
  `${paths}</svg>`

/** The mark on a square in one theme, for places that need a ground: a
 * phone's home screen fills a transparent icon with black. */
export function tileSvg(theme: "light" | "dark"): string {
  const c = colors[theme]
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">` +
    `<rect width="1000" height="1000" fill="${c.ground}"/>` +
    `<g fill="${c.mark}">${paths}</g></svg>`
  )
}
