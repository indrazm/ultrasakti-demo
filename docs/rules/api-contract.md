# API Contract Rules

The API uses Hono, Zod, and `@hono/zod-validator`.

- Define request schemas in the owning module's `schema.ts`.
- Validate route input with `zValidator` before using it in a handler.
- Infer TypeScript types from Zod schemas instead of maintaining duplicate request types.
- Return consistent JSON response shapes and appropriate HTTP status codes.
- Keep validation and transport concerns in `routes.ts`; put business operations in `services.ts`.
- Do not claim an OpenAPI specification or generated API client is authoritative until one is added and maintained as part of the workspace.
