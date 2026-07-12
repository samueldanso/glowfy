# Glowfy — Agent-Native Skin & Beauty Intelligence

## What

An always-on A2MCP agent — the AI Skin Coach. Snap your face or describe your skin → get instant skin analysis, ingredient safety scores, and a personalized routine. The "Eat This?" of skincare: photo or text in, structured analysis out, paid via x402 micropayments.

## For Who

Anyone who uses skincare products — people buying new products, building routines, checking ingredient safety, comparing options. 4 billion skincare users globally. Universal need, not crypto-specific.

## Problem

People buy skincare products blindly. They don't know if ingredients are safe, comedogenic, or irritating for their skin type. They can't check product interactions. LLMs hallucinate ingredient data — they'll say "niacinamide is comedogenic" (wrong) or invent safety ratings. There's no agent-native service that gives deterministic, database-backed skincare intelligence per call.

## How the Business Works

Glowfy is an agent-run business — a one-person company (OPC) where the agent IS the service provider. The agent IS the business — the skin & beauty intelligence agent runs a full skincare advisory practice autonomously: it acquires clients through the OKX.AI marketplace, delivers expert-level ingredient analysis and product scoring on demand, collects payment on-chain per call, builds reputation through reviews, and scales to thousands of clients per day without a single human employee.

**The model:**
1. You (Samuel) build and deploy the agent once
2. The agent runs 24/7 on OKX.AI marketplace — no human in the loop
3. Clients call endpoints → pay via x402 → get instant skincare intelligence
4. Revenue settles on-chain to your wallet automatically
5. Reputation compounds via reviews → more discovery → more revenue

**Analogies:**
- "Eat This?" but for skincare (proven: 539 sold, 5.0 rating, $0.01)
- A 24/7 dermatologist's ingredient knowledge, pay-per-question
- Skincare advisory agency run by one agent

## Revenue Model

**Pricing:** Pay-per-call via x402 micropayments.

| Tier | Endpoints | Price | Rationale |
|------|-----------|-------|-----------|
| Analysis | `/skin/analyze`, `/routine/build` | $0.05 | Vision + full generation — higher compute |
| Standard | `/skin/quiz`, `/ingredients/check`, `/ingredients/recommend`, `/product/match` | $0.02–0.03 | Text-only, fast, high volume |

**Revenue math (during hackathon campaign 3-4 days):**
- Self-buy: 500 calls × $0.01 avg = $5 cost / $5 revenue
- ScoutGate: 5-6 endpoints × auto-test = ~10+ reviews
- Organic from X post + TG: 50-200 calls
- Target: 600+ orders, $10-30 revenue, 5.0 rating

**Post-hackathon at scale:**
- 1,000 calls/day × $0.015 avg = $15/day = $5,475/year
- 10,000 calls/day = $54,750/year

## Scope

### In Scope (MVP — build in 2 days)

**6 A2MCP endpoints:**

| # | Endpoint | Input | Output | Price |
|---|----------|-------|--------|-------|
| 1 | `/skin/analyze` | Photo URL **or** text description of skin | Skin type + up to 10 concern scores (0–100) + top 3 concerns + confidence | $0.05 |
| 2 | `/skin/quiz` | Age + concerns + lifestyle + climate (text) | Full skin profile JSON — no photo needed (Proven model: $30M ARR on text alone) | $0.03 |
| 3 | `/ingredients/check` | Raw ingredient list (from product label) | Per-ingredient safety rating, comedogenic score, irritation risk, overall score | $0.02 |
| 4 | `/ingredients/recommend` | Skin profile (from analyze or quiz) | Top 5 ingredients to seek + top 5 to avoid, with reasons | $0.02 |
| 5 | `/routine/build` | Skin profile + budget + goals | Complete AM/PM routine — steps, product types, order, why each step + 30-day compliance plan (what to track, when to re-check) | $0.05 |
| 6 | `/product/match` | Product name + skin profile | Compatibility score (0–100) + why/why not + what to watch for | $0.02 |

### Out of Scope

- Dermatological diagnosis or medical claims
- Product purchasing / affiliate links
- Custom formulation
- Brand partnerships
- Progress tracking over time (post-hackathon)

## Data Sources (All FREE, No External Dependency)

