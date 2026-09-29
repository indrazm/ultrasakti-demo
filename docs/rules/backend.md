# Backend Rules

These rules apply to `apps/api`.

## Module layout

Organize backend features under `src/modules/<module-name>/`:

```text
src/
├── index.ts
└── modules/
    └── <module-name>/
        ├── routes.ts
        ├── schema.ts
        └── services.ts
```

- `routes.ts` defines the module's Hono routes and applies request validation.
- `schema.ts` defines the module's Zod schemas and inferred types.
- `services.ts` contains reusable module operations and business logic called by routes.
- Register each module's routes in `src/index.ts` by mounting its Hono router on the app.
- Keep `src/index.ts` as the application entry point and module registration point.
- Do not create barrel files in `apps/api`.

Keep HTTP concerns in route handlers and business operations in services. Avoid importing one module's private implementation details into another module; extract genuinely shared behavior into a package only when it has a clear reusable boundary.
