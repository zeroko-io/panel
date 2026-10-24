// The page's icon: Zeroko's mark on a square that follows the system's
// theme.
import { faviconSvg } from "@/lib/brand"

export function GET() {
  return new Response(faviconSvg, {
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=86400",
    },
  })
}
