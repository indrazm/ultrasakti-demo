# Testing Rules

Use Vitest for unit and component tests in each app. Put tests beside the source they exercise using `*.test.ts` or `*.test.tsx` filenames. Use the app package's `test` script for a one-time run and `test:watch` while developing.

- API tests run in Node and should exercise Hono routes with `app.request()`.
- Admin and platform component tests run in jsdom with Testing Library. Prefer accessible queries such as `getByRole`.
- Use Playwright for behavior that needs a real browser or crosses route, server, and rendering boundaries. Keep E2E tests in root `tests/e2e/`.
- `pnpm test` runs all workspace unit/component test scripts. `pnpm test:e2e` runs the admin and platform browser suites; Chromium can be installed with `pnpm test:e2e:install`.
- Playwright saves HTML reports and test artifacts under the ignored `playwright-report/` and `test-results/` folders. Passing E2E tests attach a screenshot to the report. Run `pnpm test:e2e:video` to record video for every E2E test.
