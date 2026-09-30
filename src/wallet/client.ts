import { formatEther, getAddress } from "ethers";

export const ROBINHOOD = {
  chainId: "0x1237",
  chainName: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://rpc.mainnet.chain.robinhood.com"],
  blockExplorerUrls: ["https://robinhoodchain.blockscout.com"],
};
export type Provider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on(event: string, listener: (value: unknown) => void): void;
  removeListener(event: string, listener: (value: unknown) => void): void;
};
export type Wallet = { id: string; name: string; provider: Provider };
export type WalletState = {
  wallet?: Wallet; address?: string; chainId?: string; balance?: string;
  busy: boolean; error?: string;
};
export function isProvider(value: unknown): value is Provider {
  const p = value as Partial<Provider> | undefined;
  return !!p && typeof p.request === "function" && typeof p.on === "function" && typeof p.removeListener === "function";
}
function code(error: unknown) { return (error as { code?: number })?.code; }
export function walletError(error: unknown): string {
  switch (code(error)) {
    case 4001: return "Request declined. You can try again when you’re ready.";
    case -32002: return "A request is already open in your wallet. Open it to continue.";
    case 4100: return "Account access is not authorized. Reconnect your wallet.";
    case 4200: case -32601: return "Your wallet does not support this request. Change the network in your wallet or try another wallet.";
    case 4900: case 4901: return "Your wallet is offline. Check its connection and reconnect.";
    case 4902: return "Add Robinhood Chain in your wallet, then try again.";
    default: return error instanceof Error && error.message === "Wallet request timed out."
      ? "Wallet request timed out. Check your wallet before trying again."
      : "Could not read your wallet. Check its connection and try again.";
  }
}
export async function request(provider: Provider, method: string, params?: unknown[], timeout = 30000): Promise<unknown> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      provider.request({ method, ...(params ? { params } : {}) }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Wallet request timed out.")), timeout); }),
    ]);
  } finally { clearTimeout(timer); }
}
function chain(value: unknown): string {
  if (typeof value !== "string" || !/^0x[0-9a-f]+$/i.test(value)) throw new Error("Invalid chain");
  return `0x${BigInt(value).toString(16)}`;
}

/** Wallet state is never loaded from game saves or treated as authenticated identity. */
export class WalletClient {
  private state: WalletState = { busy: false };
  private listeners = new Set<() => void>();
  private cleanup?: () => void;
  private session = 0;
  private revision = 0;
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<WalletState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  disconnect = () => {
    this.session++; this.revision++;
    this.cleanup?.(); this.cleanup = undefined;
    this.state = { busy: false };
    this.listeners.forEach((listener) => listener());
  };
  connect = async (wallet: Wallet) => {
    if (this.state.busy) return;
    this.disconnect();
    const session = this.session;
    this.update({ wallet, busy: true });
    const changed = () => {
      // Clear previous identity and balance immediately, before asynchronous reads.
      this.update({ address: undefined, chainId: undefined, balance: undefined });
      void this.refresh();
    };
    const disconnected = () => { this.disconnect(); this.update({ error: "Wallet disconnected. Reconnect to continue." }); };
    const events: [string, (value: unknown) => void][] = [
      ["accountsChanged", changed], ["chainChanged", changed], ["disconnect", disconnected],
    ];
    this.cleanup = () => events.forEach(([event, handler]) => wallet.provider.removeListener(event, handler));
    try {
      events.forEach(([event, handler]) => wallet.provider.on(event, handler));
      await request(wallet.provider, "eth_requestAccounts");
      if (session !== this.session) return;
      await this.refresh();
    } catch (error) {
      if (session === this.session) { this.disconnect(); this.update({ error: walletError(error) }); }
    } finally {
      if (session === this.session) this.update({ busy: false });
    }
  };
  refresh = async () => {
    const wallet = this.state.wallet;
    if (!wallet) return;
    const session = this.session, revision = ++this.revision;
    const current = () => session === this.session && revision === this.revision;
    try {
      const [accounts, network] = await Promise.all([
        request(wallet.provider, "eth_accounts"), request(wallet.provider, "eth_chainId"),
      ]);
      if (!current()) return;
      if (!Array.isArray(accounts)) throw new Error("Invalid accounts");
      if (!accounts.length) { this.disconnect(); this.update({ error: "No account is available. Unlock your wallet and reconnect." }); return; }
      const address = getAddress(accounts[0]), chainId = chain(network);
      this.update({ address, chainId, balance: undefined, error: undefined });
      if (chainId !== ROBINHOOD.chainId) return;
      try {
        const value = await request(wallet.provider, "eth_getBalance", [address, "latest"]);
        if (typeof value !== "string" || !/^0x[0-9a-f]+$/i.test(value)) throw new Error("Invalid balance");
        if (current()) this.update({ balance: formatEther(BigInt(value)) });
      } catch (error) {
        if (current()) this.update({ error: `Balance unavailable. ${walletError(error)}` });
      }
    } catch (error) {
      if (current()) this.update({ address: undefined, chainId: undefined, balance: undefined, error: walletError(error) });
    }
  };
  switchNetwork = async () => {
    const wallet = this.state.wallet;
    if (!wallet || this.state.busy) return;
    const session = this.session;
    this.update({ busy: true, error: undefined });
    try {
      try { await request(wallet.provider, "wallet_switchEthereumChain", [{ chainId: ROBINHOOD.chainId }]); }
      catch (error) {
        if (code(error) !== 4902 || session !== this.session) throw error;
        await request(wallet.provider, "wallet_addEthereumChain", [ROBINHOOD]);
        if (session !== this.session) return;
        await request(wallet.provider, "wallet_switchEthereumChain", [{ chainId: ROBINHOOD.chainId }]);
      }
      if (session !== this.session) return;
      await this.refresh();
      if (session === this.session && this.state.chainId !== ROBINHOOD.chainId)
        this.update({ error: "Network did not change. Select Robinhood Chain in your wallet." });
    } catch (error) {
      if (session === this.session) this.update({ error: walletError(error) });
    } finally {
      if (session === this.session) this.update({ busy: false });
    }
  };
}

/** Discover all announced wallets; never load executable or remote wallet icons. */
export function discoverWallets(target: Window, publish: (wallets: Wallet[]) => void) {
  const wallets = new Map<Provider, Wallet>();
  const announce = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    if (!detail || !isProvider(detail.provider) || typeof detail.info?.uuid !== "string" || typeof detail.info?.name !== "string") return;
    wallets.set(detail.provider, { id: detail.info.uuid, name: detail.info.name.slice(0, 80), provider: detail.provider });
    publish([...wallets.values()]);
  };
  const legacy = () => {
    const provider = (target as Window & { ethereum?: Provider }).ethereum;
    if (isProvider(provider) && !wallets.has(provider)) {
      wallets.set(provider, { id: "injected", name: "Browser wallet", provider });
      publish([...wallets.values()]);
    }
  };
  target.addEventListener("eip6963:announceProvider", announce);
  target.addEventListener("ethereum#initialized", legacy);
  target.dispatchEvent(new Event("eip6963:requestProvider"));
  legacy();
  return () => {
    target.removeEventListener("eip6963:announceProvider", announce);
    target.removeEventListener("ethereum#initialized", legacy);
  };
}
