# Glowfy MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 6 x402-gated skincare intelligence endpoints on OKX.AI marketplace by Jul 17 2026.

**Architecture:** Bun + Hono server with x402 payment middleware intercepting all routes. Each endpoint handler runs after payment settles. AI calls go to Claude Sonnet 4.6 on AWS Bedrock. Ingredient data from embedded SQLite (Open Beauty Facts + scoring tables).

**Tech Stack:** Bun, Hono, `@okxweb3/x402-hono`, `@okxweb3/x402-evm`, `@okxweb3/x402-core`, `@aws-sdk/client-bedrock-runtime`, `better-sqlite3`

## Global Constraints

- Runtime: Bun (not Node)
- Framework: Hono
- AI: AWS Bedrock only — model `us.anthropic.claude-sonnet-4-6-v1`, profile `my-bedrock-profile`, region `us-east-1`
- Payment: x402 `exact` scheme on X Layer (`eip155:196`), USDT0 (`0x779ded0c9e1022225f8e0630b35a9b54be713736`)
- Wallet: `0x9d3de8757da21605f588864ddc65e178ae0b2580`
- Deploy: Render, Hong Kong or Singapore region
- No OpenAI. No manual x402 implementation. SDK only.
- Every endpoint must return 402 on both GET and POST (OKX validator probes with GET)
- CORS: explicitly list `PAYMENT-SIGNATURE` in Allow-Headers. No wildcard `*`.
- Payment middleware fires BEFORE param validation

---

## File Structure

```
src/
├── index.ts                  # App entry — Hono app, CORS, payment middleware, route mounting
├── routes/
│   ├── skin.ts               # /skin/analyze, /skin/quiz handlers
│   ├── ingredients.ts        # /ingredients/check, /ingredients/recommend handlers
│   ├── routine.ts            # /routine/build handler
│   └── product.ts            # /product/match handler
├── lib/
│   ├── bedrock.ts            # AWS Bedrock client — invoke Claude Sonnet
│   ├── db.ts                 # SQLite connection + query helpers
│   └── scoring.ts            # Ingredient safety/comedogenic scoring logic
├── data/
│   ├── ingredients.json      # Embedded ingredient scoring table (comedogenic + irritation + safety)
│   └── seed-db.ts            # Script to download + load Open Beauty Facts into SQLite
├── types.ts                  # Shared TypeScript types (SkinProfile, IngredientScore, etc.)
.env                          # Env vars (gitignored)
.env.example                  # Template for env vars (committed)
render.yaml                   # Render deploy config
```

---

### Task 1: x402 Payment Middleware + CORS + All 6 Route Stubs

**Files:**
- Modify: `src/index.ts`
- Create: `src/routes/skin.ts`
- Create: `src/routes/ingredients.ts`
- Create: `src/routes/routine.ts`
- Create: `src/routes/product.ts`
- Create: `.env.example`

**Produces:**
- All 6 endpoints return HTTP 402 with `PAYMENT-REQUIRED` header on GET and POST
- CORS configured with explicit headers
- `bun run dev` starts the server

- [ ] **Step 1: Create `.env.example`**

```bash
WALLET_ADDRESS=0x<your-X-Layer-EVM-address>
OKX_API_KEY=
OKX_SECRET_KEY=
OKX_PASSPHRASE=
AWS_PROFILE=my-bedrock-profile
AWS_REGION=us-east-1
PORT=3000
```

- [ ] **Step 2: Write `src/index.ts` — Hono app with CORS + x402 middleware + route stubs**

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { paymentMiddleware } from "@okxweb3/x402-hono";
import { ExactEvmScheme } from "@okxweb3/x402-evm/exact/server";
import { OKXFacilitatorClient } from "@okxweb3/x402-core";
import { x402ResourceServer } from "@okxweb3/x402-hono";
import { skinRoutes } from "./routes/skin";
import { ingredientRoutes } from "./routes/ingredients";
import { routineRoutes } from "./routes/routine";
import { productRoutes } from "./routes/product";

const app = new Hono();

// CORS — explicit headers, no wildcard
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "PAYMENT-SIGNATURE", "X-Payment"],
    exposeHeaders: ["PAYMENT-REQUIRED", "PAYMENT-RESPONSE"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  })
);

// x402 payment middleware — fires before all handlers
const WALLET = process.env.WALLET_ADDRESS!;
const routes = {
  "/skin/analyze":          { accepts: { scheme: "exact", network: "eip155:196", payTo: WALLET, price: "$0.05" } },
  "/skin/quiz":             { accepts: { scheme: "exact", network: "eip155:196", payTo: WALLET, price: "$0.03" } },
  "/routine/build":         { accepts: { scheme: "exact", network: "eip155:196", payTo: WALLET, price: "$0.05" } },
  "/ingredients/recommend": { accepts: { scheme: "exact", network: "eip155:196", payTo: WALLET, price: "$0.02" } },
  "/ingredients/check":     { accepts: { scheme: "exact", network: "eip155:196", payTo: WALLET, price: "$0.02" } },
  "/product/match":         { accepts: { scheme: "exact", network: "eip155:196", payTo: WALLET, price: "$0.02" } },
};

