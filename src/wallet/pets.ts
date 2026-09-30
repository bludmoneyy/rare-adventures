import { Interface, getAddress, id, zeroPadValue } from "ethers";

// Canonical deployments: https://rarefriends.com/docs/contracts
export const COLLECTIONS = [
  { name: "Genesis", address: "0x116eaa62241751e0c98da43d458600c6c17cd361", startBlock: 0n },
  { name: "Generations", address: "0x14c49e6118f46525de9ab41a51cbaa3c6ebf181d", startBlock: 63102373n },
] as const;
export const LANDS = ["Coastal", "Garden", "Industrial", "Market", "Mineral", "Orbital", "Reading", "Rooftop"] as const;
export type Pet = {
  id: string; tokenId: string; contract: string; collection: "Genesis" | "Generations";
  name: string; generation: number; family: string; land?: typeof LANDS[number];
  imageUrl: string; spriteUrl: string;
};
export type Rpc = (method: string, params: unknown[], signal?: AbortSignal) => Promise<unknown>;
export const NFT_ABI = new Interface([
  "function balanceOf(address) view returns(uint256)", "function ownerOf(uint256) view returns(address)",
  "function tokenURI(uint256) view returns(string)", "function generation(uint256) view returns(uint8)",
]);
const TRANSFER = id("Transfer(address,address,uint256)");
const hex = (n: bigint) => `0x${n.toString(16)}`;
const equal = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
export const rpc: Rpc = async (method, params, signal) => {
  const response = await fetch("https://rpc.mainnet.chain.robinhood.com", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(20000)]),
  });
  if (!response.ok) throw new Error("Robinhood RPC is unavailable. Please retry.");
  const body = await response.json();
  if (body.error || body.result === undefined) throw new Error("Could not read NFT ownership from Robinhood Chain. Please retry.");
  return body.result;
};
const quantity = (value: unknown): bigint => {
  if (typeof value !== "string" || !/^0x[0-9a-f]+$/i.test(value)) throw new Error("Invalid chain response.");
  return BigInt(value);
};
export async function contractRead(call: Rpc, address: string, method: string, args: unknown[], block: string, signal?: AbortSignal) {
  signal?.throwIfAborted();
  const result = await call("eth_call", [{ to: address, data: NFT_ABI.encodeFunctionData(method, args) }, block], signal);
  signal?.throwIfAborted();
  if (typeof result !== "string") throw new Error("Invalid contract response.");
  return NFT_ABI.decodeFunctionResult(method, result)[0];
}
export function decodeMetadata(uri: string): Record<string, unknown> {
  if (uri.length > 4000000 || !/^data:application\/json(?:;charset=utf-8)?(?:;base64)?,/i.test(uri)) throw new Error("Unsupported NFT metadata format.");
  const comma = uri.indexOf(","), encoded = uri.slice(comma + 1);
  const text = uri.slice(0, comma).includes(";base64")
    ? new TextDecoder().decode(Uint8Array.from(atob(encoded), c => c.charCodeAt(0))) : decodeURIComponent(encoded);
  const metadata = JSON.parse(text);
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) throw new Error("Invalid NFT metadata.");
  return metadata;
}
export function parsePet(collection: typeof COLLECTIONS[number], tokenId: bigint, generation: number, uri: string): Pet {
  const metadata = decodeMetadata(uri);
  const attributes = Array.isArray(metadata.attributes) ? metadata.attributes : [];
  const trait = (name: string) => attributes.find(a => a && typeof a.trait_type === "string" && a.trait_type.toLowerCase() === name.toLowerCase())?.value;
  // Canonical renderers return self-contained SVGs. Never render metadata as inline HTML.
  const image = metadata.image;
  if (typeof image !== "string" || image.length > 3000000 || !/^data:image\/svg\+xml(?:;charset=utf-8)?(?:;base64)?,/i.test(image)) throw new Error("NFT artwork is unavailable or unsupported.");
  const scenery = trait("Scenery");
  const land = LANDS.find(value => typeof scenery === "string" && value.toLowerCase() === scenery.toLowerCase());
  const family = trait("Character");
  return {
    id: `4663:${collection.address}:${tokenId}`, tokenId: tokenId.toString(), contract: collection.address,
    collection: collection.name, name: `${collection.name} #${tokenId}`, generation,
    family: typeof family === "string" ? family.slice(0, 80) : collection.name,
    land, imageUrl: image, spriteUrl: image,
  };
}
/** Original portrait paths, detached from the landscape, shown only through an img data URL. */
export function petSprite(pet: Pet): string {
  if (pet.collection === "Genesis") return pet.imageUrl;
  try {
    const comma = pet.imageUrl.indexOf(",");
    const svg = pet.imageUrl.slice(0, comma).includes(";base64") ? atob(pet.imageUrl.slice(comma + 1)) : decodeURIComponent(pet.imageUrl.slice(comma + 1));
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    const portrait = doc.querySelector('g[id="portrait"]');
    if (!portrait || doc.querySelector("parsererror")) return pet.imageUrl;
    const art = new XMLSerializer().serializeToString(portrait);
    return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 36 36" shape-rendering="crispEdges">${art}</svg>`)}`;
  } catch { return pet.imageUrl; }
}
export async function readOwnedPets(account: string, signal?: AbortSignal, call: Rpc = rpc): Promise<Pet[]> {
  account = getAddress(account);
  if (account === "0x0000000000000000000000000000000000000000") throw new Error("Connect a valid wallet.");
  if (quantity(await call("eth_chainId", [], signal)) !== 4663n) throw new Error("NFT lookup requires Robinhood Chain.");
  const blockNumber = quantity(await call("eth_blockNumber", [], signal)), block = hex(blockNumber);
  const accountTopic = zeroPadValue(account, 32).toLowerCase();
  const pets: Pet[] = [];
  for (const collection of COLLECTIONS) {
    const balance = BigInt(await contractRead(call, collection.address, "balanceOf", [account], block, signal));
    if (balance > 1000n) throw new Error("Wallets with more than 1,000 pets per collection need an indexed roster service.");
    if (balance === 0n) continue;
    const events = new Map<string, { block: bigint; index: bigint; token: bigint; to: string }>();
    let logCount = 0;
    for (let start = collection.startBlock; start <= blockNumber; start += 10000000n) {
      const end = start + 9999999n < blockNumber ? start + 9999999n : blockNumber;
      for (const topics of [[TRANSFER, null, accountTopic], [TRANSFER, accountTopic]]) {
        signal?.throwIfAborted();
        const logs = await call("eth_getLogs", [{ address: collection.address, fromBlock: hex(start), toBlock: hex(end), topics }], signal);
        if (!Array.isArray(logs) || (logCount += logs.length) > 100000) throw new Error("NFT transfer history exceeds the supported limit.");
        for (const log of logs) {
          if (!log || typeof log.address !== "string" || !equal(log.address, collection.address) || log.removed || !Array.isArray(log.topics) || log.topics.length !== 4 || log.topics[0] !== TRANSFER || !log.topics.slice(1).every((v: unknown) => typeof v === "string" && /^0x[0-9a-f]{64}$/i.test(v))) throw new Error("Invalid NFT transfer history.");
          const from = log.topics[1].toLowerCase(), to = log.topics[2].toLowerCase();
          if (from !== accountTopic && to !== accountTopic) throw new Error("Unrelated NFT transfer history.");
          const at = quantity(log.blockNumber), index = quantity(log.logIndex);
          if (at < start || at > end) throw new Error("NFT transfer history outside snapshot.");
          const key = `${at}:${index}`, token = quantity(log.topics[3]), previous = events.get(key);
          if (previous && (previous.token !== token || previous.to !== to)) throw new Error("Conflicting NFT transfer history.");
          events.set(key, { block: at, index, token, to });
        }
      }
    }
    const held = new Set<bigint>();
    for (const event of [...events.values()].sort((a, b) => a.block === b.block ? Number(a.index - b.index) : a.block < b.block ? -1 : 1)) {
      if (event.to === accountTopic) held.add(event.token); else held.delete(event.token);
    }
    if (BigInt(held.size) !== balance) throw new Error("NFT history is incomplete. Please refresh your pets.");
    const ids = [...held].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
    for (let i = 0; i < ids.length; i += 4) {
      const group = await Promise.all(ids.slice(i, i + 4).map(async tokenId => {
        const owner = await contractRead(call, collection.address, "ownerOf", [tokenId], block, signal);
        if (!equal(owner, account)) throw new Error("Pet ownership changed. Please refresh your pets.");
        const generation = collection.name === "Genesis" ? 0 : Number(await contractRead(call, collection.address, "generation", [tokenId], block, signal));
        if (collection.name === "Generations" && generation < 1) return null;
        const uri = await contractRead(call, collection.address, "tokenURI", [tokenId], block, signal);
        return parsePet(collection, tokenId, generation, uri);
      }));
      pets.push(...group.filter((p): p is Pet => p !== null));
    }
  }
  signal?.throwIfAborted();
  return pets;
}

export const battleEfficiency = (pet: { collection?: string; land?: string }, arena: string) =>
  pet.collection === "Genesis" || pet.land === arena ? 1.1 : 1;
