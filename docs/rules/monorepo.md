# Monorepo Rules

This repository is a pnpm workspace. Applications live under `apps/*`; reusable packages live under `packages/*`.

- Add workspace applications under `apps/` and shared packages under `packages/`.
- Use the `@ultrasakti` package scope for workspace package names.
- Reference local packages with the `workspace:` protocol.
- Keep app-specific features inside their app. Promote code to a package only when it has a clear cross-app responsibility.
- Do not create barrel files in `apps/*`; import from defining files or declared package exports.
- Keep one root lockfile and make dependency changes through pnpm.
