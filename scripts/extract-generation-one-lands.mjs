import { mkdir, writeFile } from "node:fs/promises";
import { Contract, JsonRpcProvider } from "ethers";

const RPC = "https://rpc.mainnet.chain.robinhood.com";
const GENERATIONS = "0x14c49e6118f46525de9ab41a51cbaa3c6ebf181d";
const SCENERIES = ["Coastal", "Garden", "Industrial", "Market", "Mineral", "Orbital", "Reading", "Rooftop"];
const NFT_ABI = ["function tokenURI(uint256 tokenId) view returns (string)"];

const decodeJson = (uri) => JSON.parse(Buffer.from(uri.slice(uri.indexOf(",") + 1), "base64").toString("utf8"));
const trait = (metadata, name) => metadata.attributes?.find((item) => String(item.trait_type).toLowerCase() === name.toLowerCase())?.value;

const provider = new JsonRpcProvider(RPC);
const collection = new Contract(GENERATIONS, NFT_ABI, provider);
const found = new Map();
const confirmedGenerationOne = [2640, 67913, 59599, 3159, 505, 61031, 37734, 76624];

function consider(id, metadata) {
  const scenery = String(trait(metadata, "Scenery") ?? "");
  if (trait(metadata, "State") !== "Active" || !SCENERIES.includes(scenery) || found.has(scenery)) return;
  found.set(scenery, { id, metadata });
  console.log(`Found ${scenery}: token ${id}, generation ${trait(metadata, "Generation")}`);
}

for (const id of confirmedGenerationOne) {
  consider(id, decodeJson(await collection.tokenURI(id)));
}

// Retain a fallback scan for future regeneration if a confirmed reference becomes unavailable.
for (let start = 10000; start <= 12048 && found.size < SCENERIES.length; start += 20) {
  const ids = Array.from({ length: 20 }, (_, index) => start + index);
  const results = await Promise.all(ids.map((id) => collection.tokenURI(id).catch(() => null)));

  results.forEach((result, index) => {
    if (!result) return;
    consider(ids[index], decodeJson(result));
  });
}

