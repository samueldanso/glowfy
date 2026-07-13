# Glowfy

> Scan. Score. Glow.

AI Skin Coach — an always-on A2MCP agent on [OKX.AI](https://okx.ai) that delivers skincare intelligence via x402-gated endpoints. Six tools: analyze skin via selfie or quiz, build AM/PM routines, check ingredient safety, match products to your profile.

Database-backed scoring from published dermatological research (Fulton 1989, EWG Skin Deep, CIR safety assessments) and 1900+ real products from Open Beauty Facts. No hallucinated data.

**Agent ID:** 5264 · **Category:** Lifestyle Companion · **Network:** X Layer

## Endpoints

| Endpoint | What it does | Price |
|---|---|---|
| `/skin/analyze` | Photo or text → skin type + 10 concern scores (0–100) | $0.05 |
| `/skin/quiz` | Lifestyle quiz → full skin profile (no photo needed) | $0.03 |
| `/routine/build` | Skin profile → AM/PM routine + 30-day compliance plan | $0.05 |
| `/ingredients/check` | Ingredient list → per-ingredient safety scores + rating | $0.02 |
| `/ingredients/recommend` | Skin profile → top ingredients to seek + avoid | $0.02 |
| `/product/match` | Product + skin profile → compatibility score + verdict | $0.02 |

## How it works

1. Agent calls an endpoint → gets HTTP 402 + payment challenge
2. Agent signs payment via OKX Agent Payments Protocol (x402, USDT0 on X Layer)
3. Request replays with payment → endpoint returns structured JSON result
4. Settlement confirms on-chain via `transferWithAuthorization` (EIP-3009)

No login. No session state. No UI. One call, one result, one payment.

## Stack

- **Runtime:** Bun + Hono
- **Payment:** `@okxweb3/x402-hono` (OKX Payment SDK)
- **AI:** Claude Sonnet 4.6 on AWS Bedrock (vision + text)
- **Data:** SQLite (Open Beauty Facts) + embedded ingredient scoring (199 ingredients)
- **Settlement:** X Layer `eip155:196`, USDT0
- **Deploy:** Render (Singapore)

## Development

```bash
bun install          # install deps
bun run dev          # hot-reload dev server on :3000
bun run test         # vitest (45 tests)
bun run check        # biome lint + format
bun run typecheck    # tsc --noEmit
```

## Self-check

```bash
curl -i -X GET https://glowfy.onrender.com/skin/analyze
# Must return HTTP 402 + PAYMENT-REQUIRED header

curl -i -X POST https://glowfy.onrender.com/skin/analyze
# Must return HTTP 402 + PAYMENT-REQUIRED header

curl https://glowfy.onrender.com/
# {"status":"ok","agent":"Glowfy","version":"1.0.0"}
```

## License

Proprietary. Built for OKX.AI Genesis Hackathon 2026.
