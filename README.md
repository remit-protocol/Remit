# Remit SDK

TypeScript / JavaScript client for scoped agent payments on Robinhood Chain testnet. No MCP server is required to use this library. This package is prepared for publication; npm name and account ownership must be confirmed before publishing. Mainnet execution is disabled.

## Install

After publication: `npm install @remit_protocol/sdk`. Before publication, build and pack this directory using `npm install && npm pack`, then install the generated tarball. It has no dependency on the private application repository.

## Use

```ts
import { createTestnetAgent } from '@remit_protocol/sdk';
// signer is a viem Account provided by your runtime's signing system.
const remit = createTestnetAgent({
  rpcUrl: 'https://rpc.testnet.chain.robinhood.com',
  vault: userVaultAddress,
  signer,
});
const hash = await remit.pay({
  policyId: '1',
  recipient: approvedRecipientAddress,
  amount: '1000000', // one credit with six decimals
  paymentId: persistedUniqueBytes32Id,
});
const receipt = await remit.receipt(hash);
if (receipt.status !== 'success') throw new Error('Payment reverted');
```

The owner must first fund this vault and authorize the signer's address. The agent needs native testnet ETH for gas. Amounts are uint256-compatible base-unit strings. Choose a unique nonzero bytes32 payment ID, persist it before submitting, and reuse it when retrying the same intent. Do not generate a new ID just because confirmation timed out. Reconcile a submitted hash before retrying. The contract enforces identity, recipients, limits, expiry, policy status and replay protection; preflight is only a preview of execution state.

## Configuration

The Remit dashboard exports a public JSON policy configuration containing chain ID, RPC URL, vault, asset decimals, policy ID, agent address, recipients, limits and expiry. Pass its rpcUrl/vault and policyId to this client. Provide the signer separately; the export contains no signing credentials. Never paste signing keys into chats or commit them to a repository.

## What this proves

A successful receipt proves a token transfer, not service delivery. Pausing/revoking stops future authorized execution; it does not reverse previous transfers. Policies have independent daily budgets aligned to UTC midnight. The library accepts chain 46630 and isolated local chain 31337 only.

## Repository setup

The SDK-only repository is https://github.com/remit-protocol/Remit. Choose licensing, confirm the npm scope, and configure npm publishing before release. No publishing credentials or application backend source is included.

## Run an independent agent

Requirements: Node.js 22+, an owner-funded vault and active policy from the dashboard, and an agent signer whose address matches that policy. The agent runs outside the Remit frontend/backend. It sends a scoped transaction directly to the vault over RPC.

Clone this public SDK repository and run:

```sh
npm ci
npm run build
```

Use the dashboard's exported configuration to fill these **public** environment variables:

```sh
export REMIT_CHAIN_ID=46630
export REMIT_RPC_URL=https://rpc.testnet.chain.robinhood.com
export REMIT_VAULT_ADDRESS=0xYOUR_VAULT
export REMIT_POLICY_ID=1
export REMIT_RECIPIENT=0xAPPROVED_RECIPIENT
export REMIT_AMOUNT=1000000
export REMIT_SIGNER_MODULE=/absolute/path/to/your-signer.mjs
# Generate once per purchase; persist and reuse the same ID for retries.
export REMIT_PAYMENT_ID=$(node -e 'console.log("0x" + require("node:crypto").randomBytes(32).toString("hex"))')
npm run example:pay
```

Your signer module must export `async function getSigner()` returning a viem Account from your signing provider. Keep that module and any credentials outside this repository. The included `examples/local-signer.mjs` uses an unlocked **loopback Anvil** account for development only; set chain ID 31337, a loopback RPC and REMIT_AGENT_ADDRESS to use it. There is no hosted signing or custody service in this SDK.

The example logs the payment ID, submitted hash and confirmed receipt. Preserve those logs. If confirmation times out after submission, use the logged hash with `client.receipt(hash)` or the explorer before retrying. A successful transfer does not prove an API delivered a service.

## Acceptance walkthrough

1. Connect an owner wallet, authenticate, create its vault and claim test credits in Remit.
2. Fund the vault. Grant a policy to a separate agent address: approved recipient, 2-credit per-payment limit, 20-credit daily budget and an expiry.
3. Export configuration. Supply that agent's signer separately and give it testnet gas.
4. Run the example for 1 credit (`1000000` base units). Confirm the hash and receipt in Remit.
5. Try 3 credits (`3000000`) with a new payment ID. Preflight/contract rules reject the oversized payment.
6. Revoke the policy from the owner dashboard. A new agent payment must fail. Completed transfers remain completed.

Each policy has its own budget. Permission checks remain in the contract even if a caller bypasses this SDK.

## Release status

This repository contains only SDK source, public ABI, examples and developer documentation. The application frontend/backend are maintained separately. npm publication is pending account/scope configuration; `@remit/sdk` is a proposed package name, not a claim of an available published package. Licensing remains UNLICENSED until the project owner chooses release terms.

## Checks

`npm test` builds the SDK and tests that a mismatched RPC cannot initiate spending or receipt reconciliation. `npm pack --dry-run` shows exactly what npm will include. The private application also tests the complete fresh-user flow against isolated local contracts using this standalone example. That local proof is not a claim that the hosted testnet flow has passed.
