@AGENTS.md

# Zeroko Panel

The open source panel for one Zeroko runner (`zeroko-io/runner`): a Next.js
app, self-hosted next to the runner. It refers to no other repository;
Zeroko Cloud (private) keeps its own copy of the look and the views. Develop
with Node and npm.

## Principles

- The runner's API is the source of truth: the panel's server calls it with
  the root token; the browser never sees that token or the runner itself.
- Every page calls `requireSession()` first. Pages render on the server with
  the root token; what the browser changes goes through `/runner-api`, which
  checks the session and the origin and adds the token, so the runner's own
  errors reach the page (as toasts). Server Actions are only for signing in
  and out.
- Views take the runner from `useRunner()`, never a module of the panel's
  own.
- One look, "Ledger": colors, radii and fonts are the tokens in
  `src/app/globals.css`, each `light-dark()`: the theme follows the system
  unless the `zeroko_theme` cookie fixes it. Hairline rules, not cards; a
  serif (Lora) for titles and figures, Geist for the interface, Geist Mono
  for labels, names and logs. Components use the tokens, never raw colors.
  The accent is one token, `--brand`. Customize shadcn components in place
  rather than wrapping them.
- What users and agents deploy are services (not apps).
- `skill.md` is the agents' contract: update it with any change to what
  they can do.
- No docs in this repository: every doc is on the website (zeroko.io/docs,
  written in the private `zeroko-io/cloud`). Keep the README short.

## Layout

- `src/app`: `(panel)` the signed-in pages (a service's and the system's
  tabs are routes); `api/[...path]` the runner's API passed through for
  agents, with their own token; `runner-api/[...path]` the same API for the
  panel's pages, with the session; `skill.md` the skill (from `skill.md` at
  the root).
- `src/lib`: config from the environment, the session, the runner's client
  (`runner.ts`) and the server's root-token runner (`runner-server.ts`), the
  shared loaders, formats, the theme, the Server Actions.
- `src/components/ui`: the look (`ledger.tsx`), feedback (toasts, confirm),
  actions, the log view, the chart, navigation, `page.tsx` (view
  transitions), `runner.tsx` (`RunnerProvider`, `useRunner`).
  `src/components`: the panel's own client pieces.
- `src/views`: the client pieces of a service, the services table and
  tokens; `src/screens`: whole pages as server components (services, a
  service's frame and tabs, tokens).
- Motion: pages enter through `<Page>` (React's `ViewTransition`); links
  into something pass `transitionTypes={["nav-forward"]}`, links back
  `["nav-back"]`. Keep animations short and honor reduced motion.

## Commands

```sh
npm install
npm run dev
npm run typecheck && npm run lint && npm run build
npx shadcn@latest add <component>   # into src/components/ui
npm run test:e2e                    # Cypress, against a running panel
```

The end-to-end tests (`cypress/e2e`) run against a panel and its runner
(`CYPRESS_BASE_URL`, `http://127.0.0.1:3300` by default) with the admin's
password in `CYPRESS_PANEL_PASSWORD`. A stack for them: this repository's
`docker-compose.yml` with images built here, in its own project, on ports
3300 and 8380. Pages mark themselves hydrated (`html[data-hydrated]`), and
every visit waits for it.

## Releases

CI (`.github/workflows/ci.yml`) works like the runner's. On `main` (and
pull requests) it type-checks, lints, checks formatting, builds the image and
checks that it starts; on `main` it publishes it for amd64 and arm64 as
`sha-<commit>` and, while the commit is `main`'s newest, `dev`. The image's
last stage only copies files, so arm64 needs no emulation: keep it so.
`Dockerfile.aio` is the all-in-one image: the panel on Debian with the
runner's binaries copied from its published image (`RUNNER_TAG`, `latest`
by default) and `aio/start.sh` running both; it's checked and published
beside the panel's, every tag with `-aio`.

Versions come from git: `git describe` of the `vX.Y.Z` tags, passed to the
build as `VERSION`. To release: turn `## Unreleased` in `CHANGELOG.md` into
`## X.Y.Z`, commit, tag `vX.Y.Z` and push both at once
(`git push --atomic origin main vX.Y.Z`). Once `main`'s run of the commit
passes, the tag's run names that image `X.Y.Z`, `X.Y` and `latest` and
makes the GitHub release from the changelog.
