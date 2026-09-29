# Tooling Rules

- Use pnpm for package management and workspace scripts.
- Keep shared environment variables in the root `.env`; do not add per-app `.env` files. Commit variable names and safe examples to `.env.example`, never secret values.
- Use the existing `with-env` script or a direct Node.js environment loader when a command needs the root environment. Do not duplicate environment-loading logic across packages.
- Use Oxlint for linting and Oxfmt for formatting. Keep their configuration at the repository root and run the package scripts provided by this workspace.
- Husky runs `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` in that order before each commit. Keep the hook in `.husky/pre-commit` and keep each command runnable from the workspace root.
- Keep local service definitions in the root `docker-compose.dev.yml`.
- Record durable architectural or tooling changes in `decision/` according to [the decision rules](../decision/rules.md).