| Source | What it provides | Cost | Dependency risk |
|--------|-----------------|------|-----------------|
| **Open Beauty Facts** | 300K+ cosmetic products, ingredients, barcodes | $0 — open database, downloadable | ZERO — self-host |
| **EWG Skin Deep logic** | Ingredient hazard scoring methodology (public, reproducible) | $0 — scoring logic is public knowledge | ZERO — implement yourself |
| **Comedogenic ratings** | Published dermatological research on pore-clogging | $0 — academic literature, static data | ZERO — embedded in code |
| **CIR safety assessments** | Cosmetic Ingredient Review data | $0 — public | ZERO — reference data |

**Key advantage:** Unlike shopping/price APIs, skincare ingredient data is STATIC. Niacinamide's comedogenic rating doesn't change hourly. You download the database once, embed the scoring logic, and you're independent forever. No API calls to external services. No rate limits. No dependencies.

## Stack

**OKX-prescribed stack — no substitutions.**

| Layer | Choice | Notes |
|---|---|---|
| **Runtime** | Bun + Hono | Fast, minimal — same as Helios. `@okxweb3/x402-hono` is framework-specific |
| **Payment SDK** | `@okxweb3/x402-hono` | OKX's own SDK. Hono middleware — mounts directly on each route |
| **AI — vision** | Claude Sonnet 4.6 (AWS Bedrock, `my-bedrock-profile`, us-east-1, model: `us.anthropic.claude-sonnet-4-6`) | Vision + NLP. Full Sonnet quality for analysis accuracy |
| **AI — text** | Claude Sonnet 4.6 (same) | All text endpoints — better reasoning on ingredient safety logic |
| **Data** | Open Beauty Facts (self-hosted SQLite) + embedded scoring tables | Free, 300K+ products, no API key, no rate limits, download once |
| **Settlement** | X Layer `eip155:196`, USD₮0 `0x779ded0c9e1022225f8e0630b35a9b54be713736`, scheme: `exact` | EIP-3009 single payment per call |
| **Deploy** | Render (Hong Kong or Singapore region) | OKX docs: HK/SG node required for best reach. Render supports custom domains + HTTPS auto-cert |
| **Domain** | Custom domain + HTTPS cert | Required — OKX rejects IP-only endpoints |

**Amount base units (decimals=6):**
| Price | Amount string |
|---|---|
| $0.02 USDT | `"20000"` |
| $0.03 USDT | `"30000"` |
| $0.05 USDT | `"50000"` |
| $0.10 USDT | `"100000"` |



## Technical Requirements

### ⚠️ CRITICAL #1 — Probe-shape mismatch (confirmed: syke + David Shui | OKX)

**The OKX x402 validator probes endpoints with a bare HTTP GET.**

If your endpoints are POST-only (natural for a REST API), they return `HTTP 405 Method Not Allowed`. The validator treats 405 as "endpoint invalid" — even if a real POST returns a perfect 402 challenge. Confirmed root cause of multiple failed ASP listings.

**Fix — every endpoint must handle GET and return 402:**

```typescript
// BAD — POST only, GET returns 405, validator fails
app.post("/skin/analyze", handler);

// GOOD — both methods return 402 before payment, handler runs after
// The x402-hono middleware handles this automatically when mounted with /*
// But explicitly register GET too in case of framework routing edge cases:
app.on(["GET", "POST"], "/skin/analyze", handler);
```

With `paymentMiddlewareFromConfig` mounted on `"/*"`, the middleware intercepts all methods. But verify with curl on GET specifically:

```bash
curl -i -X GET https://your-domain/skin/analyze
# ✅ Must return HTTP 402 — NOT 405
```



### ⚠️ CRITICAL #2 — PAYMENT-REQUIRED header (confirmed: David Shui | OKX + TG winner hub)

Most developers naturally return payment requirements in the JSON body and leave the header empty. Validator decodes empty header → reports `"accepts is empty"` regardless of body. Confirmed to have killed ASPs 3197, 4356, 4959, 4984 and more.

**David Shui's (OKX) direct fix:**
> *"Integrate x402 on your server using the OKX Payment SDK. Complete the required integration steps to ensure unpaid requests return a standard 402 challenge."*
> — David Shui | OKX, X Layer Hackathon Winner Hub TG

**The SDK (`@okxweb3/x402-hono`) sets the `PAYMENT-REQUIRED` header correctly and automatically.** Do not implement x402 manually. Use the SDK.

