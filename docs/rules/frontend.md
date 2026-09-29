# Frontend Rules

These rules apply to `apps/platform` and `apps/admin`.

## Routes and modules

Keep each page directly under `src/routes/`. Route files define pages and may compose components from the relevant module. Do not move route pages into `src/modules/`.

Put reusable, feature-specific code under `src/modules/<module-name>/`:

```text
src/
├── routes/
│   ├── __root.tsx
│   └── <page>.tsx
└── modules/
    └── <module-name>/
        ├── components/
        ├── hooks/
        ├── api/
        └── types.ts
```

- `components/*.tsx` contains reusable UI components for the module.
- `hooks/*` contains reusable custom hooks for the module.
- `api/*` contains functions that fetch data or perform module operations, not general utilities.
- `types.ts` contains types shared by files in the module.
- Use `packages/ui` for shared UI primitives and keep app-specific features in the app.

## Routing, server state, and UI

- Use TanStack Router's file-based routing. Keep route definitions aligned with the files under `src/routes/`.
- Use TanStack Query for server state and asynchronous data fetching. Keep query and mutation functions close to their feature in `src/modules/<module-name>/api/`.
- Use the shared `packages/ui` shadcn components before introducing duplicated primitives.
- Keep route pages readable by composing module components rather than building reusable feature UI inline.

## Imports

Do not create barrel files in either app. Import from the defining file or a package's declared export.
