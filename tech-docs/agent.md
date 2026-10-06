# Lissie

## Shape

- `lib/lissie.ts` defines the single Mastra agent, its list-only persona, the OpenRouter model, and `Memory` backed by `LibSQLStore` on `DATABASE_URL`.
- `@ag-ui/mastra` adapts that registered agent to AG-UI locally; no second Mastra server is needed.
- `OPENROUTER_MODEL` is a model name without a provider prefix; it defaults to `z-ai/glm-5.3-flash` and the agent prefixes it with `openrouter/`.
- `OPENROUTER_API_KEY` is read only by server-side model code. Never expose it through a `NEXT_PUBLIC_` variable or pass it to the browser.

## Identity and memory

- `/` resolves the Better Auth user on the server and gives the chat that user id as its explicit, stable thread id.
- The runtime derives its Mastra `resourceId` from `getUserId(request.headers)`, never from request content. The thread and resource ids are therefore both stable per-user values, and history persists in the same SQLite file as the app.
- `createLissieRuntimeHooks` authenticates every runtime request before dispatch. Its route policy allows only Lissie's run/connect, the matching user's stop/thread operations, runtime info, and transcription; unscoped thread lists, subscriptions, clears, memory endpoints, and other routes are denied.
- A foreign or missing thread id gets `404` so the response does not disclose whether another user's thread exists. Global thread operations are denied with `403` because the local runtime runner cannot scope them to an owner.
- Keep thread/resource identity server-derived. A client-provided id is an identifier to compare, not proof of ownership.

## Testing

- `lib/lissie-runtime-auth.test.ts` covers the runtime route allow/deny rules and verifies that each authenticated user's identity is the Mastra memory resource.
- `npm run test:e2e` excludes `@model` tests and remains part of QA/CI.
- `npm run test:e2e:chat` runs the separate model-backed browser conversation test. It requires `OPENROUTER_API_KEY` in the server environment.