If for any reason you must construct the 402 manually (fallback only):
```typescript
const encoded = Buffer.from(JSON.stringify(paymentRequirements)).toString("base64");
return c.json(paymentRequirements, 402, {
  "PAYMENT-REQUIRED": encoded,  // ← validator reads THIS, not the body
});
```

---

### SDK install

```bash
bun add @okxweb3/x402-hono @okxweb3/x402-evm @okxweb3/x402-core
```

Three packages — all required:
- `@okxweb3/x402-core` — types, server, facilitator
- `@okxweb3/x402-evm` — ExactEvmScheme (EIP-3009 on X Layer)
- `@okxweb3/x402-hono` — Hono middleware (seller)

---

### Correct Hono integration pattern (from SDK docs)

```typescript
import { Hono } from "hono";
import { OKXFacilitatorClient } from "@okxweb3/x402-core";
import { x402ResourceServer, x402HTTPResourceServer } from "@okxweb3/x402-core/server";
import { paymentMiddlewareFromHTTPServer } from "@okxweb3/x402-hono";
import { ExactEvmScheme } from "@okxweb3/x402-evm/exact/server";

const app = new Hono();

// OKX SA API credentials — REQUIRED for on-chain settlement
const facilitatorClient = new OKXFacilitatorClient({
  apiKey: process.env.OKX_API_KEY!,
  secretKey: process.env.OKX_SECRET_KEY!,
  passphrase: process.env.OKX_PASSPHRASE!,
  syncSettle: true,  // wait for on-chain confirm before delivering response
});

// Register the ExactEvmScheme for X Layer
const resourceServer = new x402ResourceServer(facilitatorClient)
  .register("eip155:196", new ExactEvmScheme());

// Route config — one entry per protected endpoint
const routes = {
  "/skin/analyze":         { accepts: { scheme: "exact", network: "eip155:196", payTo: process.env.WALLET_ADDRESS!, price: "$0.05" } },
  "/skin/quiz":            { accepts: { scheme: "exact", network: "eip155:196", payTo: process.env.WALLET_ADDRESS!, price: "$0.03" } },
  "/routine/build":        { accepts: { scheme: "exact", network: "eip155:196", payTo: process.env.WALLET_ADDRESS!, price: "$0.05" } },
  "/ingredients/recommend":{ accepts: { scheme: "exact", network: "eip155:196", payTo: process.env.WALLET_ADDRESS!, price: "$0.02" } },
  "/ingredients/check":    { accepts: { scheme: "exact", network: "eip155:196", payTo: process.env.WALLET_ADDRESS!, price: "$0.02" } },
  "/product/match":        { accepts: { scheme: "exact", network: "eip155:196", payTo: process.env.WALLET_ADDRESS!, price: "$0.02" } },
};

const httpServer = new x402HTTPResourceServer(resourceServer, routes);

// Mount BEFORE all route handlers — payment gate fires first
app.use("*", paymentMiddlewareFromHTTPServer(httpServer));

// ... route handlers here ...

export default { port: 3000, fetch: app.fetch };

// CRITICAL: must run after server starts, before first request
await resourceServer.initialize();
```

The SDK:
- Constructs the correct 402 challenge (body + `PAYMENT-REQUIRED` header)
- Handles `extra.eip712.name` / `extra.eip712.version` for EIP-3009 internally
- Verifies the payment signature on replay
- Settles on-chain via OKX facilitator (requires SA API keys)
- Returns 200 to the replayed request → your handler runs

**`price: "$0.05"` is valid** — SDK accepts human-readable prices and converts to base units (decimals=6) automatically. Equivalent to `"50000"` in base units.

**`await resourceServer.initialize()` is REQUIRED** — without it, the facilitator can't sync supported payment kinds and all 402 challenges will fail.

---

### Required env vars

```bash
WALLET_ADDRESS=0x<your-X-Layer-EVM-address>   # from Agentic Wallet setup
OKX_API_KEY=...                                # OKX SA API — REQUIRED for settlement
OKX_SECRET_KEY=...                             # OKX SA API — REQUIRED for settlement
OKX_PASSPHRASE=...                             # OKX SA API — REQUIRED for settlement
AWS_PROFILE=my-bedrock-profile                 # already configured
AWS_REGION=us-east-1
```

> The OKX SA API keys are required for the `OKXFacilitatorClient` which handles payment verification and on-chain settlement. These are separate from the Agentic Wallet — get them from the OKX developer portal.

---

### Full x402 compliance checklist

