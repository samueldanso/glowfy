/**
 * Approve Permit2 contract to spend USDT0 on X Layer.
 * This is REQUIRED before x402 payments work — this is what killed ASPs 3197, 4356 in TG.
 *
 * Run: bun run scripts/approve-permit2.ts
 * Requires: BUYER_PRIVATE_KEY in .env
 */
import { createPublicClient, createWalletClient, http, maxUint256, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { xLayer } from 'viem/chains';

const USDT0_ADDRESS = '0x779ded0c9e1022225f8e0630b35a9b54be713736' as const;
const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3' as const;

const privateKey = process.env.BUYER_PRIVATE_KEY;
if (!privateKey) {
  console.error('ERROR: BUYER_PRIVATE_KEY not set in .env');
  process.exit(1);
}

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

const erc20Abi = parseAbi([
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
]);

async function main() {
  console.log(`Buyer wallet: ${account.address}`);
  console.log(`Chain: X Layer (196)`);
  console.log(`USDT0: ${USDT0_ADDRESS}`);
  console.log(`Permit2: ${PERMIT2_ADDRESS}`);
  console.log('');

  // Check USDT0 balance
  const balance = await publicClient.readContract({
    address: USDT0_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account.address],
  });
  console.log(`USDT0 balance: ${Number(balance) / 1e6} USDT`);

  if (balance === 0n) {
    console.error('ERROR: No USDT0 balance. Fund this wallet first.');
    process.exit(1);
  }

  // Check existing allowance
  const currentAllowance = await publicClient.readContract({
    address: USDT0_ADDRESS,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [account.address, PERMIT2_ADDRESS],
  });
  console.log(`Current Permit2 allowance: ${Number(currentAllowance) / 1e6} USDT`);

  if (currentAllowance > 0n) {
    console.log("Permit2 already approved. You're good to go.");
    return;
  }

  // Approve max uint256 to Permit2
  console.log('');
  console.log('Approving Permit2 for max USDT0...');

  const hash = await walletClient.writeContract({
    address: USDT0_ADDRESS,
    abi: erc20Abi,
    functionName: 'approve',
    args: [PERMIT2_ADDRESS, maxUint256],
  });

  console.log(`TX submitted: ${hash}`);
  console.log('Waiting for confirmation...');

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Confirmed in block ${receipt.blockNumber}`);
  console.log('');
  console.log('Permit2 approved. Ready for x402 payments.');
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
