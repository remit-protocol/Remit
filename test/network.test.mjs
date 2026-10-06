import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { createTestnetAgent } from '../dist/index.js';

const address = '0x0000000000000000000000000000000000000001';
test('refuses a mainnet RPC before attempting spending or receipt reconciliation', async () => {
  const methods = [];
  const server = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    const request = JSON.parse(body);
    methods.push(request.method);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ jsonrpc: '2.0', id: request.id, result: '0x1' }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const agent = createTestnetAgent({
      rpcUrl: `http://127.0.0.1:${server.address().port}`,
      vault: address,
      signer: { address, type: 'json-rpc' },
    });
    await assert.rejects(
      agent.pay({
        policyId: '1',
        recipient: address,
        amount: '1',
        paymentId: '0x' + '1'.repeat(64),
      }),
      /RPC chain mismatch/,
    );
    await assert.rejects(agent.receipt('0x' + '2'.repeat(64)), /RPC chain mismatch/);
    assert.deepEqual(methods, ['eth_chainId', 'eth_chainId']);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
