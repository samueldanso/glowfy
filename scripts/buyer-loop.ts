/**
 * Buyer loop — continuously calls all 6 Glowfy endpoints with x402 payments.
 * Generates orders + revenue for the hackathon campaign.
 *
 * Run: bun run scripts/buyer-loop.ts
 * Requires: BUYER_PRIVATE_KEY in .env, GLOWFY_URL in .env
 *
 * Options (env vars):
 *   GLOWFY_URL=https://glowfy.onrender.com (default)
 *   LOOP_DELAY_MS=5000 (delay between rounds, default 5s)
 *   MAX_ROUNDS=0 (0 = infinite)
 */
import { toClientEvmSigner } from '@okxweb3/x402-evm';
import { ExactEvmScheme } from '@okxweb3/x402-evm/exact/client';
import { wrapFetchWithPaymentFromConfig } from '@okxweb3/x402-fetch';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { xLayer } from 'viem/chains';

// --- Config ---
const GLOWFY_URL = process.env.GLOWFY_URL || 'https://glowfy.onrender.com';
const LOOP_DELAY_MS = Number(process.env.LOOP_DELAY_MS || '5000');
const MAX_ROUNDS = Number(process.env.MAX_ROUNDS || '0'); // 0 = infinite

const privateKey = process.env.BUYER_PRIVATE_KEY;
if (!privateKey) {
  console.error('ERROR: BUYER_PRIVATE_KEY not set in .env');
  process.exit(1);
}

// --- Setup buyer wallet ---
const account = privateKeyToAccount(privateKey as `0x${string}`);
const walletClient = createWalletClient({
  account,
  chain: xLayer,
  transport: http(),
});

const publicClient = createPublicClient({
  chain: xLayer,
  transport: http(),
});

const signer = toClientEvmSigner({ ...walletClient, address: account.address }, publicClient);

const fetchWithPayment = wrapFetchWithPaymentFromConfig(fetch, {
  schemes: [
    {
      network: 'eip155:196',
      client: new ExactEvmScheme(signer),
    },
  ],
});

// --- Endpoint payloads ---
const ENDPOINTS = [
  {
    path: '/skin/analyze',
    body: {
      description:
        'Oily T-zone, dry cheeks, occasional breakouts on chin and forehead. Some dark spots from old acne scars.',
    },
  },
  {
    path: '/skin/quiz',
    body: {
      skin_concerns: ['acne', 'oiliness', 'dark spots'],
      age: 26,
      gender: 'female',
      climate: 'tropical humid',
      lifestyle: 'office worker, exercises 3x/week',
      current_routine: 'cleanser + moisturizer only',
    },
  },
  {
    path: '/ingredients/check',
    body: {
      ingredients: [
        'Water',
        'Glycerin',
        'Niacinamide',
        'Sodium Hyaluronate',
        'Salicylic Acid',
        'Panthenol',
        'Cetyl Alcohol',
        'Dimethicone',
        'Phenoxyethanol',
        'Tocopherol',
        'Carbomer',
        'Xanthan Gum',
      ],
    },
  },
  {
    path: '/ingredients/recommend',
    body: {
      skin_profile: {
        skinType: 'oily',
        concerns: [
          { name: 'acne', score: 7 },
          { name: 'oiliness', score: 8 },
          { name: 'hyperpigmentation', score: 5 },
        ],
        topConcerns: ['acne', 'oiliness', 'hyperpigmentation'],
        confidence: 0.8,
      },
    },
  },
  {
    path: '/routine/build',
    body: {
      skin_profile: {
        skin_type: 'oily',
        top_concerns: ['acne', 'oiliness', 'dark spots'],
        concerns: [
          { name: 'acne', score: 72 },
          { name: 'oiliness', score: 65 },
          { name: 'hyperpigmentation', score: 48 },
        ],
      },
      budget: 'moderate',
      goals: ['clear acne', 'reduce oiliness', 'fade dark spots'],
    },
  },
  {
    path: '/product/match',
    body: {
      product_name: 'CeraVe Foaming Facial Cleanser',
      ingredients: [
        'Water',
        'Cocamidopropyl Hydroxysultaine',
        'Glycerin',
        'Sodium Lauroyl Sarcosinate',
        'Niacinamide',
        'Sodium Methyl Cocoyl Taurate',
        'Ceramide NP',
        'Ceramide AP',
        'Ceramide EOS',
        'Hyaluronic Acid',
        'Cholesterol',
        'Phenoxyethanol',
      ],
      skin_profile: {
        skin_type: 'oily',
        top_concerns: ['acne', 'oiliness'],
      },
    },
  },
];

// --- Stats ---
let totalCalls = 0;
let successCalls = 0;
let failedCalls = 0;
let totalSpent = 0; // in cents

const PRICES: Record<string, number> = {
  '/skin/analyze': 5,
  '/skin/quiz': 3,
  '/ingredients/check': 2,
  '/ingredients/recommend': 2,
  '/routine/build': 5,
  '/product/match': 2,
};

// --- Main loop ---
async function callEndpoint(endpoint: { path: string; body: object }): Promise<boolean> {
  const url = `${GLOWFY_URL}${endpoint.path}`;
  try {
    const response = await fetchWithPayment(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(endpoint.body),
    });

    totalCalls++;

    if (response.ok) {
      successCalls++;
      totalSpent += PRICES[endpoint.path] || 0;
      const data = await response.json();
      const preview = JSON.stringify(data).slice(0, 80);
      console.log(`  ✅ ${endpoint.path} → ${response.status} | ${preview}...`);
      return true;
    }

    failedCalls++;
    const errorText = await response.text();
    console.log(`  ❌ ${endpoint.path} → ${response.status} | ${errorText.slice(0, 100)}`);
    return false;
  } catch (err) {
    totalCalls++;
    failedCalls++;
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ❌ ${endpoint.path} → ERROR: ${msg.slice(0, 100)}`);
    return false;
  }
}

async function runRound(roundNum: number): Promise<void> {
  console.log(`\n--- Round ${roundNum} | ${new Date().toISOString()} ---`);

  for (const endpoint of ENDPOINTS) {
    await callEndpoint(endpoint);
    // Small delay between calls to avoid rate limiting
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(
    `  📊 Stats: ${successCalls}/${totalCalls} success | $${(totalSpent / 100).toFixed(2)} spent`,
  );
}

async function main() {
  console.log('=== GLOWFY BUYER LOOP ===');
  console.log(`Target: ${GLOWFY_URL}`);
  console.log(`Buyer:  ${account.address}`);
  console.log(`Delay:  ${LOOP_DELAY_MS}ms between rounds`);
  console.log(`Rounds: ${MAX_ROUNDS === 0 ? 'infinite' : MAX_ROUNDS}`);
  console.log('');

  let round = 1;
  while (MAX_ROUNDS === 0 || round <= MAX_ROUNDS) {
    await runRound(round);
    round++;

    if (MAX_ROUNDS !== 0 && round > MAX_ROUNDS) break;

    // Wait between rounds
    await new Promise((r) => setTimeout(r, LOOP_DELAY_MS));
  }

  console.log('\n=== FINAL STATS ===');
  console.log(`Total calls: ${totalCalls}`);
  console.log(`Success: ${successCalls}`);
  console.log(`Failed: ${failedCalls}`);
  console.log(`Total spent: $${(totalSpent / 100).toFixed(2)}`);
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
