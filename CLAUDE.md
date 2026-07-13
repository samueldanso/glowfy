# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Glowfy** — an A2MCP agent (not a web app) that delivers skincare intelligence via x402-gated endpoints. Agents call endpoints directly; payment settles per call in USDT0 on X Layer. No login, no session state, no UI.

Hackathon: OKX.AI Genesis Hackathon · Deadline Jul 17 2026

## Commands

```bash
bun install          # install deps
bun run dev          # hot-reload dev server on :3000
bun run lint         # biome lint
bun run format       # biome format (auto-fix)
bun run check        # biome lint + format check
bun run test         # vitest run
```

## Stack

- **Runtime:** Bun + Hono
- **Payment:** `@okxweb3/x402-hono` + `@okxweb3/x402-evm` + `@okxweb3/x402-core`
- **AI:** Claude Sonnet 4.6 on AWS Bedrock (`my-bedrock-profile`, `us-east-1`)
- **Data:** SQLite via `better-sqlite3` (Open Beauty Facts + embedded ingredient scoring)
- **Settlement:** X Layer `eip155:196`, USDT0 `0x779ded0c9e1022225f8e0630b35a9b54be713736`
- **Deploy:** Render (HK/SG node)

## Architecture

Six paid endpoints, all x402-gated:

| Endpoint | Purpose | Price |
|---|---|---|
| `/skin/analyze` | Photo/text → skin type + concern scores | $0.05 |
| `/skin/quiz` | Lifestyle survey → full skin profile | $0.03 |
| `/routine/build` | Profile → AM/PM routine + compliance plan | $0.05 |
| `/ingredients/recommend` | Profile → top ingredients to seek/avoid | $0.02 |
| `/ingredients/check` | Raw ingredient list → safety scores | $0.02 |
| `/product/match` | Product + profile → compatibility score | $0.02 |

Entry point: `src/index.ts` (Hono app, Bun default export).

## Critical x402 Rules

These are confirmed failure modes from OKX validator — violating any one causes ASP rejection:

1. **Every endpoint must handle both GET and POST** — OKX probes with bare GET. POST-only → 405 → validator fails.
2. **PAYMENT-REQUIRED header must be present** — validator reads the header, not body. Use the SDK (don't implement x402 manually).
3. **CORS: explicitly list headers** — `Access-Control-Allow-Headers: *` breaks x402. Must explicitly list `PAYMENT-SIGNATURE`. Must expose `PAYMENT-REQUIRED` and `PAYMENT-RESPONSE`.
4. **Payment gate fires before param validation** — never return 400 before 402.
5. **`resourceServer.initialize()` is handled automatically** — the SDK's `paymentMiddlewareFromHTTPServer` sets `syncFacilitatorOnStart: true` by default, which calls `httpServer.initialize()` on first request. No manual call needed. Confirmed working via on-chain tx settlement.
6. **OKX SA API keys are required** — `OKXFacilitatorClient` needs `apiKey`, `secretKey`, `passphrase` for on-chain settlement. These are separate from the Agentic Wallet.

Validation self-check:
```bash
curl -i -X GET https://your-domain/skin/analyze   # must return 402
curl -i -X POST https://your-domain/skin/analyze  # must return 402 + PAYMENT-REQUIRED header
```

## Environment Variables

```bash
WALLET_ADDRESS=0x<X-Layer-EVM-address>
OKX_API_KEY=...
OKX_SECRET_KEY=...
OKX_PASSPHRASE=...
AWS_PROFILE=my-bedrock-profile
AWS_REGION=us-east-1
PORT=3000
```

## Strict Rules

### OKX Documentation Source of Truth

When uncertain about OKX.AI, Onchain OS, x402 protocol, or payment SDK behavior, consult these sources **in order**:

1. **Primary:** `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/SamuelOS/Knowledge/Sources/` — OKX docs archive
2. **Project context:** `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/SamuelOS/Projects/Glowfy.md`
3. **SDK reference:** `references/payments/` and `references/onchainos-skills/` in this repo

Do NOT guess or hallucinate OKX API behavior. If a question about x402, payment flows, or Onchain OS cannot be answered from these sources, say so explicitly.

### AI & Framework References

When implementing AI features (LLM calls, embeddings, agents, prompt engineering) or Hono server patterns, consult these local references — no guesswork:

- **AI engineering:** `/Users/samueldanso/Resources/learn/ai-engineering-from-scratch`
- **Hono patterns:** `/Users/samueldanso/Resources/learn/hono-api-with-auth-crash-course`

### References Folder

The `references/` folder is **READ-ONLY context**. Never include it in the project build, never import from it, never add it to bundler/tsconfig paths. It exists solely as documentation to consult when implementing against the OKX SDKs.

### Project Status Log

After each major update (new branch, feature completion, deploy, phase transition), update the project log in the vault:

**`~/Library/Mobile Documents/iCloud~md~obsidian/Documents/SamuelOS/Projects/Glowfy.md`**

Append a dated entry with: branch, what changed, current state. This is the canonical project log — keep it current.

---

## Key Docs

- `docs/GLOWFY.md` — implementation overview, stack, x402 traps, build phases
- `docs/ideas/PRD.md` — full product spec (single source of truth for endpoints, pricing, deploy)
- `references/payments/` — OKX x402 payment SDK reference (READ-ONLY)
- `references/onchainos-skills/` — Onchain OS CLI skills reference (READ-ONLY)

## Onchain OS CLI

The `onchainos` binary is installed at `/Users/samueldanso/.local/bin/onchainos`. Skills are symlinked at `~/.agents/skills/okx-*`. Use the CLI directly for agentic wallet and payment operations — do not implement these manually.

### Key commands

```bash
# Wallet
onchainos wallet status          # current wallet state
onchainos wallet balance         # check balances
onchainos wallet addresses       # show addresses by chain
onchainos wallet login           # start login (OTP or AK)
onchainos wallet verify          # verify OTP
onchainos wallet send            # send tx (native or token)
onchainos wallet contract-call   # call smart contract

# Payment (x402)
onchainos payment pay            # sign x402 payment auth via TEE
onchainos payment default        # manage default payment asset
onchainos payment a2a-pay        # A2A buyer/seller charge flow
onchainos payment charge         # one-shot charge payment
onchainos payment session        # channel session: open/voucher/topup/close
onchainos payment subscription   # subscription payments

# Other useful
onchainos swap                   # DEX swap
onchainos cross-chain            # bridge swap
onchainos security               # tx/token/dapp/sig scanning
onchainos agent                  # AI agent commerce (identity, tasks, chat)
```

### Available OKX skills (in `~/.agents/skills/`)

`okx-agent-payments-protocol` · `okx-agentic-wallet` · `okx-ai` · `okx-dapp-discovery` · `okx-defi` · `okx-dex-market` · `okx-growth-competition` · `okx-guide`

Invoke these skills when performing OKX-related operations — they contain step-by-step procedures.

## Development Process

Use the `superpowers:subagent-driven-development` skill for all implementation work. Dispatch fresh subagents per task, track progress in a ledger, and keep the main context clean.

## GitHub Merge Rule (project override)

**Never squash merges.** Use `gh pr merge --merge --delete-branch` (standard merge commit).
This overrides the AGENTS.md default of `--squash`. Full commit history must be preserved.

## Competition Standard

5000+ submissions, 3 winners per category. Other teams are integrating real oracles, CoinGecko APIs, production infrastructure. We are here to WIN, not participate.

**Non-negotiable rules:**
- **No faking data.** Use real data sources (Open Beauty Facts, published research). If it can't be sourced, say so — don't invent it.
- **No "good enough for a hackathon" shortcuts.** Every piece of code ships as if it's serving 10K calls/day on day one.
- **No stubs left in production.** Every endpoint returns real, useful output.
- **No LLM-hallucinated data presented as fact.** The entire value proposition is "deterministic, database-backed intelligence" — if we fake it, we ARE the problem we claim to solve.
- **Production-grade or don't ship.** Error handling, input validation, proper types, real responses. Judges evaluate quality, not quantity.

## Known Gotcha

The bare `onchainos` CLI v4.2.0–v4.2.2 has provisioning bugs. Always run Onchain OS through an agent (Claude Code, OpenCode) — confirmed workaround.
