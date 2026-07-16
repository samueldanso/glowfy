# Glowfy — Product Requirements

## What

Database-backed skincare intelligence — pay per call, no guessing.

An A2MCP agent that delivers six skincare tools via x402-gated endpoints. Photo or text in, structured analysis out. Powered by published dermatological research (Fulton 1989, EWG Skin Deep, CIR safety assessments) and 1,900+ real products from Open Beauty Facts.

## For Who

Anyone who uses skincare products — people buying new products, building routines, checking ingredient safety. Also: shopping agents, health agents, and recommendation agents that need deterministic skincare data.

## Problem

People buy skincare products blindly. They don't know if ingredients are safe, comedogenic, or irritating for their skin type. LLMs hallucinate ingredient data — they'll say "niacinamide is comedogenic" (wrong) or invent safety ratings. There's no agent-native service that gives deterministic, database-backed skincare intelligence per call.

## Endpoints

| # | Endpoint | Input | Output | Price |
|---|----------|-------|--------|-------|
| 1 | `/skin/analyze` | Photo URL or text description | Skin type + 10 concern scores (0–100) + confidence | $0.05 |
| 2 | `/skin/quiz` | Age + concerns + lifestyle + climate | Full skin profile JSON | $0.03 |
| 3 | `/routine/build` | Skin profile + budget + goals | AM/PM routine + 30-day compliance plan | $0.05 |
| 4 | `/ingredients/check` | Raw ingredient list | Per-ingredient safety, comedogenic score, irritation risk | $0.02 |
| 5 | `/ingredients/recommend` | Skin profile | Top 5 ingredients to seek + 5 to avoid | $0.02 |
| 6 | `/product/match` | Product name + skin profile | Compatibility score (0–100) + verdict | $0.02 |

## Out of Scope

- Dermatological diagnosis or medical claims
- Product purchasing / affiliate links
- Custom formulation
- Progress tracking over time

## Data Sources

| Source | What it provides |
|--------|-----------------|
| **Open Beauty Facts** | 1,900+ cosmetic products with full ingredient lists |
| **EWG Skin Deep logic** | Ingredient hazard scoring methodology |
| **Comedogenic ratings** | Published dermatological research (Fulton 1989) |
| **CIR safety assessments** | Cosmetic Ingredient Review data |

All data is static and self-hosted — no external API dependencies.

## Stack

| Layer | Choice |
|---|---|
| Runtime | Bun + Hono |
| Payment | `@okxweb3/x402-hono` + `@okxweb3/x402-evm` + `@okxweb3/x402-core` |
| AI | Claude Sonnet 4.6 on AWS Bedrock (vision + text) |
| Data | SQLite (Open Beauty Facts) + embedded ingredient scoring (199 ingredients) |
| Settlement | X Layer `eip155:196`, USDT0 |
| Deploy | Render |

## x402 Compliance

- Every endpoint handles both GET and POST (OKX probes with bare GET)
- `PAYMENT-REQUIRED` header must be present (validator reads headers, not body)
- CORS must explicitly list `PAYMENT-SIGNATURE` in allowed headers
- CORS must expose `PAYMENT-REQUIRED` and `PAYMENT-RESPONSE`
- Payment gate fires before param validation

```bash
# Validation self-check
curl -i -X GET https://glowfy.onrender.com/skin/analyze   # must return 402
curl -i -X POST https://glowfy.onrender.com/skin/analyze  # must return 402 + PAYMENT-REQUIRED header
```

## Differentiation

| What others build | What Glowfy does |
|---|---|
| LLM-hallucinated ingredient advice | Database-backed scoring from published research |
| Subscription skincare apps | Pay-per-call, no account needed |
| Generic health chatbots | Structured JSON output agents can use directly |

Glowfy returns deterministic safety scores from real data. LLMs cannot reliably provide comedogenic ratings, EWG scores, or CIR assessments — these aren't in training data reliably.