- [ ] `bun add @okxweb3/x402-hono @okxweb3/x402-evm @okxweb3/x402-core`
- [ ] `paymentMiddlewareFromConfig(routes)` mounted before all handlers
- [ ] All 6 routes in the routes config with correct prices
- [ ] `OPTIONS` returns 204 (CORS preflight)
- [ ] CORS: `PAYMENT-SIGNATURE` explicitly in `Access-Control-Allow-Headers` — **do NOT use wildcard `*`** (confirmed by David Shui | OKX: wildcard breaks x402 cross-origin)
- [ ] CORS: `PAYMENT-REQUIRED` + `PAYMENT-RESPONSE` in `Access-Control-Expose-Headers`
- [ ] Payment gate fires before param validation (middleware order)
- [ ] Public HTTPS domain (not IP) — OKX rejects IP endpoints

**Self-check before submitting for review — test both methods:**
```bash
# GET — validator probe shape
curl -i -X GET https://your-domain/skin/analyze
# ✅ HTTP 402, NOT 405 or 404

# POST — real call shape
curl -i -X POST https://your-domain/skin/analyze
# ✅ HTTP 402, PAYMENT-REQUIRED: <non-empty base64 string>
```

### Image requirements (marketplace listing)
OKX's exact rejection criteria — use this verbatim as the checklist:
- [ ] Relevant to the service description
- [ ] No text in the image
- [ ] No AI-generated / Claude-generated images
- [ ] No real people, characters, or scenery
- [ ] No borders (makes it look non-square)
- [ ] No rounded corners
- [ ] No transparent or plain white background
- [ ] True 1:1 square aspect ratio

**What works:** abstract skin texture, ingredient molecule illustration, flat-lay of skincare product shapes, geometric pattern in skin tones. Clean, bold, no face, no text.





## Why This Wins (Filter Check)

| # | Filter | Pass? | Evidence |
|---|--------|-------|----------|
| 1 | Real value + revenue model | ✅ | Per-call x402, proven by "Eat This?" model |
| 2 | Fits OKX format types | ✅ | Ready-to-use tool, always-on service |
| 3 | OPC, agent-operated 24/7 | ✅ | Zero human intervention after deploy |
| 4 | Fits Lifestyle category | ✅ | Beauty/skincare = core Lifestyle |
| 5 | Sells an outcome | ✅ | Returns safety score + recommendations |
| 6 | Agent IS the business | ✅ | Skincare advisory agency run by one agent |
| 7 | Agent-native | ✅ | Structured JSON, other agents can call it |
| 8 | A2MCP callable | ✅ | Per-call x402, instant settlement |
| 9 | Multiple endpoints | ✅ | 6 services |
| 10 | Painful deliverable | ✅ | LLMs hallucinate ingredient safety data |
| 11 | High frequency | ✅ | Every product purchase, every routine question |
| 12 | Measurable before/after | ✅ | Without: guessing safety. With: database-backed score |
| 13 | Agent is buyer | ✅ | Shopping agents, health agents, recommendation agents |
| 14 | LLM + real data | ✅ | Ingredient database + LLM for NL processing |
| 15 | LLMs don't have natively | ✅ | Comedogenic ratings, EWG scores not in training reliably |

## Registration & Go-Live (Onchain OS — agent-driven)

Everything starts from **Onchain OS** regardless of which harness you use. The harness installs are already done (Hermes, Claude Code, OpenCode). The real setup is Onchain OS + Agentic Wallet — once the binary is installed, you can refer back to it across all projects.

---

### Phase 1 — Install Onchain OS + Agentic Wallet

**In any agent chat window (Hermes, Claude Code, OpenCode), run:**

```
npx skills add okx/onchainos-skills --yes -g
```

The agent installs automatically. This creates the binary — reusable across all future projects.

**Then create/restore your Agentic Wallet:**

```
Log in to Agentic Wallet with email
```

Enter your email → enter the OTP code → wallet is created automatically on first login:

```
Wallet created successfully!
EVM Address:    <evm-address>
Solana Address: <solana-address>
```

> Private keys are TEE-secured — never exposed to the LLM or network. Logging in with the same email restores the same wallet automatically. If you installed Onchain OS during Helios, the binary may still exist — try the wallet login step first before reinstalling.

