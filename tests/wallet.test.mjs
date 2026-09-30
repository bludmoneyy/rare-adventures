import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { WalletClient, ROBINHOOD, discoverWallets, request } from '../src/wallet/client.ts';

const A = '0x0000000000000000000000000000000000000001';
const B = '0x0000000000000000000000000000000000000002';
class MockProvider extends EventEmitter {
  accounts = [A]; chainId = ROBINHOOD.chainId; calls = []; override;
  async request(args) {
    this.calls.push(args);
    if (this.override) { const result = this.override(args); if (result !== undefined) return result; }
    switch (args.method) {
      case 'eth_accounts': case 'eth_requestAccounts': return this.accounts;
      case 'eth_chainId': return this.chainId;
      case 'eth_getBalance': return '0xde0b6b3a7640000';
      case 'wallet_switchEthereumChain': this.chainId = args.params[0].chainId; this.emit('chainChanged', this.chainId); return null;
      case 'wallet_addEthereumChain': return null;
      default: throw new Error(`Unexpected method: ${args.method}`);
    }
  }
}
const wallet = provider => ({ id: 'test', name: 'Test Wallet', provider });
const tick = () => new Promise(resolve => setImmediate(resolve));

test('connect reads live account and balance without signing or transacting; disconnect cleans listeners', async () => {
  const p = new MockProvider(), client = new WalletClient();
  await client.connect(wallet(p));
  assert.equal(client.getSnapshot().address, A);
  assert.equal(client.getSnapshot().balance, '1.0');
  assert.equal(client.getSnapshot().busy, false);
  assert.deepEqual(p.calls.map(c => c.method), ['eth_requestAccounts', 'eth_accounts', 'eth_chainId', 'eth_getBalance']);
  client.disconnect();
  assert.deepEqual(client.getSnapshot(), { busy: false });
  assert.equal(p.eventNames().length, 0);
});
test('rejected connection is actionable and retry works', async () => {
  const p = new MockProvider(), client = new WalletClient();
  p.override = ({method}) => method === 'eth_requestAccounts' ? Promise.reject({code:4001}) : undefined;
  await client.connect(wallet(p));
  assert.match(client.getSnapshot().error, /declined/);
  assert.equal(client.getSnapshot().wallet, undefined);
  p.override = undefined;
  await client.connect(wallet(p));
  assert.equal(client.getSnapshot().address, A);
  client.disconnect();
});
test('account and network events invalidate stale balances; empty accounts disconnect', async () => {
  const p = new MockProvider(), client = new WalletClient();
  await client.connect(wallet(p));
  p.accounts = [B]; p.emit('accountsChanged', [B]);
  assert.equal(client.getSnapshot().address, undefined);
  await tick();
  assert.equal(client.getSnapshot().address, B);
  p.chainId = '0x1'; p.emit('chainChanged', '0x1');
  assert.equal(client.getSnapshot().balance, undefined);
  await tick();
  assert.equal(client.getSnapshot().chainId, '0x1');
  assert.equal(client.getSnapshot().balance, undefined);
  p.accounts = []; p.emit('accountsChanged', []); await tick();
  assert.equal(client.getSnapshot().wallet, undefined);
  assert.equal(p.eventNames().length, 0);
});
test('unknown network is added only after 4902 and then switched and verified', async () => {
  const p = new MockProvider(), client = new WalletClient(); p.chainId = '0x1';
  await client.connect(wallet(p));
  let first = true;
  p.override = ({method}) => { if (method === 'wallet_switchEthereumChain' && first) { first = false; return Promise.reject({code:4902}); } };
  await client.switchNetwork();
  assert.equal(client.getSnapshot().chainId, ROBINHOOD.chainId);
  assert.equal(client.getSnapshot().balance, '1.0');
  assert.deepEqual(p.calls.find(c => c.method === 'wallet_addEthereumChain').params, [ROBINHOOD]);
  client.disconnect();
});
test('rejected switch preserves account and never attempts add-network', async () => {
  const p = new MockProvider(), client = new WalletClient(); p.chainId = '0x1';
  await client.connect(wallet(p));
  p.override = ({method}) => method === 'wallet_switchEthereumChain' ? Promise.reject({code:4001}) : undefined;
  await client.switchNetwork();
  assert.equal(client.getSnapshot().address, A);
  assert.equal(client.getSnapshot().chainId, '0x1');
  assert.match(client.getSnapshot().error, /declined/);
  assert.ok(!p.calls.some(c => c.method === 'wallet_addEthereumChain'));
  client.disconnect();
});
test('late connection result cannot reconnect a cancelled session', async () => {
  const p = new MockProvider(), client = new WalletClient(); let resolve;
  p.override = ({method}) => method === 'eth_requestAccounts' ? new Promise(r => { resolve = r; }) : undefined;
  const connecting = client.connect(wallet(p)); client.disconnect(); resolve([A]); await connecting;
  assert.deepEqual(client.getSnapshot(), {busy:false});
});
test('late balance from a previous account cannot overwrite the current account', async () => {
  const p = new MockProvider(), client = new WalletClient(); await client.connect(wallet(p));
  let resolve;
  p.override = ({method,params}) => method === 'eth_getBalance' && params[0] === A ? new Promise(r => {resolve = r;}) : undefined;
  const reading = client.refresh(); await tick();
  p.accounts = [B]; p.emit('accountsChanged', [B]); await tick();
  resolve('0x0'); await reading;
  assert.equal(client.getSnapshot().address, B);
  assert.equal(client.getSnapshot().balance, '1.0');
  client.disconnect();
});
test('provider disconnect and malformed responses cannot retain an identity', async () => {
  const p = new MockProvider(), client = new WalletClient(); await client.connect(wallet(p));
  p.accounts = ['invalid']; await client.refresh();
  assert.equal(client.getSnapshot().address, undefined);
  p.emit('disconnect', {code:4900});
  assert.equal(client.getSnapshot().wallet, undefined);
  assert.equal(p.eventNames().length, 0);
});
test('request timeout settles rather than hanging', async () => {
  await assert.rejects(request({request: () => new Promise(() => {})}, 'eth_accounts', undefined, 5), /timed out/);
});
test('discovery deduplicates providers, supports late announcements, and unsubscribes', () => {
  const target = new EventTarget(), p = new MockProvider(); target.ethereum = p;
  let found;
  const stop = discoverWallets(target, wallets => {found = wallets;});
  assert.equal(found.length, 1);
  const announce = () => target.dispatchEvent(new CustomEvent('eip6963:announceProvider', {detail:{info:{uuid:'one',name:'Named Wallet'},provider:p}}));
  announce(); announce();
  assert.equal(found.length, 1); assert.equal(found[0].name, 'Named Wallet');
  stop(); found = []; announce(); assert.equal(found.length, 0);
});
