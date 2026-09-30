import { useEffect, useState } from "react";
import { petSprite, readOwnedPets, type Pet } from "./pets";

export function useOwnedPets(account: string | undefined) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ account?: string; pets?: Pet[]; error?: string; refreshing: boolean }>({ refreshing: false });
  useEffect(() => {
    if (!account) { setState({ refreshing: false }); return; }
    const controller = new AbortController();
    let running = false;
    const refresh = async () => {
      if (running) return;
      running = true;
      setState(previous => ({ ...(previous.account === account ? previous : {}), account, error: undefined, refreshing: true }));
      try {
        const pets = (await readOwnedPets(account, controller.signal)).map(pet => ({ ...pet, spriteUrl: petSprite(pet) }));
        if (!controller.signal.aborted) setState({ account, pets, refreshing: false });
      } catch (error) {
        if (!controller.signal.aborted) setState({ account, error: error instanceof Error ? error.message : "Could not load your pets. Please retry.", refreshing: false });
      } finally { running = false; }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60000);
    const focus = () => { if (!document.hidden) void refresh(); };
    window.addEventListener("focus", focus);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener("focus", focus); };
  }, [account, revision]);
  // Never expose results belonging to a previous account, even for one render.
  return { ...(state.account === account ? state : { refreshing: !!account }), refresh: () => setRevision(value => value + 1) };
}
