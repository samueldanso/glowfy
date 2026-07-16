# AGENTS.md

Instructions for AI coding agents working on this repository.

## Project

**Glowfy** — an A2MCP agent on [OKX.AI](https://okx.ai/agents/5264) that delivers skincare intelligence via x402-gated endpoints. Six tools: analyze skin via selfie or quiz, build AM/PM routines, check ingredient safety, and match products to your profile. Database-backed scoring from published dermatological research and 1,900+ real products. Payment settles per call in USDT via the x402 protocol on X Layer.

## Commands

```bash
bun install          # install deps
bun run dev          # dev server on :3000
bun run test         # vitest (45 tests)
bun run lint         # biome lint
bun run format       # biome format
bun run check        # lint + format check
bun run typecheck    # tsc --noEmit
```

## Architecture

Entry point: `src/index.ts` (Hono app, Bun default export).

### Endpoints (all x402-gated, handle GET + POST)

| Route                  | Handler                   | Price |
| ---------------------- | ------------------------- | ----- |
| `/skin/analyze`        | `src/routes/skin.ts`      | $0.05 |
| `/skin/quiz`           | `src/routes/skin.ts`      | $0.03 |
| `/routine/build`       | `src/routes/routine.ts`   | $0.05 |
| `/ingredients/check`   | `src/routes/ingredients.ts` | $0.02 |
| `/ingredients/recommend` | `src/routes/ingredients.ts` | $0.02 |
| `/product/match`       | `src/routes/product.ts`   | $0.02 |

### Public endpoints (no payment)

| Route     | Handler                  |
| --------- | ------------------------ |
| `/health` | inline in `src/index.ts` |
| `/`       | inline in `src/index.ts` |

### Key modules

| Path                    | Purpose                                      |
| ----------------------- | -------------------------------------------- |
| `src/lib/bedrock.ts`    | AWS Bedrock client (Claude Sonnet 4.6)       |
| `src/lib/db.ts`         | SQLite database (Open Beauty Facts products) |
| `src/lib/scoring.ts`    | Ingredient safety scoring (199 ingredients)  |
| `src/lib/parse.ts`      | Input parsing utilities                      |
| `src/types.ts`          | Shared type definitions                      |
| `src/data/seed-db.ts`   | Database seeding script                      |

## Stack

- **Runtime:** Bun + Hono
- **Payment:** `@okxweb3/x402-hono` + `@okxweb3/x402-evm` + `@okxweb3/x402-core`
- **AI:** Claude Sonnet 4.6 on AWS Bedrock (vision + text)
- **Data:** SQLite (Open Beauty Facts) + embedded ingredient scoring
- **Deploy:** Render

## Environment Variables

```bash
WALLET_ADDRESS=0x...          # X Layer EVM address (payment recipient)
OKX_API_KEY=...               # OKX SA API key
OKX_SECRET_KEY=...            # OKX SA secret
OKX_PASSPHRASE=...            # OKX SA passphrase
AWS_PROFILE=my-bedrock-profile
AWS_REGION=us-east-1
PORT=3000
```

## Rules

- Every endpoint must handle both GET and POST (OKX probes with bare GET).
- Payment gate fires before param validation — never return 400 before 402.
- CORS must explicitly list `PAYMENT-SIGNATURE` header and expose `PAYMENT-REQUIRED` and `PAYMENT-RESPONSE`.
- No hallucinated skincare data. Scoring is database-backed from published research.
- No stubs in production. Every endpoint returns real output.
