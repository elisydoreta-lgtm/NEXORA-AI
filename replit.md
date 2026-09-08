# NEXORA AI

Mobile-first business intelligence and operations workspace for small and medium businesses, with executive metrics, AI insights, and human-approved actions.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/luma-focus/src/App.tsx` — NEXORA AI product shell, routes, local demo interactions, and API-ready UI boundaries
- `artifacts/luma-focus/src/index.css` — NEXORA AI visual tokens and shared styling
- `artifacts/api-server` — secure BFF for the NEXORA backend and the n8n orchestrator
- `lib/api-spec/openapi.yaml` — API contract source of truth for the NEXORA integration

## Architecture decisions

- The browser calls only same-origin `/api/nexora/*` endpoints. Private backend and n8n URLs/tokens stay on the API server.
- The UI renders operational data only when the BFF confirms `source: live`; unavailable integrations render an explicit unavailable state.
- High-impact actions are represented as approval requests; UI silence never implies approval.
- The shell is mobile-first with the primary business areas exposed through Dashboard, IA, Clientes, Vendas, Finanças, and Mais.
- The n8n workflow is called by `POST /api/nexora/intelligence`; orchestration is never implemented in the web artifact.

## Product

NEXORA AI gives business owners and managers an executive view of revenue, sales, finance, stock, customers, suppliers, alerts, and AI-generated recommendations. The NEXORA Intelligence surface explains business signals and routes material actions through explicit human approval.

## User preferences

- Portuguese product copy for the current interface.
- Professional, premium, trustworthy, business-first presentation.

## Gotchas

- Without the private integration variables, the visible app remains in an unavailable state; do not add sample metrics as a fallback.
- Do not place credentials or API keys in the frontend.
- Configure `NEXORA_BACKEND_URL`, `NEXORA_BACKEND_TOKEN`, `N8N_ORCHESTRATOR_URL`, and `N8N_ORCHESTRATOR_TOKEN` only in the server environment.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
