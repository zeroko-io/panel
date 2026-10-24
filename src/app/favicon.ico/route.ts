// Browsers ask for /favicon.ico whatever the page declares: the same icon as
// /icon.svg, which follows the system's theme.
import { faviconSvg } from "@/lib/brand"

export function GET() {
  return new Response(faviconSvg, {
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=86400",
    },
  })
}
