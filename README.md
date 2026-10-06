# Remit SDK

The Remit SDK lets an autonomous agent make policy-scoped payments on Robinhood Chain testnet. The agent signs transactions with a wallet it controls; Remit never receives or stores private keys.

## Install

```bash
npm install @remit_protocol/sdk
```

## Quick start

```ts
import { createTestnetAgent } from '@remit_protocol/sdk';

const remit = createTestnetAgent({
  rpcUrl: 'https://rpc.testnet.chain.robinhood.com',
  vault: '0xYourVaultAddress',
  signer, // a viem Account owned by your agent runtime
});

const hash = await remit.pay({
  policyId: '1',
  recipient: '0xApprovedRecipient',
  amount: '1000000', // base units; one credit when the asset has six decimals
  paymentId: '0xUnique32BytePaymentId',
});

const receipt = await remit.receipt(hash);
if (receipt.status !== 'success') throw new Error('Payment reverted');
```

Before an agent can pay, the vault owner must fund the vault and authorize the agent address with a policy. The policy controls the approved recipients, per-payment limit, daily budget and expiry. The agent also needs native testnet ETH for transaction fees.

## Configuration

The Remit workspace provides a public configuration containing the chain ID, RPC URL, vault address, asset decimals, policy ID, agent address, recipients, limits and expiry. Use those values to configure your agent. The configuration never contains signing credentials.

Amounts are unsigned integer strings in token base units. Create a unique, nonzero 32-byte payment ID for each payment intent and persist it before submitting. Reuse the same ID when retrying after a timeout; first reconcile the original transaction hash.

## Standalone agent example

The repository includes a small runner for agents that execute outside the Remit web application. Set the public configuration values and point `REMIT_SIGNER_MODULE` at a module that returns a viem `Account` from your own wallet or signing service:

```bash
export REMIT_CHAIN_ID=46630
export REMIT_RPC_URL=https://rpc.testnet.chain.robinhood.com
export REMIT_VAULT_ADDRESS=0xYourVaultAddress
export REMIT_POLICY_ID=1
export REMIT_RECIPIENT=0xApprovedRecipient
export REMIT_AMOUNT=1000000
export REMIT_SIGNER_MODULE=/absolute/path/to/your-signer.mjs
export REMIT_PAYMENT_ID=0xYourUnique32BytePaymentId
npm run example:pay
```

The signer module and all credentials must remain outside the repository. The included loopback signer is for local development only and must never be used with a public RPC.

## Payment behavior

A successful receipt confirms the token transfer. It does not represent delivery of an external service. Pausing or revoking a policy blocks future payments and does not reverse completed transfers. Policy budgets reset at UTC midnight. Contract checks remain authoritative even when a payment is initiated through another client.

## Supported networks

The SDK accepts Robinhood Chain testnet (chain ID `46630`) and local development networks using chain ID `31337`. Mainnet execution is disabled.

## License

See the license included with this package.
