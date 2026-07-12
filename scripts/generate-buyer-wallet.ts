/**
 * Generate a new buyer wallet for x402 payment testing.
 * Run: bun run scripts/generate-buyer-wallet.ts
 *
 * SAVE THE OUTPUT — you need the private key for the buyer script.
 * Fund this address with USDT0 on X Layer (chain 196).
 */
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);

console.log('=== NEW BUYER WALLET ===');
console.log(`Address:     ${account.address}`);
console.log(`Private Key: ${privateKey}`);
console.log('');
console.log('Next steps:');
console.log('1. Add to .env: BUYER_PRIVATE_KEY=<private key above>');
console.log('2. Fund this address with USDT0 on X Layer (chain 196)');
console.log('3. Run: bun run scripts/approve-permit2.ts');
console.log('4. Run: bun run scripts/buyer-loop.ts');
