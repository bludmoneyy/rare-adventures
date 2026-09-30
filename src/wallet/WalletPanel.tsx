import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { discoverWallets, ROBINHOOD, WalletClient, type Wallet } from "./client";
import "./wallet.css";

export function WalletPanel({ client, triggerTarget, petCount, petError, loadingPets }: {
  client: WalletClient; triggerTarget: HTMLElement | null; petCount?: number; petError?: string; loadingPets?: boolean;
}) {
  const state = useSyncExternalStore(client.subscribe, client.getSnapshot);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const stop = discoverWallets(window, setWallets);
    return () => { stop(); client.disconnect(); };
  }, [client]);
  const short = state.address ? `${state.address.slice(0, 6)}…${state.address.slice(-4)}` : undefined;
  const correctNetwork = state.chainId === ROBINHOOD.chainId;
  return <>
    {triggerTarget && createPortal(<button className="wallet-trigger" onClick={() => dialog.current?.showModal()} aria-haspopup="dialog">
      {state.busy ? "Connecting…" : short || "Connect wallet"}
    </button>, triggerTarget)}
    {createPortal(<dialog ref={dialog} onClose={() => triggerTarget?.querySelector("button")?.focus()} className="wallet-dialog" aria-labelledby="wallet-title">
      <div className="wallet-title-row">
        <h2 id="wallet-title">Your wallet</h2>
        <button autoFocus onClick={() => dialog.current?.close()} aria-label="Close wallet">×</button>
      </div>
      <p>Connect your wallet on Robinhood Chain to load and play with your owned Genesis and Generations pets.</p>
      {state.error && <p className="wallet-error" role="alert">{state.error}</p>}
      <div aria-live="polite" aria-busy={state.busy}>
        {state.wallet ? <>
          <p><b>{state.wallet.name}</b>{state.busy && " · Check your wallet…"}</p>
          {state.address && <>
            <p className="wallet-address">{state.address}</p>
            <p>{correctNetwork ? "Robinhood Chain · 4663" : state.chainId ? `Different network · ${BigInt(state.chainId).toString()}` : "Checking network…"}</p>
            {correctNetwork && <>
              <p><b>{state.balance === undefined ? "ETH balance unavailable" : `${state.balance} ETH`}</b></p>
              <a href={`${ROBINHOOD.blockExplorerUrls[0]}/address/${state.address}`} target="_blank" rel="noopener noreferrer">View account on explorer ↗</a>
            </>}
          </>}
          <div className="wallet-actions">
            {!correctNetwork && <button disabled={state.busy} onClick={() => void client.switchNetwork()}>Switch to Robinhood Chain</button>}
            <button disabled={state.busy} onClick={() => void client.refresh()}>Refresh account</button>
            <button onClick={client.disconnect}>{state.busy ? "Cancel connection" : "Disconnect"}</button>
          </div>
          <p className="wallet-note">Disconnect ends this app session. You can revoke site permissions in your wallet. Reconnect after reloading the page.</p>
        </> : <>
          {wallets.length ? <div className="wallet-options">{wallets.map((wallet, index) =>
            <button key={`${wallet.id}-${index}`} onClick={() => void client.connect(wallet)}>{wallet.name}</button>,
          )}</div> : <p>No browser wallet detected. Enable an Ethereum wallet extension, or open this page in your mobile wallet’s browser. External mobile connections via QR code are not supported yet.</p>}
        </>}
      </div>
      {loadingPets && <p role="status">Loading your owned pets…</p>}
      {petError && <p role="alert">{petError} Close this panel to retry loading your pets.</p>}
      {petCount !== undefined && <p role="status">{petCount ? `${petCount} owned pet${petCount === 1 ? "" : "s"} ready to play.` : "No playable Genesis or hardwired Generations pets found in this wallet."}</p>}
      {!!petCount && <button onClick={() => dialog.current?.close()}>Choose a pet</button>}
      <div className="wallet-demo-note"><b>Gameplay uses simulated RF</b><p>Your owned pets are verified on Robinhood Chain. Game items and progress are saved locally for each wallet; RF purchases and rewards remain simulated. No signatures, token approvals, or transactions are requested.</p></div>
    </dialog>, document.body)}
  </>;
}
