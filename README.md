# Glowfy

Your AI Skin Coach — database-backed skincare intelligence, pay per call.

Glowfy is an A2MCP agent on [OKX.AI](https://okx.ai/agents/5264) that analyzes skin, builds routines, checks ingredient safety, and matches products to your profile. Powered by published dermatological research (Fulton 1989, EWG Skin Deep, CIR safety assessments) and 1,900+ real products from Open Beauty Facts.

## Why Glowfy

1. **Research-backed scoring** — ingredient safety from published studies, not LLM guessing.
2. **Real product data** — 1,900+ products from Open Beauty Facts with full ingredient lists.
3. **Six focused tools** — each does one thing well, structured JSON output agents can use directly.
4. **X Layer native** — payment in USDT0, settlement on-chain via x402 protocol.

## Endpoints

| Endpoint | What it does | Price |
|---|---|---|
| `POST /skin/analyze` | Photo or text → skin type + 10 concern scores (0–100) | $0.05 |
| `POST /skin/quiz` | Lifestyle quiz → full skin profile (no photo needed) | $0.03 |
| `POST /routine/build` | Skin profile → AM/PM routine + 30-day compliance plan | $0.05 |
| `POST /ingredients/check` | Ingredient list → per-ingredient safety scores + rating | $0.02 |
| `POST /ingredients/recommend` | Skin profile → top ingredients to seek + avoid | $0.02 |
| `POST /product/match` | Product + skin profile → compatibility score + verdict | $0.02 |

## Stack

| Layer | Tech |
|---|---|
| Runtime | Bun + Hono |
| Payment | x402 protocol — USDT0 on X Layer (`eip155:196`) |
| AI | Claude Sonnet 4.6 on AWS Bedrock (vision + text) |
| Data | SQLite (Open Beauty Facts) + 199 scored ingredients |
| Deploy | Render |

## How it works

```
Photo/text → Claude vision analyzes skin → concern scores generated
                                                    ↓
Skin profile → routine built from ingredient database
                                                    ↓
Product ingredients → scored against safety research
                                                    ↓
Structured JSON returned to calling agent
```

## Quick Start

```bash
bun install
bun run dev
```

## Links

- **Marketplace:** [okx.ai/agents/5264](https://okx.ai/agents/5264)
- **Landing page:** [glowfy-chi.vercel.app](https://glowfy-ai.vercel.app)
- **Live API:** [glowfy.onrender.com](https://glowfy.onrender.com)

## License

MIT
