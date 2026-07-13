import { OKXFacilitatorClient } from '@okxweb3/x402-core';
import type { RoutesConfig } from '@okxweb3/x402-core/server';
import { ExactEvmScheme } from '@okxweb3/x402-evm/exact/server';
import { paymentMiddleware, x402ResourceServer } from '@okxweb3/x402-hono';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ingredientRoutes } from './routes/ingredients';
import { productRoutes } from './routes/product';
import { routineRoutes } from './routes/routine';
import { skinRoutes } from './routes/skin';

const app = new Hono();

// CORS — explicit headers required; wildcard breaks x402 validator
app.use(
  '/*',
  cors({
    origin: '*',
    allowHeaders: ['Content-Type', 'Authorization', 'PAYMENT-SIGNATURE', 'X-Payment'],
    exposeHeaders: ['PAYMENT-REQUIRED', 'PAYMENT-RESPONSE'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
  }),
);

// Facilitator: use real OKX client when SA keys are set; local stub otherwise
// (stub allows 402 challenge generation — settlement requires real keys)
function createFacilitator() {
  const apiKey = process.env.OKX_API_KEY;
  const secretKey = process.env.OKX_SECRET_KEY;
  const passphrase = process.env.OKX_PASSPHRASE;

  if (apiKey && secretKey && passphrase) {
    console.log('[glowfy] Using OKXFacilitatorClient (SA keys present)');
    return new OKXFacilitatorClient({ apiKey, secretKey, passphrase, syncSettle: true });
  }

  console.warn('[glowfy] OKX SA keys not set — using local stub (402 only, no settlement)');
  return {
    async getSupported() {
      return {
        kinds: [{ x402Version: 2, scheme: 'exact', network: 'eip155:196' as const }],
        extensions: [] as string[],
        signers: {} as Record<string, string[]>,
      };
    },
    async verify(_payload: unknown, _requirements: unknown): Promise<never> {
      throw new Error('OKX SA keys not configured — payment verification unavailable');
    },
    async settle(_payload: unknown, _requirements: unknown): Promise<never> {
      throw new Error('OKX SA keys not configured — payment settlement unavailable');
    },
  };
}

// x402 payment middleware — path-only keys match all HTTP methods (GET + POST)
const WALLET = process.env.WALLET_ADDRESS;
if (!WALLET) throw new Error('[glowfy] WALLET_ADDRESS env var is required');

const BASE_URL = process.env.BASE_URL || 'https://glowfy.onrender.com';

const routes: RoutesConfig = {
  '/skin/analyze': {
    accepts: { scheme: 'exact', network: 'eip155:196', payTo: WALLET, price: '$0.05' },
    resource: `${BASE_URL}/skin/analyze`,
    description:
      'Analyze skin from photo or text description — returns skin type + 10 concern scores',
    mimeType: 'application/json',
  },
  '/skin/quiz': {
    accepts: { scheme: 'exact', network: 'eip155:196', payTo: WALLET, price: '$0.03' },
    resource: `${BASE_URL}/skin/quiz`,
    description: 'Lifestyle quiz → full skin profile (no photo needed)',
    mimeType: 'application/json',
  },
  '/routine/build': {
    accepts: { scheme: 'exact', network: 'eip155:196', payTo: WALLET, price: '$0.05' },
    resource: `${BASE_URL}/routine/build`,
    description: 'Generate complete AM/PM skincare routine with 30-day compliance plan',
    mimeType: 'application/json',
  },
  '/ingredients/recommend': {
    accepts: { scheme: 'exact', network: 'eip155:196', payTo: WALLET, price: '$0.02' },
    resource: `${BASE_URL}/ingredients/recommend`,
    description: 'Personalized ingredient recommendations based on skin profile',
    mimeType: 'application/json',
  },
  '/ingredients/check': {
    accepts: { scheme: 'exact', network: 'eip155:196', payTo: WALLET, price: '$0.02' },
    resource: `${BASE_URL}/ingredients/check`,
    description: 'Score ingredient list for safety, comedogenicity, and irritation',
    mimeType: 'application/json',
  },
  '/product/match': {
    accepts: { scheme: 'exact', network: 'eip155:196', payTo: WALLET, price: '$0.02' },
    resource: `${BASE_URL}/product/match`,
    description: 'Score product compatibility with your skin profile',
    mimeType: 'application/json',
  },
};

const resourceServer = new x402ResourceServer(createFacilitator()).register(
  'eip155:196',
  new ExactEvmScheme(),
);

app.use('/*', paymentMiddleware(routes, resourceServer));

// Mount paid route handlers
app.route('/skin', skinRoutes);
app.route('/ingredients', ingredientRoutes);
app.route('/routine', routineRoutes);
app.route('/product', productRoutes);

// Health check — not payment-gated
app.get('/', (c) => c.json({ status: 'ok', agent: 'Glowfy', version: '1.0.0' }));

export default {
  port: Number(process.env.PORT ?? 3000),
  fetch: app.fetch,
};
