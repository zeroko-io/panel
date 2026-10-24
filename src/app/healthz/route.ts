// For container health checks: the panel answers, whatever the runner does.
export function GET() {
  return new Response("ok\n")
}