**⚠️ Known CLI bug (confirmed in TG winner hub):**
The bare `onchainos` CLI v4.2.0 has a provisioning bug — returns empty `apiKey`, empty `accountsMap`, fails every authenticated call with `code=10008 "Invalid access token"`. The upgrade to v4.2.2 is also broken (checksum mismatch). **Do not use the bare CLI directly.** Always run Onchain OS through an agent (Hermes, Claude Code, OpenCode) — this is the OKX community's confirmed workaround. If the wallet account gets stuck, register with a new email address.

---

### Phase 2 — Build + deploy the endpoints

Build Glowfy (6 endpoints, x402-gated), deploy to Render on a Hong Kong or Singapore node, point a domain at it, get HTTPS live.

Self-check before registering:
```bash
curl -i -X POST https://your-domain/skin/analyze
# Must return: HTTP 402 + PAYMENT-REQUIRED header
```

---

### Phase 3 — Register as A2MCP ASP

**In your agent:**
```
Help me register an A2MCP ASP on OKX.AI using Onchain OS
```

You'll provide: service name, description, price per call (in USDT), and endpoint URL.

**Then list on marketplace:**
```
Help me list my ASP on OKX.AI using Onchain OS
```

Review completes within **24 hours** — result sent to the email registered with Agentic Wallet.

---

### Phase 4 — Hackathon submission (separate step)

