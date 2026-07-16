# Glowfy — AI Skin Coach

> *Scan. Score. Glow.*

An always-on A2MCP agent that delivers skincare intelligence on demand. Photo or text in, structured analysis out. Six tools powered by dermatological research and 1,900+ real products.

## Architecture

This is **not a web app.** Agents call endpoints directly. Payment settles per call in USDT0 on X Layer via the x402 protocol. No login, no session state.

```
Photo/text → x402 payment settles → AI analyzes → structured JSON returned
```

## Endpoints

| Endpoint | What it does | Price |
|---|---|---|
| `/skin/analyze` | Photo or text → skin type + 10 concern scores | $0.05 |
| `/skin/quiz` | Lifestyle quiz → full skin profile | $0.03 |
| `/routine/build` | Skin profile → AM/PM routine + compliance plan | $0.05 |
| `/ingredients/check` | Ingredient list → safety scores + flags | $0.02 |
| `/ingredients/recommend` | Skin profile → ingredients to seek + avoid | $0.02 |
| `/product/match` | Product + profile → compatibility score | $0.02 |

## Links

- **Marketplace:** [okx.ai/agents/5264](https://okx.ai/agents/5264)
- **Landing page:** [glowfy-chi.vercel.app](https://glowfy-chi.vercel.app)
- **Live API:** [glowfy.onrender.com](https://glowfy.onrender.com)
