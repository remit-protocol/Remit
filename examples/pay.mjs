import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { getAddress } from 'viem';
import { createTestnetAgent } from '../dist/index.js';

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}; see README.md`);
  return value;
};
const chainId = Number(process.env.REMIT_CHAIN_ID ?? '46630');
if (chainId !== 46630 && chainId !== 31337)
  throw new Error('Only testnet/local execution is supported');
const signerModule = await import(pathToFileURL(resolve(required('REMIT_SIGNER_MODULE'))).href);
const signer = await signerModule.getSigner();
if (!signer || !signer.address) throw new Error('Signer module must return a viem Account');
const client = createTestnetAgent({
  rpcUrl: required('REMIT_RPC_URL'),
  vault: getAddress(required('REMIT_VAULT_ADDRESS')),
  signer,
  chainId,
});
const paymentId = required('REMIT_PAYMENT_ID');
// Persist this ID before submitting so retries cannot accidentally create a second payment.
console.log(JSON.stringify({ event: 'payment-intent', paymentId, agent: signer.address }));
const hash = await client.pay({
  policyId: required('REMIT_POLICY_ID'),
  recipient: getAddress(required('REMIT_RECIPIENT')),
  amount: required('REMIT_AMOUNT'),
  paymentId,
});
console.log(JSON.stringify({ event: 'submitted', hash, paymentId }));
const receipt = await client.receipt(hash);
if (receipt.status !== 'success') throw new Error('Payment transaction reverted');
console.log(
  JSON.stringify({
    event: 'confirmed',
    hash,
    paymentId,
    blockNumber: receipt.blockNumber.toString(),
    delivery: 'not_requested',
  }),
);
