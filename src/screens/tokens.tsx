// A runner's tokens, as a page of a panel. Server component.
import { Mono, PageHeader, Table, Td, Th, Tr } from "@/components/ui/ledger"
import { Page } from "@/components/ui/page"
import { day, relative, renderTime } from "@/lib/format"
import type { Runner } from "@/lib/runner"
import { CreateToken, RevokeToken } from "@/views/tokens"

export async function TokensScreen({
  runner: r,
  skill,
}: {
  runner: Runner
  /** The skill's address, shown with a new token. */
  skill: string
}) {
  const tokens = await r.tokens()
  const now = renderTime()
  return (
    <Page>
      <PageHeader
        title="Tokens"
        note="What your agents use to deploy. Each one can do everything the panel can."
      />
      <CreateToken skill={skill} />
      <section className="flex min-w-0 flex-col gap-3">
        {tokens.length === 0 ? (
          <p className="text-muted-foreground">
            No tokens yet. Make one for each agent or machine.
          </p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th className="w-[130px]">Token</Th>
                <Th className="w-[110px] max-sm:hidden">Created</Th>
                <Th className="w-[110px]">Last used</Th>
                <Th className="w-[110px]">Expires</Th>
                <Th className="w-[70px]" />
              </tr>
            </thead>
            <tbody>
              {tokens.map((t) => {
                const expired = t.expires_at > 0 && t.expires_at < now
                return (
                  <Tr key={t.id}>
                    <Td className="font-medium">{t.name}</Td>
                    <Td>
                      <Mono>{t.prefix}…</Mono>
                    </Td>
                    <Td className="max-sm:hidden">
                      <Mono>{relative(t.created_at, now)}</Mono>
                    </Td>
                    <Td>
                      <Mono>
                        {t.last_used_at
                          ? relative(t.last_used_at, now)
                          : "never"}
                      </Mono>
                    </Td>
                    <Td>
                      <Mono
                        className={expired ? "text-destructive" : undefined}
                      >
                        {t.expires_at
                          ? expired
                            ? "expired"
                            : day(t.expires_at)
                          : "never"}
                      </Mono>
                    </Td>
                    <Td className="text-right">
                      <RevokeToken id={t.id} name={t.name} />
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </section>
    </Page>
  )
}
