// End-to-end tests against a running panel and its runner
// (CYPRESS_BASE_URL), signed in with its admin password
// (CYPRESS_PANEL_PASSWORD). See CLAUDE.md for a stack to run them on.
//   npm run test:e2e
import { defineConfig } from "cypress"

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL ?? "http://127.0.0.1:3300",
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",
    defaultCommandTimeout: 15000,
    video: false,
    viewportWidth: 1280,
    viewportHeight: 800,
    env: { password: process.env.CYPRESS_PANEL_PASSWORD ?? "" },
  },
})