const facilitatorClient = new OKXFacilitatorClient();
const resourceServer = new x402ResourceServer(facilitatorClient)
  .register("eip155:196", new ExactEvmScheme());

app.use("/*", paymentMiddleware(routes, resourceServer));

// Mount route handlers
app.route("/skin", skinRoutes);
app.route("/ingredients", ingredientRoutes);
app.route("/routine", routineRoutes);
app.route("/product", productRoutes);

// Health check (unpaid)
app.get("/", (c) => c.json({ status: "ok", agent: "Glowfy", version: "1.0.0" }));

export default app;
```

- [ ] **Step 3: Create route stubs**

`src/routes/skin.ts`:
```typescript
import { Hono } from "hono";
const skinRoutes = new Hono();

skinRoutes.on(["GET", "POST"], "/analyze", (c) => {
  return c.json({ message: "skin analyze — payment verified", status: "stub" });
});

skinRoutes.on(["GET", "POST"], "/quiz", (c) => {
  return c.json({ message: "skin quiz — payment verified", status: "stub" });
});

export { skinRoutes };
```

`src/routes/ingredients.ts`:
```typescript
import { Hono } from "hono";
const ingredientRoutes = new Hono();

ingredientRoutes.on(["GET", "POST"], "/check", (c) => {
  return c.json({ message: "ingredients check — payment verified", status: "stub" });
});

ingredientRoutes.on(["GET", "POST"], "/recommend", (c) => {
  return c.json({ message: "ingredients recommend — payment verified", status: "stub" });
});

export { ingredientRoutes };
```

`src/routes/routine.ts`:
```typescript
import { Hono } from "hono";
const routineRoutes = new Hono();

routineRoutes.on(["GET", "POST"], "/build", (c) => {
  return c.json({ message: "routine build — payment verified", status: "stub" });
});

export { routineRoutes };
```

`src/routes/product.ts`:
```typescript
import { Hono } from "hono";
const productRoutes = new Hono();

productRoutes.on(["GET", "POST"], "/match", (c) => {
  return c.json({ message: "product match — payment verified", status: "stub" });
});

export { productRoutes };
```

- [ ] **Step 4: Run dev server and verify 402**

```bash
bun run dev
# In another terminal:
curl -i -X GET http://localhost:3000/skin/analyze
# Expected: HTTP 402 + PAYMENT-REQUIRED header (non-empty)

curl -i -X POST http://localhost:3000/skin/analyze
# Expected: HTTP 402 + PAYMENT-REQUIRED header (non-empty)

curl -i -X GET http://localhost:3000/
# Expected: HTTP 200 {"status":"ok","agent":"Glowfy"}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: x402 payment middleware + CORS + 6 route stubs"
```

---

### Task 2: Bedrock Client + Types

**Files:**
- Create: `src/lib/bedrock.ts`
- Create: `src/types.ts`

**Produces:**
- `invokeClaude(prompt: string, imageUrl?: string): Promise<string>` — calls Bedrock
- Shared types: `SkinProfile`, `IngredientScore`, `RoutineStep`, etc.

- [ ] **Step 1: Create `src/types.ts`**

```typescript
export interface SkinProfile {
  skinType: "oily" | "dry" | "combination" | "normal" | "sensitive";
  concerns: { name: string; score: number }[];
  topConcerns: string[];
  confidence: number;
}

export interface IngredientScore {
  name: string;
  safety: number;        // 1-10 (1=safest)
  comedogenic: number;   // 0-5
  irritation: number;    // 0-5
  category: string;
  notes: string;
}

export interface RoutineStep {
  order: number;
  step: string;
  productType: string;
  why: string;
  ingredients_to_seek: string[];
}

export interface ProductMatch {
  score: number;         // 0-100
  verdict: "excellent" | "good" | "caution" | "avoid";
  reasons: string[];
  watchFor: string[];
}
```

- [ ] **Step 2: Create `src/lib/bedrock.ts`**

```typescript
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  profile: process.env.AWS_PROFILE || "my-bedrock-profile",
});

const MODEL_ID = "us.anthropic.claude-sonnet-4-6-v1";

export async function invokeClaude(prompt: string, imageUrl?: string): Promise<string> {
  const messages: any[] = [];
  const content: any[] = [];

  if (imageUrl) {
    // Fetch image and convert to base64
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mediaType = response.headers.get("content-type") || "image/jpeg";
    content.push({ type: "image", source: { type: "base64", media_type: mediaType, data: base64 } });
  }

  content.push({ type: "text", text: prompt });
  messages.push({ role: "user", content });

  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 2048,
      messages,
    }),
  });

  const response = await client.send(command);
  const body = JSON.parse(new TextDecoder().decode(response.body));
  return body.content[0].text;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/bedrock.ts src/types.ts
