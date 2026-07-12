# Glowfy — AI Skin Coach

> *Scan. Score. Glow.*

An always-on A2MCP agent that delivers skincare intelligence on demand. Snap your face or describe your skin → instant analysis, ingredient safety scores, and a personalized routine. The "Eat This?" of skincare — pay-per-call via x402 micropayments on X Layer.

**Hackathon:** OKX.AI Genesis Hackathon · Deadline: Jul 17 2026
**Category:** Lifestyle Companion
**ASP Type:** A2MCP

---

## What it does

Six endpoints, one purpose — give any agent (or human) deterministic, database-backed skincare intelligence:

| Endpoint | Input | Output | Price |
|---|---|---|---|
| `/skin/analyze` | Photo URL **or** text description | Skin type + 10 concern scores (0–100) + top 3 concerns | $0.05 |
| `/skin/quiz` | Age, concerns, lifestyle, climate | Full skin profile JSON | $0.03 |
| `/routine/build` | Skin profile + budget + goals | AM/PM routine + 30-day compliance plan | $0.05 |
| `/ingredients/recommend` | Skin profile | Top 5 ingredients to seek + 5 to avoid | $0.02 |
| `/ingredients/check` | Raw ingredient list | Per-ingredient safety, comedogenic score, irritation risk | $0.02 |
| `/product/match` | Product name + skin profile | Compatibility score (0–100) + verdict | $0.02 |

This is **not a web app.** Agents call endpoints directly. Payment settles per call in USDT0 on X Layer. No login, no session state, no UI to render.

---

## Stack

| Layer | Choice |
|---|---|
| Runtime | Bun + Hono |
| Payment | `@okxweb3/x402-hono` + `@okxweb3/x402-evm` + `@okxweb3/x402-core` |
| AI | Claude Sonnet 4.6 on AWS Bedrock (`my-bedrock-profile`, `us-east-1`) |
| Data | Open Beauty Facts (self-hosted SQLite) + embedded ingredient scoring tables |
| Settlement | X Layer `eip155:196`, USDT0 `0x779ded0c9e1022225f8e0630b35a9b54be713736` |
| Deploy | Render (Hong Kong or Singapore node) + custom domain + HTTPS |

---

## Key reference

**PRD — `docs/ideas/PRD.md`**

Full product spec: endpoints, pricing, stack decisions, x402 compliance checklist, OKX-confirmed critical bugs and fixes, env vars, deploy steps, registration flow, success criteria. Single source of truth — do not deviate.

---

## ⚠️ Critical x402 traps (OKX-confirmed failures)

These are confirmed root causes of ASP rejections in the TG winner hub:

**1. GET probe shape** — OKX validator probes with bare `GET`, not `POST`. POST-only endpoints return 405 → validator fails. Every endpoint must handle both GET and POST and return 402 on both.

**2. PAYMENT-REQUIRED header** — Validator reads the `PAYMENT-REQUIRED` header, not the body. Empty header = `"accepts is empty"` rejection. The SDK sets this automatically — do NOT implement x402 manually.

**3. CORS wildcard** — `Access-Control-Allow-Headers: *` breaks x402. Must explicitly list `PAYMENT-SIGNATURE`. Must expose `PAYMENT-REQUIRED` and `PAYMENT-RESPONSE`.

**4. Payment gate order** — Middleware must fire before param validation. Never return 400 before 402.

Self-check before registering:
```bash
curl -i -X GET https://your-domain/skin/analyze   # must return 402
curl -i -X POST https://your-domain/skin/analyze  # must return 402 + PAYMENT-REQUIRED header
```

---

## ⚠️ Onchain OS CLI bug (confirmed)

The bare `onchainos` CLI v4.2.0 has a provisioning bug — returns empty `apiKey`, fails every call. The v4.2.2 upgrade is also broken (checksum mismatch). **Always run Onchain OS through an agent** (OpenCode, Claude Code, Hermes) — confirmed workaround from the TG community. If the wallet gets stuck, register with a new email.

---

## Environment variables

```bash
WALLET_ADDRESS=0x<your-X-Layer-EVM-address>   # from Agentic Wallet setup
OKX_API_KEY=...
OKX_SECRET_KEY=...
OKX_PASSPHRASE=...
AWS_PROFILE=my-bedrock-profile
AWS_REGION=us-east-1
```

---

## Build phases

1. **Phase 1** — Install Onchain OS + provision Agentic Wallet (do this first, through your agent)
2. **Phase 2** — Build 6 endpoints, x402-gated, deploy to Render (HK/SG node), live HTTPS domain
3. **Phase 3** — Register as A2MCP ASP via Onchain OS (`Help me register an A2MCP ASP on OKX.AI`)
4. **Phase 4** — Submit hackathon Google form before Jul 17 23:59 UTC

---

## Success criteria

- All 6 endpoints pass OKX x402 validation on first submission
- Listed live on OKX.AI marketplace by Mon Jul 14
- 500+ orders by Thu Jul 17
- 5.0 rating
- 90-second X demo posted with #OKXAI
- Google form submitted

---

## Branding

**Name:** Glowfy
**Tagline:** *Scan. Score. Glow.*
**Palette:** `#F2C078` gold · `#1A1A1A` dark · `#FAF7F2` surface
**Logo:** 1:1 square, no text, no AI-gen, no faces, no white background. Minimal geometric (glow circle or drop).
