// LOCAL ANVIL ONLY. This account is unlocked by a local node; never expose that node publicly.
// For testnet, implement getSigner() using your own wallet or signing service instead.
import { createWalletClient, getAddress, http } from 'viem';

export async function getSigner() {
  if (process.env.REMIT_CHAIN_ID !== '31337') throw new Error('Local signer requires chain 31337');
  const rpc = new URL(process.env.REMIT_RPC_URL);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(rpc.hostname))
    throw new Error('Local signer requires a loopback RPC');
  const address = getAddress(process.env.REMIT_AGENT_ADDRESS);
  const wallet = createWalletClient({ account: address, transport: http(rpc.href) });
  if (Number(await wallet.request({ method: 'eth_chainId' })) !== 31337)
    throw new Error('Local signer refuses this chain');
  return { address, type: 'json-rpc' };
}