git commit -m "feat: bedrock client + shared types"
```

---

### Task 3: Ingredient Database + Scoring Logic

**Files:**
- Create: `src/data/ingredients.json`
- Create: `src/lib/scoring.ts`
- Create: `src/lib/db.ts`
- Create: `src/data/seed-db.ts`

**Produces:**
- `lookupIngredient(name: string): IngredientScore | null`
- `scoreIngredientList(ingredients: string[]): { scores: IngredientScore[], overall: number }`
- SQLite DB with Open Beauty Facts product data (seeded via script)

- [ ] **Step 1: Create embedded ingredient scoring table** (`src/data/ingredients.json`)

Top 200 cosmetic ingredients with comedogenic ratings, safety scores, and irritation levels from published dermatological research.

- [ ] **Step 2: Create `src/lib/scoring.ts`** — lookup + scoring logic

- [ ] **Step 3: Create `src/lib/db.ts`** — SQLite connection for product lookups

- [ ] **Step 4: Create `src/data/seed-db.ts`** — downloads Open Beauty Facts cosmetics CSV, loads into SQLite

- [ ] **Step 5: Run seed script, verify DB works**

```bash
bun run src/data/seed-db.ts
# Expected: SQLite DB created at data/cosmetics.db with product data
```

- [ ] **Step 6: Commit**

```bash
git add src/data/ src/lib/scoring.ts src/lib/db.ts
git commit -m "feat: ingredient database + scoring logic"
```

---

### Task 4: Implement `/ingredients/check` and `/ingredients/recommend`

**Files:**
- Modify: `src/routes/ingredients.ts`

**Consumes:** `scoreIngredientList()` from Task 3, `invokeClaude()` from Task 2
**Produces:** Working endpoints that return real ingredient analysis

- [ ] **Step 1: Implement `/ingredients/check`** — parse ingredient list, score each, return structured JSON
- [ ] **Step 2: Implement `/ingredients/recommend`** — take skin profile, use Claude to recommend ingredients
- [ ] **Step 3: Test locally**
- [ ] **Step 4: Commit**

```bash
git add src/routes/ingredients.ts
git commit -m "feat: /ingredients/check + /ingredients/recommend endpoints"
```

---

### Task 5: Implement `/skin/analyze` (Bedrock Vision)

**Files:**
- Modify: `src/routes/skin.ts`

**Consumes:** `invokeClaude()` with imageUrl from Task 2
**Produces:** Working endpoint — photo URL or text in, skin profile out

- [ ] **Step 1: Implement `/skin/analyze`** — accept photo_url or text, call Claude with vision prompt, parse response into SkinProfile
- [ ] **Step 2: Test with a sample image URL**
- [ ] **Step 3: Commit**

```bash
git add src/routes/skin.ts
git commit -m "feat: /skin/analyze with Bedrock vision"
```

---

### Task 6: Implement `/skin/quiz`, `/routine/build`, `/product/match`

**Files:**
- Modify: `src/routes/skin.ts`
- Modify: `src/routes/routine.ts`
- Modify: `src/routes/product.ts`

**Consumes:** `invokeClaude()` from Task 2, `lookupIngredient()` from Task 3

- [ ] **Step 1: Implement `/skin/quiz`** — text inputs → full skin profile JSON
- [ ] **Step 2: Implement `/routine/build`** — skin profile + goals → AM/PM routine + 30-day plan
- [ ] **Step 3: Implement `/product/match`** — product name + skin profile → compatibility score
- [ ] **Step 4: Test all three locally**
- [ ] **Step 5: Commit**

```bash
git add src/routes/
git commit -m "feat: /skin/quiz + /routine/build + /product/match"
```

---

### Task 7: Deploy to Render + Self-Check

**Files:**
- Create: `render.yaml`
- Create: `Dockerfile` (if needed for Render)

- [ ] **Step 1: Create `render.yaml`** with Hong Kong/Singapore region config
- [ ] **Step 2: Push to GitHub, connect Render**
- [ ] **Step 3: Set env vars in Render dashboard**
- [ ] **Step 4: Deploy and get live HTTPS URL**
- [ ] **Step 5: Self-check — curl all 6 endpoints on live URL**

```bash
curl -i -X GET https://your-domain/skin/analyze     # must return 402
curl -i -X POST https://your-domain/skin/analyze    # must return 402 + PAYMENT-REQUIRED
curl -i -X GET https://your-domain/skin/quiz        # must return 402
curl -i -X GET https://your-domain/ingredients/check # must return 402
curl -i -X GET https://your-domain/ingredients/recommend # must return 402
curl -i -X GET https://your-domain/routine/build    # must return 402
curl -i -X GET https://your-domain/product/match    # must return 402
```

- [ ] **Step 6: Commit render config**

```bash
git add render.yaml
git commit -m "feat: render deploy config"
```

---

## Post-Deploy: Phase 3 (Registration)

After all endpoints return 402 on the live URL:

```
Help me register an A2MCP ASP on OKX.AI using OKX Agent Identity from Onchain OS
```

Then:
```
Help me list my ASP on OKX.AI using Onchain OS
```

Review completes within 24 hours.