After listing is approved and ASP is live, submit the [Google form](https://forms.gle/mddEUagmDbyV37ws8) before **Jul 17 23:59 UTC**:
- ASP Name
- Agent ID (assigned after listing approval)
- ASP Description
- ASP Type (A2MCP)
- X Account Handle
- X Participation Post link (demo video ≤ 90 seconds, #OKXAI)
- Telegram Handle

> This is the prize competition entry — separate from marketplace listing. Both must be done.

---

> **Supported agents on OKX.AI:** Hermes ✅, OpenClaw, Claude Code, Codex. Samuel uses Hermes — all registration and operation steps work natively in this session.


## Success Criteria

1. All 6 endpoints pass OKX x402 validation on first submission
2. Listed and live on OKX.AI marketplace by Monday Jul 14
3. 500+ orders accumulated by Thursday Jul 17
4. 5.0 rating with 100% positive reviews
5. Compelling 90-second X demo posted with #OKXAI
6. Google form submitted before Jul 17 23:59 UTC

## Competition on OKX.AI

**Direct:** Zero. No skin/beauty agents on the marketplace.
**Adjacent:** "Eat This?" (food → health score). Same model, different domain. We're complementary, not competing.
**Category:** Lifestyle Companion — field is: Eat This? (539), 健康生活 (248), WokSmith (24), AstralMirror (8). Thin.

## GTM / Distribution Plan

**Volume strategy:**
1. Self-buy 500 calls at $0.01-0.02 each ($5-10 total cost)
2. ScoutGate tests each endpoint automatically (free reviews)
3. Share in TG winner hub: "Built a skincare ingredient checker — try it"
4. Friends/network test their products

**Social strategy (Social Buzz prize):**
1. 90-second X demo: "I scanned my moisturizer's ingredients — here's what I found"
2. Show a real product scoring: before (unknown ingredients) → after (clear safety report)
3. Tag #OKXAI, @XLayerOfficial
4. Visual output = screenshot-worthy = shareable
5. Beauty/skincare content gets shared by non-crypto audiences

**Prize targets:**
- **Lifestyle Companion** ($2,500) — top-performing in category
- **Social Buzz** ($1,000 × 10) — visual demo + beauty content = shares
- **Best Product** ($10K) — "Eat This? for skin" is instantly understood by judges
- **Creative Genius** ($10K) — novel application on this marketplace
- **Revenue Rocket** ($10K) — volume at $0.01 = competitive revenue

## Demo Script (90 seconds)

```
[0-10s] "I built Glowfy — an AI skin coach on OKX.AI. Photo or text in, expert analysis out."
[10-25s] Show /skin/analyze: upload selfie URL → skin type: combination, top concerns: acne (72/100), oiliness (65/100), dark spots (48/100)
[25-40s] Show /skin/quiz: age 26, oily T-zone, humid climate → full skin profile JSON in 2s
[40-55s] Show /ingredients/check: paste CeraVe moisturizer ingredients → safety 91/100, 0 hazard flags, 2 comedogenic flags for acne-prone skin
[55-70s] Show /routine/build: skin profile → full AM/PM routine, 6 steps each, product types + why
[70-85s] "6 endpoints. Photo or text. Always on. $0.02–0.05 per call. Perfect Corp charges $0.96 for the same scan."
[85-90s] "Try it: okx.ai/agents/[ID] — #OKXAI #Glowfy"
```

## How It Works (Technical)

Glowfy is **not a web app.** It is a set of HTTP endpoints with x402 payment gates. Agents (OKX.AI frontend, other ASPs, Claude, any MCP-compatible agent) call these endpoints directly:

1. Calling agent sends a POST request with structured JSON input — including `photo_url` (a URL string) or text fields
2. x402 middleware fires **before** any logic — payment settles on X Layer in USDT0
3. Endpoint runs: Bedrock vision (if photo) + ingredient DB lookup + Claude Haiku generation
4. Returns structured JSON result instantly
5. No session state. No login. No UI to render. One call, one result, one payment.

**Image flow:** Photos are never "uploaded" to Glowfy. The calling agent passes `"photo_url": "https://..."` in the request body. Glowfy fetches and analyzes the URL. This is the same pattern Eat This? uses for food label photos.



## OKX Listing Description (ready to paste)

**Title:** Glowfy — AI Skin Coach

**Short description:** Glowfy is an always-on skincare intelligence agent. No subscriptions. No app. Six tools — analyze skin via selfie or quiz, build a full AM/PM routine, check ingredient safety, match products to your profile. Agents or humans call them, pay per call, get a result instantly.

**Capabilities (6 endpoints):**
- `/skin/analyze` — selfie or description → skin type + 10 concern scores (0–100) · $0.05
- `/skin/quiz` — text inputs → detailed skin profile JSON · $0.03
- `/routine/build` — skin profile → full AM/PM routine + 30-day plan · $0.05
- `/ingredients/recommend` — skin profile → top 5 seek + top 5 avoid · $0.02
- `/ingredients/check` — ingredient list → per-ingredient safety + flags · $0.02
- `/product/match` — product + skin profile → compatibility score + verdict · $0.02

**Category:** Lifestyle Companion



**Glowfy** — the AI Skin Coach. Clean, direct, matches "Eat This?" simplicity.

Tagline: *"Glowfy your routine."*

## Branding & Launch Tasks

These run in parallel with the build — mostly Samuel's work, not the coding agent's.

### Identity
- [ ] **Name** — ✅ Glowfy
- [ ] **Tagline** — ✅ *"Scan. Score. Glow."*
- [ ] **Color palette** — ✅ locked (see below)
- [ ] **Logo** — square, 1:1, no text, no AI-gen, no faces. Minimal geometric shape (glow circle, drop, or leaf). Must pass OKX image checklist before listing submission.

**Brand palette:**
| Role | Hex | Use |
|---|---|---|
| **Hero / primary** | `#F2C078` | Logo, CTA, accents — warm glow gold |
| **Background** | `#1A1A1A` | Dark base — looks sharp on OKX.AI marketplace |
| **Surface** | `#FAF7F2` | Off-white — cards, light mode |
| **Text** | `#1A1A1A` on light / `#FAF7F2` on dark | |

Reference: same single-hero-color structure as Talise (@taliseio) — one strong color, minimal geometry, short tagline, no clutter.

### Social
- [ ] **X (Twitter) account** — create `@<agentname>` handle. Use for demo post + hackathon submission link. Required for Google form field.
- [ ] **Participation post** — 90-second demo video + caption. Must include `#OKXAI`. Post before Jul 17. Link goes in Google form.
- [ ] **TG winner hub** — share the live listing once approved. "Built a skin coach on OKX.AI — try it." Short, direct, not salesy.

### Listing assets (needed before OKX review submission)
- [ ] Logo image (1:1, passes OKX checklist)
- [ ] ASP name + short description (ready to paste — already in PRD)
- [ ] Endpoint URL (live on Render after deploy)
- [ ] X post link (after demo posted)

### Hackathon form (after listing approval)
- [ ] ASP Name
- [ ] Agent ID (assigned post-approval)
- [ ] ASP Description
- [ ] ASP Type: A2MCP
- [ ] X Account Handle
- [ ] X Participation Post link
- [ ] Telegram Handle

---






## Post-Hackathon Potential

- Progress tracking — compare scans over time (built-in retention loop, every major player has this)
- Multi-language — Chinese market is the largest skincare consumer market globally
- White-label API for beauty brands (Revieve model: $12.6M ARR B2B only)
- Upgrade to Claude Sonnet for higher-stakes analysis endpoints
