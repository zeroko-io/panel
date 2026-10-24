// The icon a phone shows for the site on its home screen: the mark on warm
// black, as a PNG.
import { ImageResponse } from "next/og"
import { tileSvg } from "@/lib/brand"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  const src = `data:image/svg+xml;base64,${Buffer.from(tileSvg("dark")).toString("base64")}`
  return new ImageResponse(
    <img src={src} width={180} height={180} alt="" />,
    size
  )
}
