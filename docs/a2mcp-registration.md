# Glowfy — A2MCP Registration & Listing

> Reference for the exact info needed when running registration. When ready, use the Glowfy seller wallet (`samueldanso.sg@gmail.com`).

## Step 1: Register as A2MCP ASP

**Prompt to send:**
```
Help me register an A2MCP ASP on OKX.AI using OKX Agent Identity from Onchain OS
```

**Fields the agent will ask for:**

| Field | Value |
|---|---|
| **Service name** | Glowfy — AI Skin Coach |
| **Description** | Glowfy is an always-on skincare intelligence agent. Six tools — analyze skin via selfie or quiz, build a full AM/PM routine, check ingredient safety, match products to your profile. Agents or humans call them, pay per call, get a result instantly. Database-backed scoring from published dermatological research — no hallucinated data. |
| **Endpoint** | `https://glowfy.onrender.com/skin/analyze` |
| **Price** | $0.05 (for the primary endpoint; others are $0.02-0.03) |
| **Category** | Lifestyle |

> Note: A2MCP registration is per-service. We may need to register each endpoint separately OR provide the base URL. Follow the agent's prompts — it will guide the exact format.

## Step 2: List on Marketplace

**Prompt to send:**
```
Help me list my ASP on OKX.AI using Onchain OS
```

**What's needed for listing:**
- Image (1:1 square, see requirements below)
- Description (already prepared above)
- Live endpoint URL

**Review timeline:** Within 24 hours. Result sent to `samueldanso.sg@gmail.com`.

## Listing Description (ready to paste)

**Short (1-2 lines):**
Snap your face or describe your skin → get instant skin analysis, ingredient safety scores, and a personalized routine. The "Eat This?" of skincare.

**Full:**
Glowfy is an always-on skincare intelligence agent. No subscriptions. No app. Six tools — analyze skin via selfie or quiz, build a full AM/PM routine, check ingredient safety, match products to your profile. Agents or humans call them, pay per call, get a result instantly.

All scoring is backed by published dermatological research (Fulton 1989, EWG Skin Deep, CIR safety assessments) and 1900+ real products from Open Beauty Facts. No hallucinated data — every score is deterministic and database-backed.

**Capabilities (6 endpoints):**
- `/skin/analyze` — selfie or description → skin type + 10 concern scores (0–100) · $0.05
- `/skin/quiz` — text inputs → detailed skin profile JSON · $0.03
- `/routine/build` — skin profile → full AM/PM routine + 30-day plan · $0.05
- `/ingredients/recommend` — skin profile → top ingredients to seek + avoid · $0.02
- `/ingredients/check` — ingredient list → per-ingredient safety + flags · $0.02
- `/product/match` — product + skin profile → compatibility score + verdict · $0.02

## Image Requirements

- [ ] Relevant to skincare/beauty
- [ ] No text in the image
- [ ] No AI-generated / Claude-generated images
- [ ] No real people, characters, or scenery
- [ ] No borders
- [ ] No rounded corners
- [ ] No transparent or plain white background
- [ ] True 1:1 square aspect ratio

**Suggestions:** Abstract skin texture close-up, geometric molecule/droplet shape in warm gold (#F2C078) on dark background (#1A1A1A), or flat-lay arrangement of skincare product silhouettes.

## Pre-Registration Checklist

- [x] Endpoint live: `https://glowfy.onrender.com`
- [x] All 6 endpoints return 402 on GET + POST
- [x] PAYMENT-REQUIRED header non-empty base64
- [x] Resource URL shows https:// (not http://)
- [x] Description + mimeType in route config
- [x] syncSettle: true — on-chain settlement confirmed
- [x] Payment tested end-to-end (buyer → seller, tx on-chain)
- [ ] Image sourced and ready
- [ ] Logged into seller wallet (samueldanso.sg@gmail.com)

## Wallet Info

| Role | Email | Address |
|---|---|---|
| Seller (Glowfy) | samueldanso.sg@gmail.com | 0x9d3de8757da21605f588864ddc65e178ae0b2580 |
| Buyer (tester) | hello.mavendefi@gmail.com | 0xfed31f8307cb1a7d6c8bb60f9331f60c7c4a402c |

## After Approval

1. Start buyer loop for revenue generation
2. Post 90s X demo with #OKXAI
3. Submit Google form (before Jul 17 23:59 UTC)
