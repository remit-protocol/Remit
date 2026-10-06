import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  getAddress,
  type Account,
  type Address,
  type Hash,
} from 'viem';
import { spendingVaultAbi } from './vault-abi.js';
const positiveAmountSchema = {
  parse(value: string) {
    if (!/^[1-9][0-9]*$/.test(value) || BigInt(value) >= 2n ** 256n)
      throw new Error('Amount must be a positive uint256 base-unit integer string');
    return value;
  },
};
/** Direct scoped-agent client. The caller supplies its external signer; the API never receives keys. */
export function createTestnetAgent(options: {
  rpcUrl: string;
  vault: Address;
  signer: Account;
  chainId?: 46630 | 31337;
}) {
  const chainId = options.chainId ?? 46630;
  if (chainId !== 46630 && chainId !== 31337) throw new Error('Mainnet execution is disabled.');
  const chain = defineChain({
    id: chainId,
    name: chainId === 46630 ? 'Robinhood Chain Testnet' : 'Local Anvil',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [options.rpcUrl] } },
    testnet: true,
  });
  const publicClient = createPublicClient({ chain, transport: http(options.rpcUrl) });
  const wallet = createWalletClient({
    chain,
    account: options.signer,
    transport: http(options.rpcUrl),
  });
  const vault = getAddress(options.vault);
  return {
    async pay(input: { policyId: string; recipient: Address; amount: string; paymentId: Hash }) {
      if ((await publicClient.getChainId()) !== chainId) throw new Error('RPC chain mismatch.');
      if (!/^[1-9][0-9]*$/.test(input.policyId) || BigInt(input.policyId) >= 2n ** 256n)
        throw new Error('Invalid policy id.');
      if (!/^0x[a-fA-F0-9]{64}$/.test(input.paymentId) || /^0x0{64}$/.test(input.paymentId))
        throw new Error(
          'Supply a unique nonzero bytes32 payment id and reuse it when retrying the same payment.',
        );
      const { request } = await publicClient.simulateContract({
        address: vault,
        abi: spendingVaultAbi,
        functionName: 'pay',
        args: [
          BigInt(input.policyId),
          getAddress(input.recipient),
          BigInt(positiveAmountSchema.parse(input.amount)),
          input.paymentId,
        ],
        account: options.signer,
      });
      return wallet.writeContract(request);
    },
    async receipt(hash: Hash) {
      if ((await publicClient.getChainId()) !== chainId) throw new Error('RPC chain mismatch.');
      return publicClient.waitForTransactionReceipt({
        hash,
        confirmations: chainId === 46630 ? 2 : 1,
        timeout: 60000,
      });
    },
  };
}