function extractGroup(svg, id) {
  const start = svg.search(new RegExp(`<g\\s+[^>]*id=["']${id}["'][^>]*>`, "i"));
  if (start < 0) throw new Error(`Missing SVG group: ${id}`);
  const tags = /<\/?g\b[^>]*>/gi;
  tags.lastIndex = start;
  let depth = 0;
  for (let match; (match = tags.exec(svg));) {
    depth += match[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return svg.slice(start, tags.lastIndex);
  }
  throw new Error(`Unclosed SVG group: ${id}`);
}

const output = new URL("../src/assets/lands/", import.meta.url);
await mkdir(output, { recursive: true });
const sceneryTerrain = {
  Coastal: { surface: "#F2CE68", edge: "#ED927E", detail: "#8F7634", shadow: "#D3A94B" },
  Garden: { surface: "#B9D984", edge: "#ED927E", detail: "#637A3C", shadow: "#B9D984" },
  Industrial: { surface: "#B8BEC5", edge: "#7D858E", detail: "#59616A", shadow: "#7D858E" },
  Market: { surface: "#E8C98E", edge: "#ED927E", detail: "#896D3D", shadow: "#C69A58" },
  Mineral: { surface: "#AEB3BA", edge: "#747B84", detail: "#555B63", shadow: "#747B84" },
  Orbital: { surface: "#ECEBE6", edge: "#B3A0D8", detail: "#8D8C88", shadow: "#B3A0D8" },
  Reading: { surface: "#E8D9B4", edge: "#B99268", detail: "#887653", shadow: "#B99268" },
  Rooftop: { surface: "#C9CED3", edge: "#8E969E", detail: "#666D74", shadow: "#8E969E" },
};

const sceneryAccents = {
  Coastal: `
#land-prop-5 [fill="#fff"],#land-prop-26 [fill="#fff"]{fill:#B9D984}
#land-prop-16 [fill="#fff"],#land-prop-32 [fill="#fff"]{fill:#ED927E}
#land-prop-4 [fill="#fff"],#land-prop-24 [fill="#fff"]{fill:#F2CE68}`,
  Garden: `
#land-prop-0>path:first-child{fill:url(#dense)}
#land-prop-0>path:nth-child(2){fill:#B9D984}
#land-prop-0>path:nth-child(3){fill:url(#dense)}
#land-prop-1 path:first-child{stroke:#B9D984}
#land-prop-1 path:nth-child(2){fill:#ED927E}
#land-prop-1 rect{fill:#F2CE68}
#land-prop-2 path{fill:#7DB4DB;stroke:#000}
#land-prop-7>g>g:first-child polygon:first-child,#land-prop-7>g>g:first-child polygon:last-child{fill:#F2CE68}
#land-prop-7>g>g:first-child polygon:nth-child(2){fill:#ED927E;stroke:#000}
#land-prop-7>g>g:nth-child(2) path:first-child{fill:#B9D984}
#land-prop-7>g>g:nth-child(2) path:nth-child(2){fill:#B3A0D8}
#land-prop-7>g>g:nth-child(2) rect{fill:#F2CE68}
#land-prop-7>g>path{stroke:#B9D984}
#land-prop-7>g>path:last-child{fill:#ED927E;stroke:#000}`,
  Industrial: `
#land-prop-18 [fill="#fff"],#land-prop-29 [fill="#fff"]{fill:#7DB4DB}
#land-prop-9 [fill="#fff"],#land-prop-27 [fill="#fff"],#land-prop-8 [fill="#fff"]{fill:#F2CE68}
#land-prop-10 [fill="#fff"]{fill:#ED927E}
#land-prop-11 [fill="#fff"]{fill:#B3A0D8}`,
  Market: `
#land-prop-22 [fill="#fff"]{fill:#ED927E}
#land-prop-23 [fill="#fff"]{fill:#B3A0D8}
#land-prop-31 [fill="#fff"],#land-prop-24 [fill="#fff"],#land-prop-27 [fill="#fff"],#land-prop-4 [fill="#fff"]{fill:#F2CE68}
#land-prop-1 [fill="#fff"]{fill:#B9D984}`,
  Mineral: `
#land-prop-6 [fill="#fff"],#land-prop-25 [fill="#fff"]{fill:#B3A0D8}
#land-prop-3 [fill="#fff"]{fill:#ED927E}
#land-prop-2 [fill="#fff"]{fill:#B9D984}`,
  Orbital: `
#land-prop-13 [fill="#fff"],#land-prop-15 [fill="#fff"]{fill:#B3A0D8}
#land-prop-14 [fill="#fff"],#land-prop-29 [fill="#fff"]{fill:#7DB4DB}
#land-prop-9 [fill="#fff"],#land-prop-27 [fill="#fff"]{fill:#F2CE68}`,
  Reading: `
#land-prop-21 [fill="#fff"],#land-prop-30 [fill="#fff"]{fill:#ED927E}
#land-prop-19 [fill="#fff"],#land-prop-20 [fill="#fff"]{fill:#F2CE68}
#land-prop-1 [fill="#fff"]{fill:#B3A0D8}
#land-prop-2 [fill="#fff"]{fill:#B9D984}`,
  Rooftop: `
#land-prop-13 [fill="#fff"],#land-prop-28 [fill="#fff"]{fill:#B3A0D8}
#land-prop-11 [fill="#fff"]{fill:#7DB4DB}
#land-prop-4 [fill="#fff"],#land-prop-7 [fill="#fff"]{fill:#F2CE68}
#land-prop-1 [fill="#fff"]{fill:#ED927E}
#land-prop-2 [fill="#fff"]{fill:#B9D984}`,
};

const paletteStyle = (scenery) => {
  const terrain = sceneryTerrain[scenery];
  return `<style>
#scenery-backdrop{fill:#eeeeee}
#rf-floor rect{fill:${terrain.surface}}
#rf-floor path{stroke:#000}
#dither rect{fill:#F2CE68}#dither path{fill:#000}
#dense rect{fill:${terrain.shadow}}#dense path{fill:#000}
#terrain>polygon[fill="#000"]{fill:${terrain.edge};stroke:#000}
#terrain>polyline[stroke="#fff"]{stroke:#fff}
#terrain>path[fill="#000"]{fill:#7DB4DB}
#terrain>path[stroke="#fff"]{stroke:#fff}
#ground-details{stroke:${terrain.detail};opacity:.58}
${sceneryAccents[scenery]}
</style>`;
};
for (const scenery of SCENERIES) {
  const entry = found.get(scenery);
  if (!entry) throw new Error(`No active ${scenery} reference found`);
  const svg = Buffer.from(entry.metadata.image.slice(entry.metadata.image.indexOf(",") + 1), "base64").toString("utf8");
  const landscape = extractGroup(svg, "landscape");
  const generation = Number(trait(entry.metadata, "Generation"));
  const land = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><title>${scenery} land</title>${paletteStyle(scenery)}<rect id="scenery-backdrop" width="512" height="512" fill="#000"/>${generation === 1 ? landscape : `<g transform="translate(256 256) scale(2.35) translate(-256 -256)">${landscape}</g>`}</svg>`;
  await writeFile(new URL(`${scenery.toLowerCase()}.svg`, output), land);
  console.log(`${scenery}: token ${entry.id}, generation ${trait(entry.metadata, "Generation")}, floor ${trait(entry.metadata, "Floor")}`);
}
