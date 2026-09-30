import { publicAsset } from "./publicAsset";
import { WalletPanel } from "./wallet/WalletPanel";
import { WalletClient, ROBINHOOD } from "./wallet/client";
import { useOwnedPets } from "./wallet/useOwnedPets";
import { battleEfficiency, type Pet } from "./wallet/pets";
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  Backpack,
  ChevronRight,
  Coins,
  Heart,
  Skull,
  Swords,
  Trophy,
} from "./icons";
import menuIcon from "./assets/svgs/menu.svg";
import xIcon from "./assets/svgs/x.svg";
import friendsIcon from "./assets/svgs/friends.svg";
import docsIcon from "./assets/svgs/toolbox.svg";
import shopIcon from "./assets/svgs/fa-shop.svg";
import guildIcon from "./assets/svgs/fa-shield-halved.svg";
import homeMenuIcon from "./assets/svgs/fa-house.svg";
import marketMenuIcon from "./assets/svgs/fa-store.svg";
import adventureMenuIcon from "./assets/svgs/fa-map-location-dot.svg";
import guildWarIcon from "./assets/svgs/fa-khanda.svg";
import battleMenuIcon from "./assets/svgs/fa-hand-fist.svg";
import raidMenuIcon from "./assets/svgs/fa-dungeon.svg";
import coastalLand from "./assets/lands/coastal.svg";
import gardenLand from "./assets/lands/garden.svg";
import industrialLand from "./assets/lands/industrial.svg";
import marketLand from "./assets/lands/market.svg";
import mineralLand from "./assets/lands/mineral.svg";
import orbitalLand from "./assets/lands/orbital.svg";
import readingLand from "./assets/lands/reading.svg";
import rooftopLand from "./assets/lands/rooftop.svg";
const LAND_ART = {
  Coastal: coastalLand,
  Garden: gardenLand,
  Industrial: industrialLand,
  Market: marketLand,
  Mineral: mineralLand,
  Orbital: orbitalLand,
  Reading: readingLand,
  Rooftop: rooftopLand,
};
type ArenaLand = keyof typeof LAND_ART;
const ARENA_LANDS = Object.keys(LAND_ART) as ArenaLand[];
const isArenaLand = (land: unknown): land is ArenaLand =>
  typeof land === "string" && ARENA_LANDS.includes(land as ArenaLand);
// The local demo roster has preset traits; unknown saved pets receive no match bonus.
const DEMO_PET_LANDS: Record<string, ArenaLand> = {
  "gen-184": "Coastal", "gen-409": "Garden", "gen-612": "Orbital",
};
const petLand = (friend: Friend): ArenaLand | undefined =>
  isArenaLand(friend.land) ? friend.land : DEMO_PET_LANDS[friend.id];
const efficientAmount = (amount: number, efficiency: number) => Math.round(amount * efficiency);

const ECONOMY = {
  startingPlayerBalance: 250,
  startingRewardPool: 18420,
  poolContributionRate: .5,
  enemyRoomChance: .42,
  lootChance: .35,
  playerMaxHp: 30,
  paidPathMitigation: 7,
  focusedStrikeBonus: 6,
} as const;
const poolContribution = (amount: number) =>
  Math.ceil(amount * ECONOMY.poolContributionRate);
const sinkAmount = (amount: number) => amount - poolContribution(amount);
const titheAmount = (amount: number, player: Player) =>
  player.guildId
    ? Math.ceil(
      amount * Math.max(0, Math.min(20, player.tithePercent || 0)) / 100,
    )
    : 0;
const titheGuildShare = (tithe: number) => Math.ceil(tithe * .8);
const tithePoolShare = (tithe: number) => tithe - titheGuildShare(tithe);
function rewardRange(dungeon: Dungeon): [number, number] {
  const [min, max] = dungeon.reward.split("–").map(Number);
  return [min, max];
}
function LandScene(
  { dungeon, friend, hp, maxHp, children }: {
    dungeon: Pick<Dungeon, "scenery">;
    children?: ReactNode;
    friend?: Friend;
    hp?: number;
    maxHp?: number;
  },
) {
  const [position, setPosition] = useState({ x: 50, y: 55 }),
    [facing, setFacing] = useState(1);
  useEffect(() => {
    if (!friend) return;
    const roam = () =>
      setPosition((previous) => {
        const angle = Math.random() * Math.PI * 2,
          radius = Math.sqrt(Math.random()),
          x = 50 + Math.cos(angle) * radius * 30,
          y = 55 + Math.sin(angle) * radius * 9;
        setFacing(x < previous.x ? -1 : 1);
        return { x, y };
      });
    roam();
    const timer = window.setInterval(roam, 2800);
    return () => window.clearInterval(timer);
  }, [friend?.id]);
  return (
    <div
      className={`land-scene land-${dungeon.scenery.toLowerCase()}${
        friend ? " roaming-land" : ""
      }`}
      aria-label={`${dungeon.scenery} scenery${
        friend ? ` with ${friend.name} exploring` : ""
      }`}
    >
      <img
        className="chain-land"
        src={LAND_ART[dungeon.scenery as ArenaLand]}
        alt={`${dungeon.scenery} land`}
      />
      {friend && (
        <div
          className="land-friend"
          style={{
            left: `${position.x}%`,
            top: `${position.y}%`,
            transform: `translate(-50%,-100%) scaleX(${facing})`,
          }}
        >
          <div
            className="friend-health"
            style={{ transform: `scaleX(${facing})` }}
          >
            <span>{friend.name}</span>
            <div>
              <i
                style={{
                  width: `${Math.max(0, (hp ?? 0) / (maxHp || 1) * 100)}%`,
                }}
              />
            </div>
            <b>{hp}/{maxHp}</b>
          </div>
          <div className="land-friend-sprite">
            <img src={publicAsset(friend.spriteUrl ?? "/friend-walk-sprite.svg")} alt="" />
          </div>
        </div>
      )}
      {children}
      <div className="land-label">
        <b>{dungeon.scenery}</b>
      </div>
    </div>
  );
}
type Page =
  | "home"
  | "friends"
  | "dungeons"
  | "shop"
  | "market"
  | "battle"
  | "raids"
  | "guild"
  | "guild_wars"
  | "docs"
  | "metrics"
  | "run";
type Kind = "armor" | "weapon" | "defense" | "potion";
type Element = "water" | "earth" | "wind" | "fire" | "electricity" | "curse";
type BattleRole = "fighter" | "defender" | "assassin" | "support";
type PotionEffect =
  | "heal"
  | "attack"
  | "armor"
  | "defense"
  | "evade"
  | "fortune"
  | "revive"
  | "repair"
  | "maxhp";
type RunBuffs = {
  attack: number;
  armor: number;
  defense: number;
  evade: number;
  fortune: number;
  revive: number;
};
type Item = {
  id: string;
  name: string;
  kind: Kind;
  icon: string;
  art?: string;
  effect?: PotionEffect;
  price: number;
  power: number;
  uses: number;
  maxUses: number;
  desc: string;
  modifier?: Element;
  origin?: "shop" | "rare-shop" | "adventure" | "raid" | "market";
};
type Friend = {
  id: string;
  name: string;
  collection: "Genesis" | "Generations" | "Generation";
  generation: number;
  family: string;
  color: string;
  spriteUrl?: string;
  imageUrl?: string;
  tokenId?: string;
  land?: ArenaLand;
  inventory: Item[];
  role?: BattleRole;
  runs: number;
  wins: number;
  deaths: number;
  earnedRf: number;
  spentRf: number;
  burnedRf: number;
  itemsBought: number;
};
type Player = {
  rf: number;
  pool: number;
  friends: Friend[];
  selectedId: string;
  guildId?: string;
  warPoints?: number;
  guildWeek?: string;
  tithePercent?: number;
  guildTithe?: number;
};
type Dungeon = {
  tier: number;
  name: string;
  subtitle: string;
  cost: number;
  rooms: number;
  reward: string;
  risk: string;
  floor: string;
  scenery: string;
};
type Enemy = {
  name: string;
  icon: string;
  hp: number;
  maxHp: number;
  attack: number;
  element: Element;
};
type Run = {
  dungeon: Dungeon;
  friendId: string;
  room: number;
  hp: number;
  maxHp: number;
  event: number;
  enemy: Enemy | null;
  buffs: RunBuffs;
  spentRf: number;
  log: string[];
  equipment: string[];
};
type BattlePet = {
  collection: Friend["collection"];
  land?: ArenaLand;
  spriteUrl?: string;
  color?: string;
};
type BattleUnit = BattlePet & {
  efficiency: number;
  id: string;
  name: string;
  role: BattleRole;
  attack: number;
  armor: number;
  block: number;
  hp: number;
  maxHp: number;
  side: "player" | "enemy";
};
type ItemRarity = "COMMON" | "UNCOMMON" | "RARE" | "EPIC";
type BattleWager =
  | { type: "none" }
  | { type: "rf"; min: number; max: number }
  | { type: "item"; item: Item; rarity: ItemRarity };
type WaitingSquad = {
  id: string;
  owner: string;
  rating: number;
  size: number;
  roles: BattleRole[];
  power: number;
  members?: string[];
  pets?: BattlePet[];
  isOwn?: boolean;
  wager: BattleWager;
};
type BattlePotion = { key: string; ownerId: string; item: Item };
type ItemStake = { ownerId: string; item: Item };
type RaidDifficulty = "EXPEDITION" | "HEROIC" | "MYTHIC";
type RaidDungeon = {
  name: string;
  scenery: string;
  basePower: number;
  baseFee: number;
  reward: string;
  color: string;
  element: Element;
};
type RaidEntrant = {
  wallet: string;
  friend: string;
  role: BattleRole;
  power: number;
};
type RaidResult = {
  success: boolean;
  log: string[];
  reward: number;
  item?: Item;
  contribution: number;
  teamPower: number;
  requiredPower: number;
  pot: number;
  dungeon: string;
  difficulty: RaidDifficulty;
};
type MarketListing = {
  id: string;
  ownerId: string;
  ownerName: string;
  item: Item;
  price: number;
};
type Guild = {
  id: string;
  name: string;
  motto: string;
  color: string;
  members: number;
  score: number;
  emblem: string;
};
type BattleFrame = {
  units: BattleUnit[];
  message: string;
  logCount: number;
  actorId?: string;
  targetId?: string;
  kind: "ready" | "attack" | "heal" | "finished";
};
type BattleResult = {
  settlement?: string;
  arena: ArenaLand;
  frames: BattleFrame[];
  winner: "player" | "enemy" | "draw";
  log: string[];
  player: BattleUnit[];
  enemy: BattleUnit[];
  synergies: string[];
};
function normalizeBuffs(buffs?: Partial<RunBuffs>): RunBuffs {
  return {
    attack: buffs?.attack ?? 0,
    armor: buffs?.armor ?? 0,
    defense: buffs?.defense ?? 0,
    evade: buffs?.evade ?? 0,
    fortune: buffs?.fortune ?? 0,
    revive: buffs?.revive ?? 0,
  };
}
const DUNGEONS: Dungeon[] = [{
  tier: 1,
  name: "Coastal",
  subtitle: "Wander where the land meets the tide",
  cost: 12,
  rooms: 5,
  reward: "18–32",
  risk: "LOW",
  floor: "Hatch",
  scenery: "Coastal",
}, {
  tier: 2,
  name: "Garden",
  subtitle: "Follow the paths between growing things",
  cost: 22,
  rooms: 6,
  reward: "32–52",
  risk: "LOW",
  floor: "Dither",
  scenery: "Garden",
}, {
  tier: 3,
  name: "Industrial",
  subtitle: "Navigate the working heart of the world",
  cost: 36,
  rooms: 6,
  reward: "54–82",
  risk: "GUARDED",
  floor: "Cross Grid",
  scenery: "Industrial",
}, {
  tier: 4,
  name: "Market",
  subtitle: "Trade favors through the crowded stalls",
  cost: 52,
  rooms: 7,
  reward: "78–118",
  risk: "GUARDED",
  floor: "Cross Grid",
  scenery: "Market",
}, {
  tier: 5,
  name: "Mineral",
  subtitle: "Go deeper where rare crystals grow",
  cost: 72,
  rooms: 8,
  reward: "108–164",
  risk: "SEVERE",
  floor: "Hatch",
  scenery: "Mineral",
}, {
  tier: 6,
  name: "Orbital",
  subtitle: "Take the trail beyond the world",
  cost: 96,
  rooms: 9,
  reward: "146–218",
  risk: "SEVERE",
  floor: "Cross Grid",
  scenery: "Orbital",
}, {
  tier: 7,
  name: "Reading",
  subtitle: "Search the stacks for forgotten clues",
  cost: 122,
  rooms: 10,
  reward: "186–286",
  risk: "DEADLY",
  floor: "Hatch",
  scenery: "Reading",
}, {
  tier: 8,
  name: "Rooftop",
  subtitle: "Cross the skyline without looking down",
  cost: 155,
  rooms: 12,
  reward: "245–440",
  risk: "FATAL",
  floor: "Dither",
  scenery: "Rooftop",
}];
const POTION_KINDS = [{
  id: "heartbloom",
  name: "Heartbloom Tonic",
  icon: "♥",
  effect: "heal",
  action: "restore health",
  basePower: 6,
  basePrice: 8,
}, {
  id: "sunberry",
  name: "Sunberry Elixir",
  icon: "☀",
  effect: "attack",
  action: "add run attack",
  basePower: 3,
  basePrice: 10,
}, {
  id: "moonmilk",
  name: "Moonmilk Draught",
  icon: "☾",
  effect: "armor",
  action: "add run armor",
  basePower: 2,
  basePrice: 12,
}, {
  id: "mosswater",
  name: "Mosswater Flask",
  icon: "♣",
  effect: "defense",
  action: "add block power",
  basePower: 2,
  basePrice: 14,
}, {
  id: "cloudcap",
  name: "Cloudcap Brew",
  icon: "☁",
  effect: "evade",
  action: "guarantee evades",
  basePower: 1,
  basePrice: 20,
}, {
  id: "starfall",
  name: "Starfall Serum",
  icon: "✦",
  effect: "fortune",
  action: "guarantee loot finds",
  basePower: 1,
  basePrice: 17,
}, {
  id: "emberdew",
  name: "Emberdew Cordial",
  icon: "◆",
  effect: "revive",
  action: "prevent fatal falls",
  basePower: 1,
  basePrice: 23,
}, {
  id: "tideglass",
  name: "Tideglass Philter",
  icon: "≈",
  effect: "repair",
  action: "restore gear durability",
  basePower: 2,
  basePrice: 26,
}, {
  id: "royalnectar",
  name: "Royal Nectar",
  icon: "♛",
  effect: "maxhp",
  action: "increase maximum health",
  basePower: 4,
  basePrice: 36,
}] as const;
const POTION_TIERS = [{ id: "minor", label: "Minor", power: 1, price: 1 }, {
  id: "greater",
  label: "Greater",
  power: 1.75,
  price: 2.1,
}, { id: "grand", label: "Grand", power: 2.75, price: 3.6 }] as const;
function potionEffectText(effect: PotionEffect, power: number) {
  switch (effect) {
    case "heal":
      return `restore ${power} health`;
    case "attack":
      return `add ${power} attack for this run`;
    case "armor":
      return `add ${power} armor for this run`;
    case "defense":
      return `add ${power} block power for this run`;
    case "evade":
      return `evade the next ${power} attack${power === 1 ? "" : "s"}`;
    case "fortune":
      return `guarantee the next ${power} loot find${power === 1 ? "" : "s"}`;
    case "revive":
      return `prevent the next ${power} fatal fall${power === 1 ? "" : "s"}`;
    case "repair":
      return `restore ${power} durability to equipped gear`;
    case "maxhp":
      return `gain ${power} maximum health for this run`;
  }
}
const POTIONS: Item[] = POTION_KINDS.flatMap((p) =>
  POTION_TIERS.map((t) => {
    const power = Math.max(1, Math.round(p.basePower * t.power)),
      price = Math.round(p.basePrice * t.price);
    return {
      id: `${p.id}-${t.id}`,
      name: `${t.label} ${p.name}`,
      kind: "potion" as const,
      icon: p.icon,
      art: `/items/${p.id}.svg`,
      effect: p.effect,
      price,
      power,
      uses: 1,
      maxUses: 1,
      desc: `${t.label} potion · ${potionEffectText(p.effect, power)}`,
    };
  })
);
const ELEMENTS: Element[] = [
  "water",
  "earth",
  "wind",
  "fire",
  "electricity",
  "curse",
];
const ELEMENT_META: Record<Element, { label: string; symbol: string; color: string }> = {
  water: { label: "WATER", symbol: "≈", color: "#bfe9f6" },
  earth: { label: "EARTH", symbol: "◆", color: "#d8e8b8" },
  wind: { label: "WIND", symbol: "≋", color: "#d9f3ea" },
  fire: { label: "FIRE", symbol: "▲", color: "#ffd3bd" },
  electricity: { label: "ELECTRICITY", symbol: "ϟ", color: "#fff0a8" },
  curse: { label: "CURSE", symbol: "☾", color: "#ddcafa" },
};
const ELEMENT_BEATS: Record<Element, Element> = {
  water: "fire",
  fire: "earth",
  earth: "electricity",
  electricity: "wind",
  wind: "curse",
  curse: "water",
};
const elementBonus = (item: Item, matchup?: Element) =>
  item.modifier && matchup && ELEMENT_BEATS[item.modifier] === matchup
    ? Math.ceil(item.power * .5)
    : 0;
function modifiedReward(item: Item, seed = Math.floor(Math.random() * 10000)): Item {
  if (item.kind !== "weapon" && item.kind !== "armor") return item;
  const modifier = ELEMENTS[Math.abs(seed) % ELEMENTS.length];
  return {
    ...item,
    modifier,
    desc: `${item.desc} · ${ELEMENT_META[modifier].label} +50% vs ${ELEMENT_META[ELEMENT_BEATS[modifier]].label}`,
  };
}
const GOODS: Item[] = [
  {
    id: "hood",
    name: "Grave Hood",
    kind: "armor",
    icon: "◒",
    art: "/items/grave-hood.svg",
    price: 18,
    power: 2,
    uses: 8,
    maxUses: 8,
    desc: "Headgear · +2 guard",
  },
  {
    id: "mail",
    name: "Ironroot Mail",
    kind: "armor",
    icon: "♜",
    art: "/items/ironroot-mail.svg",
    price: 38,
    power: 4,
    uses: 12,
    maxUses: 12,
    desc: "Chest · +4 guard",
  },
  {
    id: "greaves",
    name: "Delver Greaves",
    kind: "armor",
    icon: "Ⅱ",
    art: "/items/delver-greaves.svg",
    price: 25,
    power: 3,
    uses: 10,
    maxUses: 10,
    desc: "Legs · +3 guard",
  },
  {
    id: "tide-helm",
    name: "Tidewatch Helm",
    kind: "armor",
    icon: "◒",
    art: "/items/tidewatch-helm.svg",
    price: 28,
    power: 3,
    uses: 10,
    maxUses: 10,
    desc: "Tidewatch headgear · +3 guard",
  },
  {
    id: "tide-mail",
    name: "Tidewatch Carapace",
    kind: "armor",
    icon: "♜",
    art: "/items/tidewatch-carapace.svg",
    price: 48,
    power: 5,
    uses: 12,
    maxUses: 12,
    desc: "Tidewatch chest · +5 guard",
  },
  {
    id: "tide-boots",
    name: "Tidewatch Boots",
    kind: "armor",
    icon: "Ⅱ",
    art: "/items/tidewatch-boots.svg",
    price: 34,
    power: 4,
    uses: 11,
    maxUses: 11,
    desc: "Tidewatch legs · +4 guard",
  },
  {
    id: "sun-crown",
    name: "Sunroot Crown",
    kind: "armor",
    icon: "◒",
    art: "/items/sunroot-crown.svg",
    price: 42,
    power: 4,
    uses: 11,
    maxUses: 11,
    desc: "Sunroot headgear · +4 guard",
  },
  {
    id: "sun-vest",
    name: "Sunroot Vest",
    kind: "armor",
    icon: "♜",
    art: "/items/sunroot-vest.svg",
    price: 64,
    power: 7,
    uses: 13,
    maxUses: 13,
    desc: "Sunroot chest · +7 guard",
  },
  {
    id: "sun-boots",
    name: "Sunroot Sabatons",
    kind: "armor",
    icon: "Ⅱ",
    art: "/items/sunroot-sabatons.svg",
    price: 50,
    power: 5,
    uses: 12,
    maxUses: 12,
    desc: "Sunroot legs · +5 guard",
  },
  {
    id: "moon-cowl",
    name: "Moonveil Cowl",
    kind: "armor",
    icon: "◒",
    art: "/items/moonveil-cowl.svg",
    price: 58,
    power: 6,
    uses: 12,
    maxUses: 12,
    desc: "Moonveil headgear · +6 guard",
  },
  {
    id: "moon-mantle",
    name: "Moonveil Mantle",
    kind: "armor",
    icon: "♜",
    art: "/items/moonveil-mantle.svg",
    price: 82,
    power: 9,
    uses: 14,
    maxUses: 14,
    desc: "Moonveil chest · +9 guard",
  },
  {
    id: "moon-treads",
    name: "Moonveil Treads",
    kind: "armor",
    icon: "Ⅱ",
    art: "/items/moonveil-treads.svg",
    price: 68,
    power: 7,
    uses: 13,
    maxUses: 13,
    desc: "Moonveil legs · +7 guard",
  },
  {
    id: "star-visor",
    name: "Starforge Visor",
    kind: "armor",
    icon: "◒",
    art: "/items/starforge-visor.svg",
    price: 76,
    power: 8,
    uses: 13,
    maxUses: 13,
    desc: "Starforge headgear · +8 guard",
  },
  {
    id: "star-plate",
    name: "Starforge Plate",
    kind: "armor",
    icon: "♜",
    art: "/items/starforge-plate.svg",
    price: 110,
    power: 12,
    uses: 15,
    maxUses: 15,
    desc: "Starforge chest · +12 guard",
  },
  {
    id: "star-greaves",
    name: "Starforge Greaves",
    kind: "armor",
    icon: "Ⅱ",
    art: "/items/starforge-greaves.svg",
    price: 88,
    power: 9,
    uses: 14,
    maxUses: 14,
    desc: "Starforge legs · +9 guard",
  },
  {
    id: "blade",
    name: "Notched Blade",
    kind: "weapon",
    icon: "†",
    art: "/items/notched-blade.svg",
    price: 30,
    power: 5,
    uses: 10,
    maxUses: 10,
    desc: "Weapon · +5 strike",
  },
  {
    id: "axe",
    name: "Crypt Cleaver",
    kind: "weapon",
    icon: "⚒",
    art: "/items/crypt-cleaver.svg",
    price: 64,
    power: 9,
    uses: 8,
    maxUses: 8,
    desc: "Weapon · +9 strike",
  },
  {
    id: "garden-spear",
    name: "Garden Spear",
    kind: "weapon",
    icon: "†",
    art: "/items/garden-spear.svg",
    price: 24,
    power: 4,
    uses: 11,
    maxUses: 11,
    desc: "Weapon · +4 strike",
  },
  {
    id: "tide-trident",
    name: "Tideglass Trident",
    kind: "weapon",
    icon: "†",
    art: "/items/tideglass-trident.svg",
    price: 42,
    power: 6,
    uses: 10,
    maxUses: 10,
    desc: "Weapon · +6 strike",
  },
  {
    id: "sun-hammer",
    name: "Sunroot Hammer",
    kind: "weapon",
    icon: "⚒",
    art: "/items/sunroot-hammer.svg",
    price: 54,
    power: 8,
    uses: 9,
    maxUses: 9,
    desc: "Weapon · +8 strike",
  },
  {
    id: "moon-scythe",
    name: "Moonveil Scythe",
    kind: "weapon",
    icon: "†",
    art: "/items/moonveil-scythe.svg",
    price: 72,
    power: 10,
    uses: 9,
    maxUses: 9,
    desc: "Weapon · +10 strike",
  },
  {
    id: "star-lance",
    name: "Starforge Lance",
    kind: "weapon",
    icon: "†",
    art: "/items/starforge-lance.svg",
    price: 88,
    power: 11,
    uses: 10,
    maxUses: 10,
    desc: "Weapon · +11 strike",
  },
  {
    id: "rift-bow",
    name: "Rift Bow",
    kind: "weapon",
    icon: "†",
    art: "/items/rift-bow.svg",
    price: 96,
    power: 12,
    uses: 8,
    maxUses: 8,
    desc: "Weapon · +12 strike",
  },
  {
    id: "orbital-staff",
    name: "Orbital Staff",
    kind: "weapon",
    icon: "†",
    art: "/items/orbital-staff.svg",
    price: 110,
    power: 13,
    uses: 8,
    maxUses: 8,
    desc: "Weapon · +13 strike",
  },
  {
    id: "buckler",
    name: "Bone Buckler",
    kind: "defense",
    icon: "◈",
    art: "/items/bone-buckler.svg",
    price: 27,
    power: 4,
    uses: 9,
    maxUses: 9,
    desc: "Defense · +4 block",
  },
  {
    id: "ward",
    name: "Thorn Ward",
    kind: "defense",
    icon: "✣",
    art: "/items/thorn-ward.svg",
    price: 52,
    power: 7,
    uses: 7,
    maxUses: 7,
    desc: "Defense · +7 block",
  },
  {
    id: "moss-charm",
    name: "Moss Charm",
    kind: "defense",
    icon: "◈",
    art: "/items/moss-charm.svg",
    price: 20,
    power: 3,
    uses: 10,
    maxUses: 10,
    desc: "Defense · +3 block",
  },
  {
    id: "tide-mirror",
    name: "Tide Mirror",
    kind: "defense",
    icon: "◈",
    art: "/items/tide-mirror.svg",
    price: 34,
    power: 5,
    uses: 9,
    maxUses: 9,
    desc: "Defense · +5 block",
  },
  {
    id: "sun-sigil",
    name: "Sun Sigil",
    kind: "defense",
    icon: "✣",
    art: "/items/sun-sigil.svg",
    price: 44,
    power: 6,
    uses: 9,
    maxUses: 9,
    desc: "Defense · +6 block",
  },
  {
    id: "moon-aegis",
    name: "Moon Aegis",
    kind: "defense",
    icon: "◈",
    art: "/items/moon-aegis.svg",
    price: 62,
    power: 8,
    uses: 8,
    maxUses: 8,
    desc: "Defense · +8 block",
  },
  {
    id: "root-totem",
    name: "Root Totem",
    kind: "defense",
    icon: "✣",
    art: "/items/root-totem.svg",
    price: 72,
    power: 9,
    uses: 8,
    maxUses: 8,
    desc: "Defense · +9 block",
  },
  {
    id: "star-barrier",
    name: "Star Barrier",
    kind: "defense",
    icon: "◈",
    art: "/items/star-barrier.svg",
    price: 86,
    power: 10,
    uses: 7,
    maxUses: 7,
    desc: "Defense · +10 block",
  },
  {
    id: "orbital-ward",
    name: "Orbital Ward",
    kind: "defense",
    icon: "✣",
    art: "/items/orbital-ward.svg",
    price: 98,
    power: 11,
    uses: 7,
    maxUses: 7,
    desc: "Defense · +11 block",
  },
  ...POTIONS,
];
const RARE_SHOP_BASES = [
  "tide-trident",
  "sun-vest",
  "moon-scythe",
  "star-plate",
  "rift-bow",
  "moon-mantle",
] as const;
function dailyRareItems(date = new Date()): Item[] {
  const day = Math.floor(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  ) / 86400000);
  return [0, 1, 2].map((offset) => {
    const index = (day + offset * 2) % RARE_SHOP_BASES.length,
      base = GOODS.find((item) => item.id === RARE_SHOP_BASES[index])!,
      modifier = ELEMENTS[(day * 3 + offset * 5) % ELEMENTS.length];
    return {
      ...modifiedReward(base, ELEMENTS.indexOf(modifier)),
      id: `daily-${day}-${offset}-${base.id}`,
      name: `${ELEMENT_META[modifier].label[0]}${ELEMENT_META[modifier].label.slice(1).toLowerCase()}bound ${base.name}`,
      price: Math.round(base.price * 1.45),
      uses: base.maxUses + 4,
      maxUses: base.maxUses + 4,
      modifier,
      origin: "rare-shop" as const,
      desc: `Daily rare · +${base.power} ${base.kind === "weapon" ? "strike" : "guard"} · ${ELEMENT_META[modifier].label} +50% vs ${ELEMENT_META[ELEMENT_BEATS[modifier]].label}`,
    };
  });
}
const EVENTS = [{
  type: "ENCOUNTER",
  title: "A thorny guardian blocks the garden gate.",
  copy:
    "It asks for a token or a clever show of courage before it will step aside.",
  safe: "Pay the ferryman's mark",
  burn: 6,
  hard: "Draw steel and advance",
}, {
  type: "TRAP",
  title: "A patch of springy mushrooms shifts underfoot.",
  copy:
    "A shortcut winds between them, but the safest stepping stones glow softly nearby.",
  safe: "Burn $RF to disarm the rune",
  burn: 5,
  hard: "Trust your feet and sprint",
}, {
  type: "LOOT",
  title: "Pastel light spills from a picnic chest.",
  copy:
    "The clasp bears a familiar crest. A useful surprise may be tucked inside.",
  safe: "Offer $RF to break the ward",
  burn: 8,
  hard: "Pry it open by force",
}, {
  type: "CHOICE",
  title: "A trail sprite calls your Friend by name.",
  copy:
    "It knows a flower-lined shortcut, though every guide asks for a small favor.",
  safe: "Pay the whisper",
  burn: 7,
  hard: "Take the flooded stair",
}];
const ENEMIES = [
  { name: "Thornback", icon: "♠" },
  { name: "Mire Wisp", icon: "✦" },
  { name: "Iron Mite", icon: "◆" },
  { name: "Rift Crow", icon: "▲" },
  { name: "Moss Golem", icon: "♣" },
];
const BATTLE_ROLES: { id: BattleRole; name: string; copy: string }[] = [{
  id: "fighter",
  name: "Fighter",
  copy: "Reliable damage; strengthens other Fighters.",
}, {
  id: "defender",
  name: "Defender",
  copy: "Draws attacks and converts armor into staying power.",
}, {
  id: "assassin",
  name: "Assassin",
  copy: "Targets the weakest enemy and lands critical strikes.",
}, {
  id: "support",
  name: "Support",
  copy: "Heals the most injured ally instead of attacking.",
}];
function itemRarity(item: Item): ItemRarity {
  return item.price >= 90
    ? "EPIC"
    : item.price >= 60
    ? "RARE"
    : item.price >= 30
    ? "UNCOMMON"
    : "COMMON";
}
function matchingItemStakes(items: ItemStake[], wager: BattleWager) {
  if (wager.type !== "item") return [];
  const rarity = wager.rarity;
  return items.filter((entry) => itemRarity(entry.item) === rarity);
}
const catalogItem = (id: string) => GOODS.find((item) => item.id === id)!;
const WAITING_SQUADS: WaitingSquad[] = [{
  id: "solo-ash",
  owner: "ashgarden.eth",
  rating: 940,
  size: 1,
  roles: ["fighter"],
  power: 8,
  wager: { type: "none" },
}, {
  id: "duo-tide",
  owner: "tidekeeper.eth",
  rating: 1015,
  size: 2,
  roles: ["defender", "assassin"],
  power: 10,
  wager: { type: "rf", min: 8, max: 20 },
}, {
  id: "duo-moss",
  owner: "moss.exe",
  rating: 1080,
  size: 2,
  roles: ["fighter", "support"],
  power: 12,
  wager: {
    type: "item",
    item: catalogItem("blade"),
    rarity: itemRarity(catalogItem("blade")),
  },
}, {
  id: "trio-moon",
  owner: "moonparty.eth",
  rating: 1160,
  size: 3,
  roles: ["defender", "assassin", "support"],
  power: 14,
  wager: { type: "rf", min: 15, max: 45 },
}, {
  id: "trio-root",
  owner: "rootclub.eth",
  rating: 1240,
  size: 3,
  roles: ["fighter", "fighter", "defender"],
  power: 16,
  wager: {
    type: "item",
    item: catalogItem("sun-sigil"),
    rarity: itemRarity(catalogItem("sun-sigil")),
  },
}, {
  id: "full-star",
  owner: "starforge.eth",
  rating: 1325,
  size: 4,
  roles: ["defender", "fighter", "assassin", "support"],
  power: 18,
  wager: { type: "rf", min: 30, max: 80 },
}, {
  id: "full-rift",
  owner: "riftwalkers.eth",
  rating: 1410,
  size: 4,
  roles: ["defender", "defender", "assassin", "support"],
  power: 20,
  wager: {
    type: "item",
    item: catalogItem("orbital-ward"),
    rarity: itemRarity(catalogItem("orbital-ward")),
  },
}];
const RAID_DIFFICULTIES: Record<
  RaidDifficulty,
  { power: number; fee: number; reward: number }
> = {
  EXPEDITION: { power: 1, fee: 1, reward: 1 },
  HEROIC: { power: 1.35, fee: 1.6, reward: 1.3 },
  MYTHIC: { power: 1.75, fee: 2.4, reward: 1.7 },
};
const RAID_DUNGEONS: RaidDungeon[] = [
  {
    name: "Garden",
    scenery: "Garden",
    basePower: 58,
    baseFee: 12,
    reward: "Verdant raid relics",
    color: "#d9f0c8",
    element: "earth",
  },
  {
    name: "Coastal",
    scenery: "Coastal",
    basePower: 70,
    baseFee: 18,
    reward: "Tidebound raid relics",
    color: "#c9eaf4",
    element: "water",
  },
  {
    name: "Mineral",
    scenery: "Mineral",
    basePower: 86,
    baseFee: 26,
    reward: "Crystal raid relics",
    color: "#e1d3fa",
    element: "electricity",
  },
  {
    name: "Orbital",
    scenery: "Orbital",
    basePower: 104,
    baseFee: 38,
    reward: "Starforged raid relics",
    color: "#d6dcfa",
    element: "wind",
  },
  {
    name: "Reading",
    scenery: "Reading",
    basePower: 124,
    baseFee: 52,
    reward: "Archive raid relics",
    color: "#f2dfbd",
    element: "curse",
  },
];
const RAID_ITEMS: Item[] = [
  {
    id: "raid-verdant-blade",
    name: "Verdant Oathblade",
    kind: "weapon",
    icon: "†",
    art: "/items/garden-spear.svg",
    price: 120,
    power: 15,
    uses: 16,
    maxUses: 16,
    modifier: "fire",
    desc: "Raid weapon · +15 strike · FIRE +50% vs EARTH",
  },
  {
    id: "raid-tide-carapace",
    name: "Abyssal Carapace",
    kind: "armor",
    icon: "♜",
    art: "/items/tidewatch-carapace.svg",
    price: 135,
    power: 14,
    uses: 18,
    maxUses: 18,
    modifier: "water",
    desc: "Raid armor · +14 guard · WATER +50% vs FIRE",
  },
  {
    id: "raid-crystal-aegis",
    name: "Prismatic Aegis",
    kind: "defense",
    icon: "◈",
    art: "/items/star-barrier.svg",
    price: 148,
    power: 14,
    uses: 16,
    maxUses: 16,
    desc: "Raid defense · +14 block",
  },
  {
    id: "raid-orbital-lance",
    name: "Cometfall Lance",
    kind: "weapon",
    icon: "†",
    art: "/items/starforge-lance.svg",
    price: 165,
    power: 18,
    uses: 17,
    maxUses: 17,
    modifier: "electricity",
    desc: "Raid weapon · +18 strike · ELECTRICITY +50% vs WIND",
  },
  {
    id: "raid-archive-mantle",
    name: "Keeper's Mantle",
    kind: "armor",
    icon: "♜",
    art: "/items/moonveil-mantle.svg",
    price: 180,
    power: 17,
    uses: 20,
    maxUses: 20,
    modifier: "curse",
    desc: "Raid armor · +17 guard · CURSE +50% vs WATER",
  },
];
const GUILDS: Guild[] = [
  {
    id: "verdant",
    name: "Verdant Pact",
    motto: "Grow together. Endure everything.",
    color: "#bde8a4",
    members: 184,
    score: 12640,
    emblem: "♣",
  },
  {
    id: "tide",
    name: "Tidebound",
    motto: "Every current carries us forward.",
    color: "#bfe9e6",
    members: 147,
    score: 11280,
    emblem: "≈",
  },
  {
    id: "star",
    name: "Starforged",
    motto: "Beyond the gate, we rise.",
    color: "#cdbdff",
    members: 211,
    score: 14590,
    emblem: "✦",
  },
  {
    id: "archive",
    name: "Archive Keepers",
    motto: "Every victory becomes a lesson.",
    color: "#f2dfbd",
    members: 103,
    score: 9140,
    emblem: "▤",
  },
];
function battleGear(friend: Friend) {
  return friend.inventory.filter((item) =>
    item.kind !== "potion" && item.uses > 0
  );
}
function battleStats(friend: Friend): BattleUnit {
  const role = friend.role ?? "fighter",
    gear = battleGear(friend),
    weapon = gear.filter((i) => i.kind === "weapon").reduce(
      (n, i) => n + i.power,
      0,
    ),
    armor = gear.filter((i) => i.kind === "armor").reduce(
      (n, i) => n + i.power,
      0,
    ),
    block = gear.filter((i) => i.kind === "defense").reduce(
      (n, i) => n + i.power,
      0,
    ),
    roleHp = role === "defender" ? 16 : role === "support" ? 8 : 0,
    roleAttack = role === "fighter" ? 4 : role === "assassin" ? 6 : 0,
    maxHp = 34 + armor * 2 + roleHp;
  return {
    id: friend.id,
    name: friend.name,
    collection: friend.collection,
    land: petLand(friend),
    spriteUrl: friend.spriteUrl,
    color: friend.color,
    efficiency: 1,
    role,
    attack: 6 + weapon + roleAttack,
    armor: Math.floor(armor / 2) + (role === "defender" ? 4 : 0),
    block: Math.floor(block / 2),
    hp: maxHp,
    maxHp,
    side: "player",
  };
}
function raidPower(friend: Friend, matchup?: Element) {
  const stats = battleStats(friend);
  const matchupPower = battleGear(friend).reduce(
    (total, item) => total + elementBonus(item, matchup),
    0,
  );
  return Math.round(
    stats.attack + stats.armor + stats.block + stats.maxHp / 5 + matchupPower,
  );
}
function raidLobby(
  dungeon: RaidDungeon,
  difficulty: RaidDifficulty,
): RaidEntrant[] {
  const required = Math.round(
      dungeon.basePower * RAID_DIFFICULTIES[difficulty].power,
    ),
    names = ["rootkeeper.eth", "tidelily.eth", "starling.eth"],
    roles: BattleRole[] = ["defender", "support", "assassin"];
  return names.map((wallet, index) => ({
    wallet,
    friend: `Generations #${214 + index * 173}`,
    role: roles[index],
    power: Math.round(required * [0.25, 0.24, 0.27][index]),
  }));
}
function simulateRaid(
  dungeon: RaidDungeon,
  difficulty: RaidDifficulty,
  friend: Friend,
  fee: number,
): RaidResult {
  const allies = raidLobby(dungeon, difficulty),
    userPower = raidPower(friend, dungeon.element),
    requiredPower = Math.round(
      dungeon.basePower * RAID_DIFFICULTIES[difficulty].power,
    ),
    roles = [...allies.map((ally) => ally.role), friend.role ?? "fighter"],
    diversity = new Set(roles).size,
    synergy = diversity === 4 ? 10 : diversity === 3 ? 6 : 2,
    rawPower = allies.reduce((sum, ally) => sum + ally.power, 0) + userPower,
    teamPower = rawPower + synergy,
    success = teamPower >= requiredPower,
    pot = fee * 4,
    contribution = userPower / rawPower,
    reward = success
      ? Math.max(
        fee,
        Math.round(pot * contribution * RAID_DIFFICULTIES[difficulty].reward),
      )
      : 0,
    dungeonIndex = RAID_DUNGEONS.findIndex((entry) =>
      entry.name === dungeon.name
    ),
    rareDrop = success && difficulty !== "EXPEDITION" && contribution >= .2 &&
        (userPower + dungeonIndex) % 3 !== 0
      ? RAID_ITEMS[dungeonIndex]
      : undefined,
    gear = battleGear(friend),
    log = [
      `Four wallets locked ${fee} $RF each. Raid pot: ${pot} $RF.`,
      `${friend.name} contributed ${userPower} power with ${
        gear.length ? gear.map((item) => item.name).join(", ") : "no gear"
      }.`,
      `Team roles: ${
        roles.map((role) => role.toUpperCase()).join(" · ")
      }. Composition bonus: +${synergy} power.`,
      `The party entered ${dungeon.name} at ${difficulty.toLowerCase()} difficulty.`,
      `First ward broken at ${Math.round(teamPower * .35)}/${
        Math.round(requiredPower * .35)
      } power.`,
      `Guardian phase resolved at ${Math.round(teamPower * .7)}/${
        Math.round(requiredPower * .7)
      } power.`,
      success
        ? `RAID CLEARED · ${teamPower}/${requiredPower} team power.`
        : `RAID FAILED · ${teamPower}/${requiredPower} team power.`,
      success
        ? `${friend.name} earned ${reward} $RF for ${
          (contribution * 100).toFixed(1)
        }% of raw team power.`
        : "The uncleared raid pot remains in the ecosystem reward pool.",
      ...(rareDrop
        ? [
          `RARE DROP · ${rareDrop.name} was awarded for exceptional contribution.`,
        ]
        : []),
    ];
  return {
    success,
    log,
    reward,
    item: rareDrop,
    contribution,
    teamPower,
    requiredPower,
    pot,
    dungeon: dungeon.name,
    difficulty,
  };
}
function composition(units: BattleUnit[]) {
  const count = (role: BattleRole) =>
      units.filter((u) => u.role === role).length,
    labels: string[] = [];
  if (count("fighter") >= 2) {
    units.forEach((u) => u.attack += 2);
    labels.push("DUELISTS · team +2 attack");
  }
  if (count("defender") >= 2) {
    units.forEach((u) => u.armor += 3);
    labels.push("FORTRESS · team +3 armor");
  }
  if (count("assassin") >= 2) {
    labels.push("SHADOW PACK · Assassins crit more often");
  }
  if (count("support") >= 2) labels.push("CIRCLE · Supports heal +2");
  if (count("fighter") && count("defender")) {
    units.filter((u) => u.role === "fighter" || u.role === "defender").forEach(
      (u) => u.maxHp = u.hp += 4,
    );
    labels.push("VANGUARD · frontline +4 HP");
  }
  return labels;
}
function applyBattlePotion(team: BattleUnit[], potion: Item, log: string[]) {
  const effect = potion.effect, power = potion.power;
  if (effect === "attack") team.forEach((u) => u.attack += power);
  else if (effect === "armor") team.forEach((u) => u.armor += power);
  else if (effect === "defense" || effect === "evade") {
    team.forEach((u) => u.block += power);
  } else if (effect === "maxhp" || effect === "heal" || effect === "revive") {
    team.forEach((u) => {
      u.maxHp += power;
      u.hp += power;
    });
  } else if (effect === "repair") {
    team.forEach((u) => u.armor += Math.ceil(power / 2));
  } else if (effect === "fortune") {
    team.forEach((u) => u.attack += Math.ceil(power / 2));
  }
  log.push(`${potion.name} was prepared: ${potionEffectText(effect!, power)}.`);
}
function simulateBattle(
  friends: Friend[],
  squad: WaitingSquad,
  potions: Item[] = [],
  arena: ArenaLand = ARENA_LANDS[Math.floor(Math.random() * ARENA_LANDS.length)],
): BattleResult {
  const player = friends.map(battleStats),
    enemy = squad.roles.map((role, i) => {
      const armor = Math.floor(squad.power / 4) + (role === "defender" ? 3 : 0),
        maxHp = 32 + squad.power + armor + (role === "defender" ? 10 : 0);
      return {
        // Waiting squads are demo opponents with stable identity traits.
        ...(squad.pets?.[i] ?? {
          collection: "Generations" as const,
          land: ARENA_LANDS[(Array.from(squad.id).reduce((n, c) => n + c.charCodeAt(0), 0) + i) % ARENA_LANDS.length],
          color: ["#ffb7d5", "#a9e8d2", "#ffd59f", "#c9b8ff"][i % 4],
        }),
        efficiency: 1,
        id: `${squad.id}-${i}`,
        name: squad.members?.[i] ?? `${squad.owner.split(".")[0]} #${i + 1}`,
        role,
        attack: 7 + Math.floor(squad.power / 2) +
          (role === "assassin" ? 4 : role === "fighter" ? 2 : 0),
        armor,
        block: Math.floor(squad.power / 5),
        hp: maxHp,
        maxHp,
        side: "enemy" as const,
      };
    }),
    playerSynergy = composition(player),
    enemySynergy = composition(enemy),
    gearLog = friends.map((friend, index) => {
      const gear = battleGear(friend), unit = player[index];
      return gear.length
        ? `${friend.name} equipped ${
          gear.map((item) =>
            `${item.name} (+${item.power} ${
              item.kind === "weapon"
                ? "ATK"
                : item.kind === "armor"
                ? "GUARD"
                : "BLOCK"
            })`
          ).join(", ")
        }. Final stats: ${unit.attack} ATK, ${unit.armor} ARM, ${unit.block} BLK, ${unit.maxHp} HP.`
        : `${friend.name} entered without gear. Final stats: ${unit.attack} ATK, ${unit.armor} ARM, ${unit.block} BLK, ${unit.maxHp} HP.`;
    }),
    log = [
      `Match found: ${friends.length}v${squad.size} against ${squad.owner}.`,
      ...gearLog,
      ...playerSynergy.map((x) => `Your composition activated ${x}.`),
      ...enemySynergy.map((x) => `${squad.owner} activated ${x}.`),
    ];
  potions.forEach((p) => applyBattlePotion(player, p, log));
  log.push(`ARENA · ${arena}. Matching land or Genesis: +10% damage and healing (non-stacking).`);
  [...player, ...enemy].forEach((unit) => {
    unit.efficiency = battleEfficiency(unit, arena);
    if (unit.efficiency > 1) log.push(`${unit.name}: +10% efficiency · ${unit.collection === "Genesis" ? "Genesis" : `${arena} land match`}.`);
  });
  const frames: BattleFrame[] = [];
  const record = (kind: BattleFrame["kind"], message: string, actorId?: string, targetId?: string) => {
    frames.push({ kind, message, actorId, targetId, logCount: log.length,
      units: [...player, ...enemy].map((unit) => ({ ...unit })) });
  };
  record("ready", `The parties enter the ${arena} arena.`);
  for (
    let round = 1;
    round <= 30 && player.some((u) => u.hp > 0) && enemy.some((u) => u.hp > 0);
    round++
  ) {
    log.push(`— ROUND ${round} —`);
    for (const team of [player, enemy]) {
      const foes = team === player ? enemy : player;
      for (let index = 0; index < team.length; index++) {
        const unit = team[index];
        if (unit.hp <= 0 || !foes.some((f) => f.hp > 0)) continue;
        if (unit.role === "support") {
          const ally = [...team].filter((a) =>
            a.hp > 0 && a.hp < a.maxHp
          ).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
          if (ally) {
            const bonus = team.filter((x) =>
                  x.role === "support"
                ).length >= 2
                ? 2
                : 0,
              heal = Math.min(
                ally.maxHp - ally.hp,
                efficientAmount(5 + Math.floor(unit.attack / 4) + bonus, unit.efficiency),
              );
            ally.hp += heal;
            log.push(`${unit.name} restored ${heal} HP to ${ally.name}.`);
            record("heal", log.at(-1)!, unit.id, ally.id);
            continue;
          }
        }
        const living = foes.filter((f) => f.hp > 0),
          defender = living.find((f) => f.role === "defender"),
          target = unit.role === "assassin"
            ? [...living].sort((a, b) => a.hp - b.hp)[0]
            : defender ?? living[0],
          crit = unit.role === "assassin" && (round + index) % 3 === 0,
          blocked = (round + index + target.block) % 5 === 0,
          damage = efficientAmount(Math.max(
            1,
            (crit ? Math.round(unit.attack * 1.65) : unit.attack) -
              target.armor - (blocked ? target.block : 0),
          ), unit.efficiency);
        target.hp = Math.max(0, target.hp - damage);
        log.push(
          `${unit.name} ${crit ? "crit " : ""}hit ${target.name} for ${damage}${
            blocked ? " after a block" : ""
          }.${target.hp ? ` ${target.hp} HP remains.` : " Knockout."}`,
        );
        record("attack", log.at(-1)!, unit.id, target.id);
      }
    }
  }
  const playerAlive = player.some((u) => u.hp > 0),
    enemyAlive = enemy.some((u) => u.hp > 0),
    winner = playerAlive && !enemyAlive
      ? "player"
      : enemyAlive && !playerAlive
      ? "enemy"
      : "draw";
  log.push(
    winner === "player"
      ? "VICTORY · The opposing squad was defeated."
      : winner === "enemy"
      ? "DEFEAT · Your squad was defeated."
      : "DRAW · The battle reached its round limit.",
  );
  record("finished", log.at(-1)!);
  return { winner, log, player, enemy, synergies: playerSynergy, arena, frames };
}
function makeEnemy(tier: number): Enemy {
  const template = ENEMIES[Math.floor(Math.random() * ENEMIES.length)],
    maxHp = 12 + tier * 5 + Math.floor(Math.random() * 6),
    element = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
  return { ...template, hp: maxHp, maxHp, attack: 3 + tier * 2, element };
}
function rollRoom(tier: number) {
  const event = Math.random() < ECONOMY.enemyRoomChance
    ? 0
    : 1 + Math.floor(Math.random() * (EVENTS.length - 1));
  return { event, enemy: event === 0 ? makeEnemy(tier) : null };
}
const FRIENDS: Friend[] = [{
  id: "genesis-031",
  name: "Genesis #31",
  collection: "Genesis",
  generation: 0,
  family: "Skeleton",
  color: "#c9b8ff",
  inventory: [],
  runs: 0,
  wins: 0,
  deaths: 0,
  earnedRf: 0,
  spentRf: 0,
  burnedRf: 0,
  itemsBought: 0,
}, {
  id: "gen-184",
  name: "Generations #184",
  collection: "Generations",
  generation: 2,
  family: "Hoverer",
  color: "#ffb7d5",
  inventory: [],
  runs: 0,
  wins: 0,
  deaths: 0,
  earnedRf: 0,
  spentRf: 0,
  burnedRf: 0,
  itemsBought: 0,
}, {
  id: "gen-409",
  name: "Generations #409",
  collection: "Generations",
  generation: 4,
  family: "Mask",
  color: "#a9e8d2",
  inventory: [],
  runs: 0,
  wins: 0,
  deaths: 0,
  earnedRf: 0,
  spentRf: 0,
  burnedRf: 0,
  itemsBought: 0,
}, {
  id: "gen-612",
  name: "Generations #612",
  collection: "Generations",
  generation: 6,
  family: "Cellular",
  color: "#ffd59f",
  inventory: [],
  runs: 0,
  wins: 0,
  deaths: 0,
  earnedRf: 0,
  spentRf: 0,
  burnedRf: 0,
  itemsBought: 0,
}];
const starter: Player = {
  rf: 250,
  pool: 18420,
  friends: FRIENDS,
  selectedId: FRIENDS[0].id,
};
const uid = (x: Item): Item => ({
  ...x,
  id: `${x.id}-${Date.now()}-${Math.random()}`,
});
function guildWeekKey(date = new Date()) {
  const monday = new Date(date), offset = (date.getDay() + 6) % 7;
  monday.setDate(date.getDate() - offset);
  return `${monday.getFullYear()}-${monday.getMonth() + 1}-${monday.getDate()}`;
}
function productionFriend(friend: Friend): Friend {
  const token = Number(friend.id.split("-").at(-1)),
    collection = friend.collection === "Genesis" ? "Genesis" : "Generations",
    inventory = (friend.inventory || []).map((item) => {
      const catalog = GOODS.find((g) =>
        g.art && (item.id === g.id || item.id.startsWith(`${g.id}-`))
      );
      return catalog ? { ...item, art: catalog.art } : item;
    });
  return { ...friend, collection, land: petLand(friend), name: `${collection} #${token}`, inventory };
}
function initialPlayer(pets?: Pet[]): Player {
  return pets ? { ...starter, friends: pets.map(pet => ({
    ...pet, color: pet.collection === "Genesis" ? "#c9b8ff" : "#a9e8d2",
    inventory: [], runs: 0, wins: 0, deaths: 0, earnedRf: 0, spentRf: 0, burnedRf: 0, itemsBought: 0,
  })), selectedId: pets[0].id } : starter;
}
function load(saveKey: string, pets?: Pet[]): Player {
  const fresh = initialPlayer(pets);
  try {
    const p = JSON.parse(localStorage.getItem(saveKey) || "") as Player;
    if (!Array.isArray(p.friends) || !Number.isFinite(p.rf) || !Number.isFinite(p.pool)) return fresh;
    const friends = pets ? fresh.friends.map(pet => {
      const saved = p.friends.find(friend => friend.id === pet.id);
      return saved ? { ...saved, ...pet, inventory: Array.isArray(saved.inventory) ? saved.inventory : [],
        role: saved.role, runs: saved.runs, wins: saved.wins, deaths: saved.deaths,
        earnedRf: saved.earnedRf, spentRf: saved.spentRf, burnedRf: saved.burnedRf, itemsBought: saved.itemsBought } : pet;
    }) : p.friends.map(productionFriend);
    return { ...p, friends, selectedId: friends.some(f => f.id === p.selectedId) ? p.selectedId : friends[0].id,
      ...(p.guildWeek === guildWeekKey() ? {} : { guildId: undefined, warPoints: 0, guildTithe: 0, guildWeek: guildWeekKey() }) };
  } catch { return fresh; }
}
export default function App() {
  const [client] = useState(() => new WalletClient());
  const wallet = useSyncExternalStore(client.subscribe, client.getSnapshot);
  const [walletSlot, setWalletSlot] = useState<HTMLSpanElement | null>(null);
  const account = wallet.chainId === ROBINHOOD.chainId ? wallet.address?.toLowerCase() : undefined;
  const owned = useOwnedPets(account);
  const guest = !wallet.wallet;
  const playable = guest || !!(account && owned.pets?.length && !owned.error);
  const saveKey = guest ? "rare-adventures-save-v1" : `rare-adventures-wallet-v1:4663:${account}`;
  const rosterKey = owned.pets?.map(p => `${p.id}:${p.generation}:${p.land ?? ""}`).join("|") ?? "";
  return <>
    {playable ? <Game key={guest ? "guest" : `${account}:${rosterKey}`} saveKey={saveKey}
      pets={guest ? undefined : owned.pets} walletSlot={setWalletSlot} refreshPets={owned.refresh} refreshingPets={owned.refreshing} /> :
      <div className="app">
        <Header player={{ ...starter, rf: 0, pool: 0 }} menu={false} toggle={() => {}} home={() => {}} walletSlot={setWalletSlot} />
        <main><section className="owned-pets-gate">
          <h1>{owned.error ? "Could not verify your pets" : !account ? "Connect on Robinhood Chain" : owned.pets ? "No playable pets found" : "Loading your pets…"}</h1>
          <p role={owned.error ? "alert" : "status"}>{owned.error || (!account ? "Open your wallet to finish connecting or switch to Robinhood Chain." : owned.pets ? "This wallet has no Genesis or hardwired Generations NFTs (generation 1 or higher). Transfer a pet to this wallet, then refresh." : "Checking Genesis and Generations ownership and loading their on-chain artwork and traits.")}</p>
          {account && <button disabled={owned.refreshing} onClick={owned.refresh}>{owned.refreshing ? "Checking ownership…" : "Refresh pets"}</button>}
          <button onClick={client.disconnect}>Return to guest demo</button>
        </section></main>
      </div>}
    <WalletPanel client={client} triggerTarget={walletSlot} petCount={account ? owned.pets?.length : undefined} petError={account ? owned.error : undefined} loadingPets={!!account && !owned.pets && !owned.error} />
  </>;
}
function Game({ saveKey, pets, walletSlot, refreshPets, refreshingPets }: {
  saveKey: string; pets?: Pet[]; walletSlot: (element: HTMLSpanElement | null) => void;
  refreshPets: () => void; refreshingPets: boolean;
}) {
  const [page, setPage] = useState<Page>(pets ? "friends" : "home"),
    [menu, setMenu] = useState(false),
    [darkMode, setDarkMode] = useState(() =>
      localStorage.getItem("rare-adventures-color-mode") === "dark"
    ),
    [player, setPlayer] = useState<Player>(() => load(saveKey, pets)),
    [shop, setShop] = useState<Kind>("armor"),
    [selectedDungeon, setSelectedDungeon] = useState(DUNGEONS[0]),
    [run, setRun] = useState<Run | null>(null),
    [toast, setToast] = useState("");
  const friend = player.friends.find((f) => f.id === player.selectedId)!;
  useEffect(
    () =>
      { try {
        // Artwork is fetched from the canonical contracts each session, not trusted from saves.
        const saved = pets ? { ...player, friends: player.friends.map(({ spriteUrl, imageUrl, ...friend }) => friend) } : player;
        localStorage.setItem(saveKey, JSON.stringify(saved));
      } catch { setToast("Browser storage is full or unavailable. Progress cannot be saved."); } },
    [player, saveKey, pets],
  );
  useEffect(() => {
    const mode = darkMode ? "dark" : "light";
    document.documentElement.dataset.colorMode = mode;
    localStorage.setItem("rare-adventures-color-mode", mode);
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      darkMode ? "#121014" : "#fffdf8",
    );
  }, [darkMode]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);
  const nav = (p: Page) => {
    setPage(p);
    setMenu(false);
  };
  const updateFriend = (id: string, fn: (f: Friend) => Friend) =>
    setPlayer((p) => ({
      ...p,
      friends: p.friends.map((f) => f.id === id ? fn(f) : f),
    }));
  const gear = useMemo(() => {
    const active = friend.inventory.filter((i) =>
      run?.equipment.includes(i.id)
    ), weaponItems = active.filter((i) => i.kind === "weapon"),
      armorItems = active.filter((i) => i.kind === "armor");
    return {
      weaponItems,
      armorItems,
      weapon: weaponItems.reduce(
        (n, i) => n + i.power,
        0,
      ),
      armor: armorItems.reduce(
        (n, i) => n + i.power,
        0,
      ),
      defense: active.filter((i) => i.kind === "defense").reduce(
        (n, i) => n + i.power,
        0,
      ),
    };
  }, [friend, run?.equipment]);
  function buy(i: Item) {
    const tithe = titheAmount(i.price, player);
    if (player.rf < i.price + tithe) {
      return setToast(`Need ${i.price + tithe} $RF including guild tithe`);
    }
    setPlayer((p) => ({
      ...p,
      rf: p.rf - i.price - tithe,
      pool: p.pool + poolContribution(i.price) + tithePoolShare(tithe),
      guildTithe: (p.guildTithe || 0) + titheGuildShare(tithe),
      warPoints: p.guildId ? (p.warPoints || 0) + 1 : (p.warPoints || 0),
      friends: p.friends.map((f) =>
        f.id === p.selectedId
          ? {
            ...f,
            inventory: [...f.inventory, uid({
              ...i,
              origin: i.origin === "rare-shop" ? "rare-shop" : "shop",
            })],
            spentRf: (f.spentRf || 0) + i.price,
            burnedRf: (f.burnedRf || 0) + sinkAmount(i.price),
            itemsBought: (f.itemsBought || 0) + 1,
          }
          : f
      ),
    }));
    setToast(`${i.name} equipped to ${friend.name}`);
  }
  function settleBattleWager(
    outcome: BattleResult["winner"],
    wager: BattleWager,
    amount: number,
    stake?: ItemStake,
  ) {
    if (outcome === "player") {
      setPlayer((p) => ({
        ...p,
        warPoints: p.guildId ? (p.warPoints || 0) + 20 : (p.warPoints || 0),
      }));
    } else if (outcome === "draw") {
      setPlayer((p) => ({
        ...p,
        warPoints: p.guildId ? (p.warPoints || 0) + 5 : (p.warPoints || 0),
      }));
    }
    if (outcome === "draw" || wager.type === "none") return;
    if (wager.type === "rf") {
      const delta = outcome === "player" ? amount : -amount;
      setPlayer((p) => ({ ...p, rf: Math.max(0, p.rf + delta) }));
      return;
    }
    if (!stake) return;
    setPlayer((p) => ({
      ...p,
      friends: p.friends.map((f) => {
        if (f.id !== stake.ownerId) return f;
        if (outcome === "player") {
          return {
            ...f,
            inventory: [
              ...f.inventory,
              uid({ ...wager.item, origin: "market" }),
            ],
          };
        }
        return {
          ...f,
          inventory: f.inventory.filter((item) => item.id !== stake.item.id),
        };
      }),
    }));
  }
  function settleRaid(friendId: string, fee: number, result: RaidResult) {
    const tithe = titheAmount(fee, player);
    setPlayer((p) => ({
      ...p,
      rf: p.rf - fee - tithe + result.reward,
      pool: p.pool + result.pot - result.reward + tithePoolShare(tithe),
      guildTithe: (p.guildTithe || 0) + titheGuildShare(tithe),
      warPoints: p.guildId
        ? (p.warPoints || 0) +
          (result.success
            ? ({ EXPEDITION: 45, HEROIC: 75, MYTHIC: 120 }[result.difficulty] +
              RAID_DUNGEONS.findIndex((entry) =>
                  entry.name === result.dungeon
                ) *
                8)
            : 4)
        : (p.warPoints || 0),
      friends: p.friends.map((f) =>
        f.id === friendId
          ? {
            ...f,
            inventory: result.item
              ? [...f.inventory, uid({ ...result.item, origin: "raid" })]
              : f.inventory,
            spentRf: (f.spentRf || 0) + fee,
            earnedRf: (f.earnedRf || 0) + result.reward,
          }
          : f
      ),
    }));
    setToast(
      result.success
        ? `Raid cleared · ${result.reward} $RF${
          result.item ? ` + ${result.item.name}` : ""
        }`
        : "Raid failed · entry added to the reward pool",
    );
  }
  function sellLoot(ownerId: string, itemId: string, price: number) {
    const fee = Math.max(1, Math.ceil(price * .05)), proceeds = price - fee;
    setPlayer((p) => ({
      ...p,
      rf: p.rf + proceeds,
      pool: p.pool + fee,
      warPoints: p.guildId ? (p.warPoints || 0) + 3 : (p.warPoints || 0),
      friends: p.friends.map((f) =>
        f.id === ownerId
          ? {
            ...f,
            inventory: f.inventory.filter((item) => item.id !== itemId),
            earnedRf: (f.earnedRf || 0) + proceeds,
          }
          : f
      ),
    }));
    setToast(`Loot sold · ${proceeds} $RF after ${fee} $RF market fee`);
  }
  function buyMarketItem(item: Item, price: number) {
    const tithe = titheAmount(price, player);
    if (player.rf < price + tithe) {
      return setToast(`Need ${price + tithe} $RF including guild tithe`);
    }
    setPlayer((p) => ({
      ...p,
      rf: p.rf - price - tithe,
      pool: p.pool + tithePoolShare(tithe),
      guildTithe: (p.guildTithe || 0) + titheGuildShare(tithe),
      friends: p.friends.map((f) =>
        f.id === p.selectedId
          ? {
            ...f,
            inventory: [...f.inventory, uid({ ...item, origin: "market" })],
            spentRf: (f.spentRf || 0) + price,
          }
          : f
      ),
    }));
    setToast(`${item.name} purchased for ${friend.name}`);
  }
  function start(d: Dungeon) {
    const tithe = titheAmount(d.cost, player);
    if (player.rf < d.cost + tithe) {
      return setToast(`Need ${d.cost + tithe} $RF including guild tithe`);
    }
    const equipment = friend.inventory.filter((i) => i.kind !== "potion").map(
        (i) => i.id,
      ),
      firstRoom = rollRoom(d.tier);
    setPlayer((p) => ({
      ...p,
      rf: p.rf - d.cost - tithe,
      pool: p.pool + poolContribution(d.cost) + tithePoolShare(tithe),
      guildTithe: (p.guildTithe || 0) + titheGuildShare(tithe),
      friends: p.friends.map((f) =>
        f.id === p.selectedId
          ? {
            ...f,
            runs: f.runs + 1,
            spentRf: (f.spentRf || 0) + d.cost + tithe,
            burnedRf: (f.burnedRf || 0) + sinkAmount(d.cost),
          }
          : f
      ),
    }));
    setRun({
      dungeon: d,
      friendId: friend.id,
      room: 1,
      hp: ECONOMY.playerMaxHp,
      maxHp: ECONOMY.playerMaxHp,
      ...firstRoom,
      buffs: {
        attack: 0,
        armor: 0,
        defense: 0,
        evade: 0,
        fortune: 0,
        revive: 0,
      },
      spentRf: d.cost + tithe,
      log: [`${friend.name} entered ${d.name}.`],
      equipment,
    });
    setPage("run");
  }
  function choose(paid: boolean) {
    if (!run) return;
    const ev = EVENTS[run.event],
      buffs = normalizeBuffs(run.buffs),
      tithe = paid ? titheAmount(ev.burn, player) : 0;
    if (paid && player.rf < ev.burn + tithe) {
      return setToast(`Need ${ev.burn + tithe} $RF including guild tithe`);
    }
    const spentRf = run.spentRf + (paid ? ev.burn + tithe : 0);
    if (paid) {
      setPlayer((p) => ({
        ...p,
        rf: p.rf - ev.burn - tithe,
        pool: p.pool + poolContribution(ev.burn) + tithePoolShare(tithe),
        guildTithe: (p.guildTithe || 0) + titheGuildShare(tithe),
        friends: p.friends.map((f) =>
          f.id === run.friendId
            ? {
              ...f,
              spentRf: (f.spentRf || 0) + ev.burn + tithe,
              burnedRf: (f.burnedRf || 0) + sinkAmount(ev.burn),
            }
            : f
        ),
      }));
    }
    const fall = (log: string[]) => {
      if (buffs.revive > 0) {
        return setRun({
          ...run,
          hp: 8,
          buffs: { ...buffs, revive: buffs.revive - 1 },
          spentRf,
          log: [...log, "Emberdew prevented the fatal fall and restored 8 HP."],
        });
      }
      updateFriend(
        run.friendId,
        (f) => ({ ...f, inventory: [], deaths: (f.deaths || 0) + 1 }),
      );
      setRun({
        ...run,
        hp: 0,
        buffs,
        spentRf,
        log: [...log, "Your Friend fell. Their inventory was lost."],
      });
    };
    const advance = (hp: number, log: string[], nextBuffs = buffs) => {
      if (run.room >= run.dungeon.rooms) {
        const [minReward, maxReward] = rewardRange(run.dungeon),
          payout = Math.min(
            Math.round(minReward + Math.random() * (maxReward - minReward)),
            player.pool,
          );
        setPlayer((p) => ({
          ...p,
          rf: p.rf + payout,
          pool: p.pool - payout,
          warPoints: p.guildId
            ? (p.warPoints || 0) + run.dungeon.tier * 12
            : (p.warPoints || 0),
          friends: p.friends.map((f) =>
            f.id === run.friendId
              ? {
                ...f,
                wins: f.wins + 1,
                earnedRf: (f.earnedRf || 0) + payout,
                inventory: f.inventory.map((i) =>
                  run.equipment.includes(i.id) ? { ...i, uses: i.uses - 1 } : i
                ).filter((i) => i.uses > 0),
              }
              : f
          ),
        }));
        return setRun({
          ...run,
          hp,
          room: run.room + 1,
          enemy: null,
          buffs: nextBuffs,
          spentRf,
          log: [...log, `Cleared. Claimed ${payout} $RF.`],
        });
      }
      const next = rollRoom(run.dungeon.tier);
      setRun({
        ...run,
        hp,
        room: run.room + 1,
        ...next,
        buffs: nextBuffs,
        spentRf,
        log,
      });
    };
    if (run.enemy) {
      const weaponMatch = gear.weaponItems.reduce(
          (total, item) => total + elementBonus(item, run.enemy!.element),
          0,
        ),
        armorMatch = gear.armorItems.reduce(
          (total, item) => total + elementBonus(item, run.enemy!.element),
          0,
        ),
        attack = 4 + run.dungeon.tier + gear.weapon + weaponMatch + buffs.attack +
          Math.floor(Math.random() * 4) +
          (paid ? ECONOMY.focusedStrikeBonus : 0),
        enemyHp = Math.max(0, run.enemy.hp - attack),
        attackLog = `Hit ${run.enemy.name} for ${attack} damage${
          gear.weapon + weaponMatch + buffs.attack
            ? ` (${gear.weapon + buffs.attack} gear${weaponMatch ? ` + ${weaponMatch} elemental` : ""})`
            : ""
        }.`;
      if (!enemyHp) {
        return advance(run.hp, [
          ...run.log,
          attackLog,
          `${run.enemy.name} was defeated.`,
        ]);
      }
      const evaded = buffs.evade > 0,
        blocked = evaded ||
          Math.random() < Math.min(.7, (gear.defense + buffs.defense) * .06),
        raw = run.enemy.attack + Math.floor(Math.random() * 4),
        damage = evaded ? 0 : blocked
          ? Math.max(
            0,
            raw - gear.armor - armorMatch - buffs.armor - gear.defense - buffs.defense,
          )
          : Math.max(1, raw - gear.armor - armorMatch - buffs.armor - (paid ? 2 : 0)),
        hp = Math.max(0, run.hp - damage),
        nextBuffs = {
          ...buffs,
          evade: Math.max(0, buffs.evade - (evaded ? 1 : 0)),
        },
        defenseLog = evaded
          ? "Potion effect: evaded the counterattack."
          : blocked
          ? `Defense blocked ${raw - damage} damage${armorMatch ? ` with +${armorMatch} elemental guard` : ""}.`
          : `Armor reduced the counterattack to ${damage} damage${armorMatch ? ` (+${armorMatch} elemental guard)` : ""}.`;
      if (!hp) return fall([...run.log, attackLog, defenseLog]);
      return setRun({
        ...run,
        hp,
        enemy: { ...run.enemy, hp: enemyHp },
        buffs: nextBuffs,
        spentRf,
        log: [...run.log, attackLog, defenseLog],
      });
    }
    const base = run.dungeon.tier * 4 + Math.floor(Math.random() * 7),
      evaded = buffs.evade > 0,
      blocked = evaded ||
        Math.random() < Math.min(.7, (gear.defense + buffs.defense) * .06),
      damage = evaded ? 0 : paid
        ? Math.max(
          0,
          base - gear.armor - buffs.armor - ECONOMY.paidPathMitigation,
        )
        : blocked
        ? Math.max(
          0,
          base - gear.armor - buffs.armor - gear.defense - buffs.defense,
        )
        : Math.max(1, base - gear.armor - buffs.armor),
      hp = Math.max(0, run.hp - damage),
      nextBuffs = {
        ...buffs,
        evade: Math.max(0, buffs.evade - (evaded ? 1 : 0)),
      },
      choiceLabel = evaded
        ? "Potion effect: evaded the danger"
        : paid
        ? `Paid ${ev.burn} $RF`
        : blocked
        ? "Defense blocked the danger"
        : "Took the hard path";
    if (!hp) return fall(run.log);
    const fortuneUsed = !paid && ev.type === "LOOT" && buffs.fortune > 0,
      foundLoot = !paid && ev.type === "LOOT" &&
        (fortuneUsed || Math.random() < ECONOMY.lootChance),
      finalBuffs = fortuneUsed
        ? { ...nextBuffs, fortune: nextBuffs.fortune - 1 }
        : nextBuffs;
    if (foundLoot) {
      const reward = GOODS[Math.floor(Math.random() * GOODS.length)],
        found = uid({
          ...modifiedReward(reward),
          origin: "adventure",
        });
      updateFriend(
        run.friendId,
        (f) => ({ ...f, inventory: [...f.inventory, found] }),
      );
      setToast(`${friend.name} found ${found.name}`);
    }
    advance(hp, [
      ...run.log,
      `${choiceLabel}; lost ${damage} HP.${
        fortuneUsed ? " Starfall guaranteed the find." : ""
      }`,
    ], finalBuffs);
  }
  function drink(i: Item) {
    const catalog = POTIONS.find((p) =>
        i.id === p.id || i.id.startsWith(`${p.id}-`)
      ),
      potion = catalog
        ? { ...i, effect: catalog.effect, power: catalog.power }
        : i;
    if (!run || !potion.effect) return;
    const buffs = normalizeBuffs(run.buffs);
    let hp = run.hp, maxHp = run.maxHp, nextBuffs = buffs;
    switch (potion.effect) {
      case "heal":
        hp = Math.min(maxHp, hp + potion.power);
        break;
      case "attack":
        nextBuffs = { ...buffs, attack: buffs.attack + potion.power };
        break;
      case "armor":
        nextBuffs = { ...buffs, armor: buffs.armor + potion.power };
        break;
      case "defense":
        nextBuffs = { ...buffs, defense: buffs.defense + potion.power };
        break;
      case "evade":
        nextBuffs = { ...buffs, evade: buffs.evade + potion.power };
        break;
      case "fortune":
        nextBuffs = { ...buffs, fortune: buffs.fortune + potion.power };
        break;
      case "revive":
        nextBuffs = { ...buffs, revive: buffs.revive + potion.power };
        break;
      case "maxhp":
        maxHp += potion.power;
        hp += potion.power;
        break;
      case "repair":
        break;
    }
    updateFriend(run.friendId, (f) => ({
      ...f,
      inventory: f.inventory.filter((x) => x.id !== i.id).map((item) =>
        potion.effect === "repair" && run.equipment.includes(item.id)
          ? { ...item, uses: Math.min(item.maxUses, item.uses + potion.power) }
          : item
      ),
    }));
    setRun({
      ...run,
      hp,
      maxHp,
      buffs: nextBuffs,
      log: [
        ...run.log,
        `Used ${potion.name}; ${
          potionEffectText(potion.effect, potion.power)
        }.`,
      ],
    });
  }
  return (
    <div className="app">
      <Header
        player={player}
        menu={menu}
        toggle={() => setMenu((v) => !v)}
        home={() => nav("home")}
        walletSlot={walletSlot}
      />
      {menu && (
        <button
          className="scrim"
          aria-label="Close menu"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className="nav-drawer" data-open={menu || undefined}>
        <div className="drawer-content">
          <nav>
            <Nav
              icon={homeMenuIcon}
              label="Home"
              current={page === "home"}
              onClick={() => nav("home")}
            />
            <Nav
              icon={friendsIcon}
              label="Friends"
              current={page === "friends"}
              onClick={() => nav("friends")}
            />
            <Nav
              icon={shopIcon}
              label="Shops"
              current={page === "shop"}
              onClick={() => nav("shop")}
            />
            <Nav
              icon={adventureMenuIcon}
              label="Adventures"
              current={page === "dungeons" || page === "run"}
              onClick={() => nav("dungeons")}
            />
            <Nav
              icon={battleMenuIcon}
              label="Battles"
              current={page === "battle"}
              onClick={() => nav("battle")}
            />
            <Nav
              icon={raidMenuIcon}
              label="Raids"
              current={page === "raids"}
              onClick={() => nav("raids")}
            />
            <Nav
              icon={marketMenuIcon}
              label="Marketplace"
              current={page === "market"}
              onClick={() => nav("market")}
            />
            <Nav
              icon={guildIcon}
              label="Guild"
              current={page === "guild"}
              onClick={() => nav("guild")}
            />
            <Nav
              icon={guildWarIcon}
              label="Guild Wars"
              current={page === "guild_wars"}
              onClick={() => nav("guild_wars")}
            />
            <Nav
              icon={friendsIcon}
              label="Metrics"
              current={page === "metrics"}
              onClick={() => nav("metrics")}
            />
            <Nav
              icon={docsIcon}
              label="Docs"
              current={page === "docs"}
              onClick={() => nav("docs")}
            />
          </nav>
          <div className="drawer-friend">
            <small>ACTIVE FRIEND</small>
            <FriendFace friend={friend} />
            <b>{friend.name}</b>
            <span>
              {friend.collection}{" "}
              {friend.collection === "Generation" ? friend.generation : ""}
            </span>
          </div>
        </div>
        <div className="drawer-footer">
          <button
            className="reset"
            onClick={() => {
              localStorage.removeItem(saveKey);
              setRun(null);
              setPage("home");
              setPlayer(initialPlayer(pets));
              setToast("Demo reset");
            }}
          >
            RESET DEMO
          </button>
          <button
            className="theme-toggle"
            aria-pressed={darkMode}
            onClick={() => setDarkMode((current) => !current)}
          >
            <span>{darkMode ? "☀" : "☾"}</span>
            <b>{darkMode ? "USE LIGHT MODE" : "USE DARK MODE"}</b>
            <i aria-hidden="true"><em /></i>
          </button>
        </div>
      </aside>
      <main>
        <div className="owned-pets-banner">
          <span>{pets ? `${pets.length} owned pets · Wallet progress · Simulated RF` : "Guest demo · Preset pets · Simulated RF"}</span>
          {pets && <button disabled={refreshingPets} onClick={refreshPets}>{refreshingPets ? "Checking pets…" : "Refresh pets"}</button>}
        </div>
        {page === "home" && (
          <Home
            enter={() => nav("friends")}
            shop={() => nav("shop")}
            adventure={() => nav("dungeons")}
            battle={() => nav("battle")}
            raids={() => nav("raids")}
            market={() => nav("market")}
            guild={() => nav("guild")}
            guildWars={() => nav("guild_wars")}
            docs={() => nav("docs")}
            metrics={() => nav("metrics")}
          />
        )} {page === "friends" && (
          <Friends
            player={player}
            select={(id) => setPlayer((p) => ({ ...p, selectedId: id }))}
            venture={() => nav("dungeons")}
          />
        )} {page === "guild" && (
          <GuildHome
            player={player}
            join={(guildId) =>
              setPlayer((current) => ({
                ...current,
                guildId,
                guildWeek: guildWeekKey(),
                warPoints: 0,
                guildTithe: 0,
                tithePercent: current.tithePercent ?? 5,
              }))}
            setTithe={(tithePercent) =>
              setPlayer((current) => ({ ...current, tithePercent }))}
            openWars={() => nav("guild_wars")}
            go={nav}
          />
        )} {page === "guild_wars" && (
          <GuildWars
            player={player}
            openGuild={() => nav("guild")}
            go={nav}
          />
        )} {page === "docs" && (
          <EconomyDocs go={nav} />
        )} {page === "metrics" && (
          <GameMetrics go={nav} />
        )} {page === "dungeons" && (
          <Dungeons
            selected={selectedDungeon}
            setSelected={setSelectedDungeon}
            start={start}
            player={player}
            friend={friend}
            change={(id) => setPlayer((p) => ({ ...p, selectedId: id }))}
          />
        )} {page === "shop" && (
          <Shop
            tab={shop}
            setTab={setShop}
            buy={buy}
            player={player}
            friend={friend}
          />
        )}{" "}
        {page === "market" && (
          <Marketplace player={player} sell={sellLoot} buy={buyMarketItem} />
        )} {page === "battle" && (
          <Battle
            player={player}
            assignRole={(id, role) =>
              setPlayer((p) => ({
                ...p,
                friends: p.friends.map((f) => f.id === id ? { ...f, role } : f),
              }))}
            consumePotions={(loadout) =>
              setPlayer((p) => ({
                ...p,
                friends: p.friends.map((f) => {
                  const used = loadout.filter((x) => x.ownerId === f.id).map(
                      (x) => x.item.id,
                    ),
                    inventory = [...f.inventory];
                  used.forEach((id) => {
                    const index = inventory.findIndex((i) => i.id === id);
                    if (index >= 0) inventory.splice(index, 1);
                  });
                  return { ...f, inventory };
                }),
              }))}
            settleWager={settleBattleWager}
          />
        )} {page === "raids" && <Raids player={player} settle={settleRaid} />}
        {" "}
        {page === "run" && run && (
          <RunView
            run={run}
            friend={friend}
            choose={choose}
            leave={() => {
              setRun(null);
              nav("dungeons");
            }}
            player={player}
            drink={drink}
          />
        )}
      </main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
function Nav(
  { icon, label, current, onClick }: {
    icon: string;
    label: string;
    current: boolean;
    onClick: () => void;
  },
) {
  return (
    <button data-active={current || undefined} onClick={onClick}>
      <img src={icon} />
      {label}
      <ChevronRight />
    </button>
  );
}
function Header(
  { player, menu, toggle, home, walletSlot }: {
    player: Player;
    walletSlot: (element: HTMLSpanElement | null) => void;
    menu: boolean;
    toggle: () => void;
    home: () => void;
  },
) {
  return (
    <header>
      <button className="brand" onClick={home}>
        <img src={publicAsset("/rare-friends.svg")} alt="" />
        <span>
          rare <b>adventures</b>
        </span>
      </button>
      <div className="pool">
        <small>DEMO REWARD POOL</small>
        <strong>
          <Coins /> {player.pool.toLocaleString()} $RF
        </strong>
      </div>
      <div className="header-actions">
        <div className="balance">
          <small>DEMO BALANCE</small>
          <strong>{player.rf} $RF</strong>
        </div>
        <span className="wallet-slot" ref={walletSlot} />
        <button
          className="menu"
          onClick={toggle}
          aria-label="Toggle navigation"
          aria-expanded={menu}
        >
          <img src={menu ? xIcon : menuIcon} />
        </button>
      </div>
    </header>
  );
}
function FriendFace({ friend }: { friend: Friend }) {
  return (
    <div className={`friend-face${friend.imageUrl ? " owned-portrait" : ""}`} style={{ background: friend.color }}>
      <img src={friend.imageUrl || publicAsset("/rare-friends.svg")} alt={friend.name} />
      <i>{friend.tokenId || friend.id.split("-").at(-1)}</i>
    </div>
  );
}
function ItemVisual({ item }: { item: Item }) {
  return item.art
    ? <img className="item-svg" src={publicAsset(item.art)} alt="" />
    : <span aria-hidden="true">{item.icon}</span>;
}
function ElementBadge({ element }: { element: Element }) {
  const meta = ELEMENT_META[element];
  return (
    <span className="element-badge" style={{ background: meta.color }}>
      <i>{meta.symbol}</i> {meta.label}
    </span>
  );
}
function Home(
  { enter, shop, adventure, battle, raids, market, guild, guildWars, docs, metrics }: {
    enter: () => void;
    shop: () => void;
    adventure: () => void;
    battle: () => void;
    raids: () => void;
    market: () => void;
    guild: () => void;
    guildWars: () => void;
    docs: () => void;
    metrics: () => void;
  },
) {
  return (
    <section className="home-page">
      <div className="home-title">
        <h1>RARE ADVENTURES</h1>
      </div>
      <div className="rules">
        <span>HOW TO PLAY</span>
        <div>
          {[{
            n: "01",
            title: "CHOOSE A FRIEND",
            copy: "Choose an adventurer and view their personal inventory.",
            go: enter,
          }, {
            n: "02",
            title: "GEAR THEM UP",
            copy: "Visit the shops and prepare your active Friend.",
            go: shop,
          }, {
            n: "03",
            title: "CHOOSE AN ADVENTURE",
            copy:
              "Pick a trail, make choices, and bring your discoveries home.",
            go: adventure,
          }, {
            n: "04",
            title: "BATTLE A PARTY",
            copy:
              "Assign fighting types, build a composition, and challenge a waiting squad.",
            go: battle,
          }, {
            n: "05",
            title: "JOIN A RAID",
            copy:
              "Queue with four wallets, combine team power, and hunt dungeon-exclusive rewards.",
            go: raids,
          }, {
            n: "06",
            title: "SELL YOUR LOOT",
            copy:
              "List adventure finds and raid rewards for other players in the Marketplace.",
            go: market,
          }, {
            n: "07",
            title: "JOIN A GUILD",
            copy:
              "Choose your weekly guild, coordinate strategy, and support its treasury.",
            go: guild,
          }, {
            n: "08",
            title: "ENTER GUILD WARS",
            copy:
              "View live standings and turn your adventures into weekly guild points.",
            go: guildWars,
          }, {
            n: "09",
            title: "VIEW GAME METRICS",
            copy:
              "Explore project-wide game content, available gear, and RF economy settings.",
            go: metrics,
          }, {
            n: "10",
            title: "READ THE ECONOMY DOCS",
            copy:
              "Understand RF flows, rewards, sinks, guilds, and the ecosystem flywheel.",
            go: docs,
          }].map((x) => (
            <button className="rule-card" key={x.n} onClick={x.go}>
              <b>{x.n}</b>
              <h3>{x.title}</h3>
              <p>{x.copy}</p>
              <ChevronRight />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
function GameMetrics({ go }: { go: (page: Page) => void }) {
  const cards = [
    { label: "ADVENTURE LOCATIONS", value: DUNGEONS.length, icon: <Swords /> },
    { label: "GUILDS", value: GUILDS.length, icon: <Trophy /> },
    { label: "ELEMENT TYPES", value: ELEMENTS.length, icon: <Heart /> },
    { label: "POTION EFFECTS", value: POTION_KINDS.length, icon: <Heart /> },
    { label: "WEAPONS", value: GOODS.filter((item) => item.kind === "weapon").length, icon: <Swords /> },
    { label: "ARMOR", value: GOODS.filter((item) => item.kind === "armor").length, icon: <Backpack /> },
    { label: "DEFENSE ITEMS", value: GOODS.filter((item) => item.kind === "defense").length, icon: <Backpack /> },
    { label: "POTION VARIANTS", value: POTIONS.length, icon: <Heart /> },
  ];
  return (
    <section className="page metrics-page">
      <div className="page-title">
        <span>PROJECT OVERVIEW</span>
        <h1>GAME METRICS.</h1>
        <p>Project-wide game content and RF economy settings.</p>
        <p>Catalog totals and configured values; live project-wide activity is not yet available.</p>
      </div>
      <div className="metrics-balance">
        <span><small>INITIAL REWARD POOL</small><b>{ECONOMY.startingRewardPool.toLocaleString()} $RF</b></span>
        <span><small>BASE SPEND TO POOL</small><b>{ECONOMY.poolContributionRate * 100}%</b></span>
        <span><small>BASE SPEND TO SINK</small><b>{(1 - ECONOMY.poolContributionRate) * 100}%</b></span>
        <span><small>GUILD CYCLE RESET</small><b>MONDAY</b></span>
      </div>
      <div className="metrics-card-grid">
        {cards.map((card) => (
          <article key={card.label}>
            <i>{card.icon}</i>
            <span><small>{card.label}</small><b>{card.value.toLocaleString()}</b></span>
          </article>
        ))}
      </div>
      <div className="metrics-actions">
        <button className="primary" onClick={() => go("dungeons")}>EXPLORE ADVENTURES <ChevronRight /></button>
        <button onClick={() => go("docs")}>UNDERSTAND THE ECONOMY <ChevronRight /></button>
      </div>
    </section>
  );
}
function EconomyDocs({ go }: { go: (page: Page) => void }) {
  const tiers = DUNGEONS.map((dungeon) => {
    const [minimum, maximum] = rewardRange(dungeon),
      mean = (minimum + maximum) / 2,
      poolIn = poolContribution(dungeon.cost),
      breakEven = poolIn / mean * 100;
    return { ...dungeon, mean, poolIn, breakEven };
  });
  return (
    <section className="page docs-page">
      <div className="docs-hero">
        <span>RARE ADVENTURES · LIVING DOCUMENT</span>
        <h1>THE RF ECONOMY, EXPLAINED.</h1>
        <p>
          A plain-language map of how players, $RF, items, guilds, and the
          reward pool interact—and which levers keep the ecosystem healthy.
        </p>
        <div className="docs-jump">
          <a href="#flywheel">Flywheel</a><a href="#ledger">RF ledger</a>
          <a href="#adventures">Adventures</a><a href="#items">Items</a>
          <a href="#social">Social economy</a><a href="#stewardship">Guidance</a>
        </div>
      </div>

      <section className="docs-summary">
        <article><small>PLAYER START</small><b>250 $RF</b><p>Demo capital used to enter, prepare, and trade.</p></article>
        <article><small>REWARD RESERVE</small><b>18,420 $RF</b><p>The visible demo pool that funds adventure payouts.</p></article>
        <article><small>BASE PAYMENT SPLIT</small><b>50 / 50</b><p>Half supports rewards; half leaves circulation as the protocol sink.</p></article>
        <article><small>CORE PROMISE</small><b>RISK → UTILITY</b><p>Play creates items, stories, coordination, and chances to earn.</p></article>
      </section>

      <section className="docs-section" id="flywheel">
        <div className="docs-heading"><small>01 · SYSTEM MAP</small><h2>THE ECOSYSTEM FLYWHEEL</h2><p>The system works when each activity gives the next activity a reason to exist.</p></div>
        <div className="flywheel">
          <article><b>1</b><span><strong>PREPARE</strong><p>Players buy durable gear, consumable potions, or rare daily equipment.</p></span></article>
          <i>→</i>
          <article><b>2</b><span><strong>PLAY</strong><p>Adventures, raids, and battles turn preparation into risk and outcomes.</p></span></article>
          <i>→</i>
          <article><b>3</b><span><strong>DISCOVER</strong><p>Clears can return RF, loot, elemental advantages, and guild points.</p></span></article>
          <i>→</i>
          <article><b>4</b><span><strong>TRADE</strong><p>Useful finds move through the marketplace while fees replenish rewards.</p></span></article>
          <i>→</i>
          <article><b>5</b><span><strong>COORDINATE</strong><p>Guild goals and raids concentrate activity into shared weekly objectives.</p></span></article>
        </div>
        <div className="docs-callout">
          <b>WHY IT CAN FLY</b>
          <p>RF spending creates pool inflow and scarcity. Rewards create motivation. Loot creates lasting utility. Durability, death risk, fees, and the sink prevent every unit of value from circulating forever.</p>
        </div>
      </section>

      <section className="docs-section" id="ledger">
        <div className="docs-heading"><small>02 · MONEY MOVEMENT</small><h2>FOLLOW ONE $RF PAYMENT</h2><p>Every payment has a destination. “Spent,” “pooled,” and “sunk” are different accounting events.</p></div>
        <div className="rf-flow">
          <article><small>PLAYER PAYMENT</small><b>100 $RF</b></article><i>→</i>
          <article className="pool-flow"><small>REWARD POOL</small><b>50 $RF</b><p>Available for future adventure payouts.</p></article><i>+</i>
          <article className="sink-flow"><small>PROTOCOL SINK</small><b>50 $RF</b><p>Removed from the playable circulation tracked by the prototype.</p></article>
        </div>
        <div className="docs-grid two">
          <article><h3>WHAT FEEDS THE POOL</h3><ul><li>50% of adventure entries</li><li>50% of normal and rare-shop purchases</li><li>50% of paid room actions</li><li>Marketplace sale fees</li><li>Raid pots, less successful payouts</li><li>20% of optional guild tithes</li></ul></article>
          <article><h3>WHAT LEAVES THE POOL</h3><ul><li>Successful adventure payouts</li><li>Successful raid payouts</li></ul><p>Free choices, item discoveries, battle wagers, deaths, and abandonment do not directly move the reward-pool balance.</p></article>
        </div>
        <div className="formula"><small>BASE PAYMENT</small><code>pool = ceil(payment × 0.50) · sink = payment − pool</code></div>
      </section>

      <section className="docs-section" id="adventures">
        <div className="docs-heading"><small>03 · PRIMARY LOOP</small><h2>ADVENTURE ECONOMICS</h2><p>Higher tiers ask for more capital and endurance, then expose the player to a larger payout range.</p></div>
        <div className="docs-table-wrap"><table><thead><tr><th>Tier</th><th>Trail</th><th>Rooms</th><th>Entry</th><th>Reward range</th><th>Mean</th><th>Pool inflow</th><th>Entry-only break-even</th></tr></thead><tbody>{tiers.map((tier) => <tr key={tier.tier}><td>{tier.tier}</td><td>{tier.name}</td><td>{tier.rooms}</td><td>{tier.cost} $RF</td><td>{tier.reward} $RF</td><td>{tier.mean} $RF</td><td>{tier.poolIn} $RF</td><td>{tier.breakEven.toFixed(1)}%</td></tr>)}</tbody></table></div>
        <div className="docs-grid three">
          <article><h3>PAID PATH</h3><p>Paid actions cost 5–8 RF. They add focused damage or reduce danger while splitting the base cost between pool and sink.</p></article>
          <article><h3>FREE PATH</h3><p>Free actions move no RF, but expose health, equipment, and the entire entry cost to greater risk.</p></article>
          <article><h3>CLEAR</h3><p>The payout is sampled from the displayed range and capped by the pool’s available balance. Gear durability decreases on a clear.</p></article>
          <article><h3>LOOT</h3><p>Hard-path loot rooms have a 35% base find chance. Finding an item moves no RF but creates future utility and market value.</p></article>
          <article><h3>DEATH</h3><p>The Friend loses carried inventory. This makes equipment valuable but consumable and prevents permanent supply accumulation.</p></article>
          <article><h3>ABANDON</h3><p>The entry is not refunded. Inventory and remaining durability are preserved, allowing players to stop before risking more.</p></article>
        </div>
        <div className="formula"><small>ECONOMIC HEALTH</small><code>pool EV = pool inflow − (clear rate × mean reward)</code></div>
      </section>

      <section className="docs-section" id="items">
        <div className="docs-heading"><small>04 · ITEM ECONOMY</small><h2>WHY ITEMS MATTER</h2><p>Items convert RF and successful play into power, survivability, specialization, and tradeable value.</p></div>
        <div className="docs-grid three">
          <article><h3>STANDARD SHOP</h3><p>Reliable weapons, armor, defense gear, and potions. Purchases split 50/50 between the reward pool and sink.</p></article>
          <article><h3>REWARD GEAR</h3><p>Adventure and eligible raid gear may carry elemental modifiers. These finds can enter the player marketplace.</p></article>
          <article><h3>DAILY RARE SHELF</h3><p>Three element-bound weapons or armor rotate at 00:00 UTC. They are useful RF sinks but cannot be relisted as found loot.</p></article>
        </div>
        <div className="element-cycle">{ELEMENTS.map((element) => <span key={element} style={{ background: ELEMENT_META[element].color }}><i>{ELEMENT_META[element].symbol}</i><b>{ELEMENT_META[element].label}</b><small>beats {ELEMENT_META[ELEMENT_BEATS[element]].label}</small></span>)}</div>
        <p className="docs-note">An effective weapon gains 50% of its base power as bonus strike. Effective armor gains 50% as bonus guard. The cycle is Water → Fire → Earth → Electricity → Wind → Curse → Water.</p>
      </section>

      <section className="docs-section" id="social">
        <div className="docs-heading"><small>05 · PLAYER-TO-PLAYER LAYER</small><h2>MARKETS, RAIDS, BATTLES & GUILDS</h2><p>The social systems turn isolated runs into a connected economy.</p></div>
        <div className="docs-grid two">
          <article><h3>MARKETPLACE</h3><p>Adventure and raid loot can be listed. A sale charges 5%, rounded up to at least 1 RF. The seller receives price minus fee; the fee enters the reward pool.</p><code>seller proceeds = price − market fee</code></article>
          <article><h3>FOUR-WALLET RAIDS</h3><p>Four equal entries create the raid pot. Successful payout depends on raw-power contribution and the difficulty multiplier. Failed pots stay in the ecosystem.</p><code>payout = pot × contribution × multiplier</code></article>
          <article><h3>PARTY BATTLES</h3><p>Roles, equipment, composition, potions, and optional wagers create competitive item utility. RF wagers redistribute RF between players rather than feeding the pool.</p><p>Every match randomly selects one of eight equally likely arenas: {ARENA_LANDS.join(", ")}. The land stays fixed for the entire fight. Each pet appears in the arena with a health bar that follows attacks, blocks, critical hits, healing, and knockouts.</p></article>
          <article><h3>ARENA EFFICIENCY</h3><p>A pet whose land trait matches the arena gains 10% efficiency. Genesis pets always gain the same 10%, on every land. These bonuses do not stack. The bonus multiplies damage after armor and block, and Support healing, then rounds to the nearest whole HP. Healing cannot exceed maximum HP. Health, defense stats, potion preparation, and wager payouts do not receive an extra multiplier.</p><code>damage / healing = round(base amount × 1.10)</code><p>This rule applies to both sides of party battles. Connected wallets use verified collection identity and on-chain scenery traits. Guest demo pets use preset traits; pets without a known scenery have no land-match bonus. Adventure and raid rules remain as described in their sections.</p></article>
          <article><h3>WATCH THE FIGHT</h3><p>Combat resolves once when you challenge a squad. The arena plays those recorded actions in order. Pause, advance one action, skip to the result, or replay without rerolling the land or consuming potions and settling wagers again. Reduced-motion users begin with playback paused.</p></article>
          <article><h3>GUILD WARS</h3><p>Adventure clears, raids, wins, sales, and preparation produce weekly points. A square-root population adjustment helps smaller guilds compete without erasing scale.</p><code>adjusted = raw × √(largest ÷ members)</code></article>
        </div>
        <div className="docs-callout guild-doc"><b>OPTIONAL GUILD TITHE</b><p>A player may add 0–20% on top of eligible purchases. 80% is recorded for the guild treasury and 20% goes to the global reward pool. The original price and its normal 50/50 split do not change.</p></div>
      </section>

      <section className="docs-section" id="stewardship">
        <div className="docs-heading"><small>06 · OPERATOR GUIDE</small><h2>HOW TO STEER THE SYSTEM</h2><p>The economy should be guided by measured behavior, not by assuming every player behaves the same way.</p></div>
        <div className="docs-grid two">
          <article><h3>WATCH THESE SIGNALS</h3><ul><li>Clear rate and RF profit by tier</li><li>Pool inflow, outflow, and runway</li><li>Paid versus free action frequency</li><li>Gear lifespan, loss rate, and replacement demand</li><li>Rare-item supply and marketplace velocity</li><li>Raid completion and payout concentration</li><li>Guild participation and tithe opt-in</li></ul></article>
          <article><h3>ADJUST IN THIS ORDER</h3><ol><li>Measure real player behavior.</li><li>Set desired player return and pool runway.</li><li>Tune reward ranges.</li><li>Tune entry and action prices.</li><li>Adjust difficulty, loot, and durability carefully.</li><li>Version every economic change.</li></ol></article>
        </div>
        <div className="docs-warnings">
          <article><b>POOL RISK</b><p>Entry contributions alone cover mean rewards only around a 23–27% clear rate. Shops, actions, raids, fees, and tithes matter to runway.</p></article>
          <article><b>VALUE LEAKAGE</b><p>Generous free-path clears or abundant permanent loot can reduce future RF demand even when no RF leaves immediately.</p></article>
          <article><b>PRODUCTION GAP</b><p>This is a local prototype. Real deployment needs atomic settlement, escrow, authorization, anti-sybil controls, moderation, and auditable accounting.</p></article>
        </div>
      </section>

      <section className="docs-next">
        <span><small>READY TO SEE IT IN MOTION?</small><b>FOLLOW THE VALUE THROUGH THE GAME.</b></span>
        <div><button onClick={() => go("dungeons")}>START AN ADVENTURE <ChevronRight /></button><button onClick={() => go("guild_wars")}>VIEW GUILD WARS <ChevronRight /></button></div>
      </section>
    </section>
  );
}
function GuildHome(
  { player, join, setTithe, openWars, go }: {
    player: Player;
    join: (guildId: string) => void;
    setTithe: (percent: number) => void;
    openWars: () => void;
    go: (page: Page) => void;
  },
) {
  const guild = GUILDS.find((entry) => entry.id === player.guildId),
    [message, setMessage] = useState(""),
    [messages, setMessages] = useState([{
      who: "rootkeeper.eth",
      text: "Focus high-tier clears before the weekend multiplier window.",
    }, {
      who: "starling.eth",
      text:
        "I can anchor a Mythic raid group tonight. Need support and defender roles.",
    }, {
      who: "tidekeeper.eth",
      text: "Save consumables for Reading—our completion gap is there.",
    }]),
    tithe = player.tithePercent || 0;
  if (!guild) {
    return (
      <section className="page guild-home-page">
        <div className="page-title">
          <span>GUILDS</span>
          <h1>FIND YOUR PEOPLE.</h1>
          <p>
            Choose one guild for this weekly cycle. Your clears, battles, sales,
            and preparation will strengthen its war score.
          </p>
        </div>
        <div className="guild-join-title">
          <span>CHOOSE ONCE FOR THIS WAR</span>
          <h2>JOIN ONE OF FOUR GUILDS</h2>
          <p>Membership locks until the next Monday reset.</p>
        </div>
        <div className="guild-grid">
          {GUILDS.map((entry) => (
            <article key={entry.id} style={{ background: entry.color }}>
              <i>{entry.emblem}</i>
              <small>{entry.members} MEMBERS</small>
              <h3>{entry.name}</h3>
              <p>{entry.motto}</p>
              <button
                onClick={() =>
                  join(entry.id)}
              >
                JOIN {entry.name.toUpperCase()} <ChevronRight />
              </button>
            </article>
          ))}
        </div>
      </section>
    );
  }
  const example = titheAmount(100, player),
    guildShare = titheGuildShare(example),
    poolShare = tithePoolShare(example),
    treasury = guild.members * 22 + (player.guildTithe || 0),
    send = () => {
      const text = message.trim();
      if (!text) return;
      setMessages((current) => [...current, { who: "you", text }]);
      setMessage("");
    };
  return (
    <section className="page guild-home-page">
      <div className="guild-detail-hero" style={{ background: guild.color }}>
        <i>{guild.emblem}</i>
        <span>
          <small>YOUR GUILD · {guild.members + 1} MEMBERS</small>
          <h1>{guild.name}</h1>
          <p>{guild.motto}</p>
        </span>
        <button onClick={openWars}>
          VIEW GUILD WAR <ChevronRight />
        </button>
      </div>
      <div className="guild-detail-grid">
        <section className="guild-overview">
          <div className="battle-heading">
            <h2>GUILD HALL</h2>
            <b>WEEKLY CYCLE</b>
          </div>
          <div className="guild-treasury">
            <div>
              <small>GUILD TREASURY</small>
              <b>{treasury.toLocaleString()} $RF</b>
              <span>
                Your recorded contribution:{" "}
                {(player.guildTithe || 0).toLocaleString()} $RF
              </span>
            </div>
            <div>
              <small>GLOBAL REWARD POOL</small>
              <b>{player.pool.toLocaleString()} $RF</b>
              <span>Tithes support both guild and global rewards.</span>
            </div>
          </div>
          <div className="guild-goals">
            <h3>THIS WEEK'S STRATEGY</h3>
            <article>
              <b>01</b>
              <span>
                <strong>READING CLEAR PUSH</strong>
                <small>Complete Tier 7 adventures for 84 points each.</small>
              </span>
              <em>68%</em>
            </article>
            <article>
              <b>02</b>
              <span>
                <strong>MYTHIC RAID NIGHT</strong>
                <small>
                  Build four-role teams for maximum composition power.
                </small>
              </span>
              <em>3 / 5</em>
            </article>
            <article>
              <b>03</b>
              <span>
                <strong>PARTY BATTLE HOLD</strong>
                <small>Defenders and Supports needed in waiting squads.</small>
              </span>
              <em>41 WINS</em>
            </article>
          </div>
          <div className="guild-tithe">
            <div>
              <span>
                <small>OPTIONAL PURCHASE TITHE</small>
                <h3>{tithe}% ON TOP</h3>
              </span>
              <b>80% GUILD · 20% GLOBAL</b>
            </div>
            <p>
              Choose what percentage is added to eligible RF purchases. The
              original item or entry price never changes; the tithe is an
              additional contribution.
            </p>
            <div className="tithe-options">
              {[0, 1, 2, 5, 10, 15, 20].map((percent) => (
                <button
                  key={percent}
                  data-active={tithe === percent || undefined}
                  onClick={() => setTithe(percent)}
                >
                  {percent}%
                </button>
              ))}
            </div>
            <div className="tithe-example">
              <span>ON A 100 $RF PURCHASE</span>
              <b>PAY {100 + example} $RF TOTAL</b>
              <em>{guildShare} guild · {poolShare} global</em>
            </div>
          </div>
        </section>
        <section className="guild-chat">
          <div className="battle-heading">
            <h2>STRATEGY CHAT</h2>
            <b>{guild.members + 1} MEMBERS</b>
          </div>
          <div className="chat-feed">
            {messages.map((entry, index) => (
              <article key={index} data-you={entry.who === "you" || undefined}>
                <i>{entry.who.slice(0, 1).toUpperCase()}</i>
                <span>
                  <small>{entry.who} · now</small>
                  <p>{entry.text}</p>
                </span>
              </article>
            ))}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Share a strategy with your guild…"
              maxLength={180}
            />
            <button type="submit" disabled={!message.trim()}>SEND</button>
          </form>
          <p className="chat-note">
            Prototype chat is local. Production requires wallet authentication,
            moderation, persistence, and guild-only access controls.
          </p>
        </section>
      </div>
      <GuildActions go={go} />
    </section>
  );
}
function GuildWars(
  { player, openGuild, go }: {
    player: Player;
    openGuild: () => void;
    go: (page: Page) => void;
  },
) {
  const largest = Math.max(
      ...GUILDS.map((guild) =>
        guild.members + (player.guildId === guild.id ? 1 : 0)
      ),
    ),
    points = player.warPoints || 0,
    standings = GUILDS.map((guild) => {
      const members = guild.members + (player.guildId === guild.id ? 1 : 0),
        raw = guild.score + (player.guildId === guild.id ? points : 0),
        multiplier = Math.sqrt(largest / members),
        adjusted = Math.round(raw * multiplier);
      return { ...guild, members, raw, multiplier, adjusted };
    }).sort((a, b) => b.adjusted - a.adjusted),
    currentGuild = standings.find((guild) => guild.id === player.guildId),
    weekEnd = useMemo(() => {
      const date = new Date(),
        days = (8 - date.getDay()) % 7 || 7,
        end = new Date(date);
      end.setDate(date.getDate() + days);
      end.setHours(0, 0, 0, 0);
      return end;
    }, []),
    remaining = Math.max(0, weekEnd.getTime() - Date.now()),
    days = Math.floor(remaining / 86400000),
    hours = Math.floor(remaining % 86400000 / 3600000);
  return (
    <section className="page guild-page">
      <div className="guild-hero">
        <div>
          <span>WEEKLY GUILD WAR</span>
          <h1>EVERY CLEAR COUNTS.</h1>
          <p>
            Join one guild and contribute across the whole game. Difficult
            adventures and raids carry the most weight.
          </p>
        </div>
        <div className="guild-clock">
          <small>WAR ENDS IN</small>
          <b>{days}D {hours}H</b>
          <span>Scores reset every Monday</span>
        </div>
      </div>
      {currentGuild
        ? (
          <div
            className="guild-membership"
            style={{ background: currentGuild.color }}
          >
            <i>{currentGuild.emblem}</i>
            <span>
              <small>YOUR GUILD · LOCKED FOR THIS WAR</small>
              <h2>{currentGuild.name}</h2>
              <p>{currentGuild.motto}</p>
            </span>
            <div>
              <small>YOUR CONTRIBUTION</small>
              <b>{points.toLocaleString()} PTS</b>
            </div>
          </div>
        )
        : (
          <div className="guild-war-join">
            <b>JOIN A GUILD TO CONTRIBUTE</b>
            <span>
              You can inspect the standings now, but weekly points only accrue
              after choosing a guild.
            </span>
            <button className="primary" onClick={openGuild}>
              CHOOSE A GUILD <ChevronRight />
            </button>
          </div>
        )}
      {currentGuild && <GuildActions go={go} compact />}
      <div className="guild-war-layout">
        <section className="guild-standings">
          <div className="battle-heading">
            <h2>LIVE STANDINGS</h2>
            <b>SIZE ADJUSTED</b>
          </div>
          <div>
            {standings.map((guild, index) => (
              <article
                key={guild.id}
                data-yours={guild.id === player.guildId || undefined}
              >
                <strong>0{index + 1}</strong>
                <i style={{ background: guild.color }}>{guild.emblem}</i>
                <span>
                  <small>
                    {guild.members} MEMBERS{" "}
                    {guild.id === player.guildId ? "· YOUR GUILD" : ""}
                  </small>
                  <b>{guild.name}</b>
                  <em>
                    RAW {guild.raw.toLocaleString()}{" "}
                    · ×{guild.multiplier.toFixed(2)} SIZE ADJUSTMENT
                  </em>
                </span>
                <div>
                  <small>WAR SCORE</small>
                  <b>{guild.adjusted.toLocaleString()}</b>
                </div>
              </article>
            ))}
          </div>
          <p className="guild-formula">
            ADJUSTED SCORE = RAW GUILD SCORE × √(LARGEST GUILD MEMBERS ÷ GUILD
            MEMBERS)
          </p>
        </section>
        <section className="guild-scoring">
          <div className="battle-heading">
            <h2>HOW TO CONTRIBUTE</h2>
            <b>THIS WEEK</b>
          </div>
          <div className="score-actions">
            <article>
              <b>1–96</b>
              <span>
                <strong>ADVENTURE CLEAR</strong>
                <small>Tier × 12 points. Higher tiers matter more.</small>
              </span>
            </article>
            <article>
              <b>45–152</b>
              <span>
                <strong>DUNGEON RAID CLEAR</strong>
                <small>Difficulty plus dungeon depth determines points.</small>
              </span>
            </article>
            <article>
              <b>20</b>
              <span>
                <strong>PARTY BATTLE WIN</strong>
                <small>Draws award 5 points.</small>
              </span>
            </article>
            <article>
              <b>3</b>
              <span>
                <strong>MARKETPLACE SALE</strong>
                <small>Completed player-to-player sale.</small>
              </span>
            </article>
            <article>
              <b>1</b>
              <span>
                <strong>PREPARE GEAR</strong>
                <small>Each shop purchase supports the war effort.</small>
              </span>
            </article>
          </div>
          <div className="guild-activity">
            <small>RECENT WAR ACTIVITY</small>
            <p>
              <span>›</span> starling.eth cleared Mythic Orbital <b>+144</b>
            </p>
            <p>
              <span>›</span> tidekeeper.eth cleared Tier 7 Reading <b>+84</b>
            </p>
            <p>
              <span>›</span> rootclub.eth won a party battle <b>+20</b>
            </p>
            {points > 0 && (
              <p>
                <span>›</span> Your account contributed this week{" "}
                <b>+{points}</b>
              </p>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
function GuildActions(
  { go, compact = false }: {
    go: (page: Page) => void;
    compact?: boolean;
  },
) {
  const actions: Array<{
    label: string;
    reward: string;
    detail: string;
    page: Page;
  }> = [
    { label: "GO ADVENTURING", reward: "UP TO 96 PTS", detail: "Clear higher tiers to make the biggest weekly impact.", page: "dungeons" },
    { label: "JOIN A RAID", reward: "UP TO 152 PTS", detail: "Build a four-role party and take on a dungeon raid.", page: "raids" },
    { label: "ENTER BATTLE", reward: "20 PTS / WIN", detail: "Queue your active Friend for a party battle.", page: "battle" },
    { label: "VISIT MARKET", reward: "3 PTS / SALE", detail: "List adventure loot and score when another player buys.", page: "market" },
  ];
  return (
    <section className="guild-actions" data-compact={compact || undefined}>
      <div className="guild-actions-heading">
        <span>
          <small>CALL TO ADVENTURE</small>
          <h2>CHOOSE YOUR NEXT MOVE</h2>
        </span>
        <p>Every action below can move your guild up the weekly standings.</p>
      </div>
      <div className="guild-action-grid">
        {actions.map((action, index) => (
          <button key={action.page} onClick={() => go(action.page)}>
            <b>0{index + 1}</b>
            <span>
              <small>{action.reward}</small>
              <strong>{action.label}</strong>
              <em>{action.detail}</em>
            </span>
            <ChevronRight />
          </button>
        ))}
      </div>
    </section>
  );
}
function Friends(
  { player, select, venture }: {
    player: Player;
    select: (id: string) => void;
    venture: () => void;
  },
) {
  return (
    <section className="page">
      <div className="page-title">
        <span>YOUR PARTY</span>
        <h1>CHOOSE YOUR FRIEND.</h1>
        <p>
          Every Friend keeps a separate inventory. Death only takes what that
          Friend carries.
        </p>
      </div>
      <div className="friend-grid">
        {player.friends.map((f) => (
          <article
            data-selected={f.id === player.selectedId || undefined}
            key={f.id}
          >
            <div className="friend-select">
              <FriendFace friend={f} />
              <span>
                <small>
                  {f.collection}{" "}
                  {f.collection !== "Genesis" ? `· GEN ${f.generation}` : ""}
                </small>
                <b>{f.name}</b>
                <em>{f.family} family</em>
                <em>{f.collection === "Genesis" ? "+10% in every arena" : petLand(f) ? `${petLand(f)} · +10% on matching land` : "Scenery unknown · no land bonus"}</em>
              </span>
              <div className="friend-actions">
                <button
                  className="select-friend"
                  onClick={() => select(f.id)}
                >
                  {f.id === player.selectedId ? "SELECTED" : "SELECT"}
                </button>
                {f.id === player.selectedId && (
                  <button className="venture" onClick={venture}>
                    VENTURE WITH {f.name.toUpperCase()} <ChevronRight />
                  </button>
                )}
              </div>
            </div>
            <div className="friend-stats">
              <span>
                <small>RUNS</small>
                <b>{f.runs}</b>
              </span>
              <span>
                <small>CLEARS</small>
                <b>{f.wins}</b>
              </span>
              <span>
                <small>ITEMS</small>
                <b>{f.inventory.length}</b>
              </span>
              <span>
                <small>RF EARNED</small>
                <b>{f.earnedRf || 0}</b>
              </span>
              <span>
                <small>RF SPENT</small>
                <b>{f.spentRf || 0}</b>
              </span>
            </div>
            <div className="friend-inventory">
              <h3>
                <Backpack /> INVENTORY
              </h3>
              {f.inventory.length
                ? (
                  <div>
                    {f.inventory.map((i) => (
                      <span key={i.id} title={i.name}>
                        <b>
                          <ItemVisual item={i} />
                        </b>
                        <small>{i.name}</small>
                        <em>{i.uses}/{i.maxUses}</em>
                      </span>
                    ))}
                  </div>
                )
                : <p>Nothing equipped yet.</p>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
function Dungeons({
  selected,
  setSelected,
  start,
  player,
  friend,
  change,
}: {
  selected: Dungeon;
  setSelected: (d: Dungeon) => void;
  start: (d: Dungeon) => void;
  player: Player;
  friend: Friend;
  change: (id: string) => void;
}) {
  const [mobileDetail, setMobileDetail] = useState(false),
    entryTithe = titheAmount(selected.cost, player),
    entryTotal = selected.cost + entryTithe,
    safeBudget = entryTotal + selected.rooms * 7,
    entryShare = player.rf ? entryTotal / player.rf : 1,
    budgetRisk = player.rf >= entryTotal &&
      (entryShare >= .6 || player.rf < safeBudget);
  const chooseJourney = (d: Dungeon) => {
    setSelected(d);
    setMobileDetail(true);
  };
  return (
    <section
      className="page adventures-page"
      data-mobile-detail={mobileDetail || undefined}
    >
      <div className="active-banner">
        <FriendFace friend={friend} />
        <span>
          <small>ENTERING AS</small>
          <b>{friend.name}</b>
          <em>{friend.inventory.length} items equipped</em>
        </span>
        <label className="friend-picker">
          <small>CHANGE FRIEND</small>
          <select value={friend.id} onChange={(e) => change(e.target.value)}>
            {player.friends.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="page-title">
        <span>CHOOSE YOUR JOURNEY</span>
      </div>
      <button
        className="mobile-journey-back"
        onClick={() => setMobileDetail(false)}
      >
        ← ALL JOURNEYS
      </button>
      <div className="dungeon-layout">
        <div className="dungeon-list">
          {DUNGEONS.map((d) => (
            <button
              key={d.tier}
              onClick={() => chooseJourney(d)}
              data-active={selected.tier === d.tier || undefined}
            >
              <b>0{d.tier}</b>
              <span>
                <strong>{d.name}</strong>
                <small>{d.subtitle}</small>
              </span>
              <em>{d.cost + titheAmount(d.cost, player)} $RF</em>
              <ChevronRight />
            </button>
          ))}
        </div>
        <div className="dungeon-detail">
          <div className="detail-art">
            <LandScene dungeon={selected} />
            <span>TIER {selected.tier} · {selected.risk}</span>
          </div>
          <div className="detail-copy">
            <span>THE JOURNEY</span>
            <h2>{selected.name}</h2>
            <p>
              {selected.subtitle}. Every trail brings new choices, surprises,
              and rewards.
            </p>
            <dl>
              <div>
                <dt>ROOMS</dt>
                <dd>{selected.rooms}</dd>
              </div>
              <div>
                <dt>ENTRY</dt>
                <dd>{entryTotal} $RF</dd>
              </div>
              <div>
                <dt>REWARD</dt>
                <dd>{selected.reward} $RF</dd>
              </div>
            </dl>
            {budgetRisk && (
              <div className="budget-warning">
                <b>LOW COMPLETION BUDGET</b>
                <span>
                  Entry uses{" "}
                  {Math.round(entryShare * 100)}% of your balance. A safer run
                  may need about {safeBudget}{" "}
                  $RF including entry, so you may run out before the final room.
                </span>
              </div>
            )}
            <button
              className="primary full"
              disabled={player.rf < entryTotal}
              onClick={() => start(selected)}
            >
              ENTER WITH {friend.name.toUpperCase()} · {entryTotal} $RF{" "}
              <ChevronRight />
            </button>
            <small className="warning">
              ☠ DEATH CLEARS {friend.name.toUpperCase()}'S INVENTORY
            </small>
          </div>
        </div>
      </div>
    </section>
  );
}
function WagerLabel({ wager }: { wager: BattleWager }) {
  if (wager.type === "rf") {
    return (
      <span className="wager-label wager-rf">
        <Coins /> WAGER {wager.min}–{wager.max} $RF EACH
      </span>
    );
  }
  if (wager.type === "item") {
    return (
      <span className="wager-label wager-item">
        <ItemVisual item={wager.item} /> WAGER {wager.rarity} ITEM ·{" "}
        {wager.item.name}
      </span>
    );
  }
  return <span className="wager-label">NO WAGER · FRIENDLY BATTLE</span>;
}
// Feet stay inside the same central ellipse used by adventure roaming.
function battleRoamPosition(side: BattleUnit["side"], index: number, count: number) {
  const x = count > 2 ? (side === "player" ? 31 : 57) + (index % 2) * 12 : side === "player" ? 35 : 65,
    y = count === 1 ? 55 : 49 + (count > 2 ? Math.floor(index / 2) : index) * 12;
  return { x, y };
}
function RoamingBattlePet({ unit, index, count, moving, step, acting, hit, healed }: {
  unit: BattleUnit; index: number; count: number; moving: boolean; step: number;
  acting: boolean; hit: boolean; healed: boolean;
}) {
  const [position, setPosition] = useState(() => battleRoamPosition(unit.side, index, count)),
    [facing, setFacing] = useState(unit.side === "player" ? 1 : -1);
  useEffect(() => {
    if (!moving) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: number | undefined;
    const roam = () => {
      const home = battleRoamPosition(unit.side, index, count),
        angle = Math.random() * Math.PI * 2, radius = Math.sqrt(Math.random()),
        x = home.x + Math.cos(angle) * radius * (count === 1 ? 8 : 1.8),
        y = home.y + Math.sin(angle) * radius * (count === 1 ? 5 : .6);
      setPosition((previous) => {
        setFacing(x < previous.x ? -1 : 1);
        return { x, y };
      });
    };
    const update = () => {
      window.clearInterval(timer);
      if (!media.matches) { roam(); timer = window.setInterval(roam, 2800); }
    };
    update();
    media.addEventListener("change", update);
    return () => { window.clearInterval(timer); media.removeEventListener("change", update); };
  }, [moving, unit.side, index, count]);
  return (
    <div className="arena-pet" data-side={unit.side} tabIndex={0}
      aria-label={`${unit.name}, ${unit.hp}/${unit.maxHp} HP${unit.efficiency > 1 ? ", plus 10% efficiency" : ""}`}
      data-down={unit.hp === 0 || undefined} data-acting={acting || undefined}
      data-hit={hit || undefined} data-healed={healed || undefined}
      style={{ left: `${position.x}%`, top: `${position.y}%` }}>
      <div className="arena-health">
        <span>{unit.name} · {unit.hp}/{unit.maxHp} HP{unit.efficiency > 1 ? " · +10%" : ""}</span>
        <div role="progressbar" aria-label={`${unit.name} health`} aria-valuemin={0} aria-valuemax={unit.maxHp} aria-valuenow={unit.hp}>
          <i style={{ width: `${unit.hp / unit.maxHp * 100}%` }} />
        </div>
      </div>
      <div className="arena-sprite" key={`${unit.id}-${step}`}>
        <img style={{ transform: `scaleX(${facing})` }} src={publicAsset(unit.spriteUrl ?? "/friend-walk-sprite.svg")} alt="" />
      </div>
    </div>
  );
}

function BattleReplay({ result, onClose }: { result: BattleResult; onClose: () => void }) {
  const [step, setStep] = useState(0),
    [playing, setPlaying] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches),
    frame = result.frames[step],
    finished = step === result.frames.length - 1;
  useEffect(() => {
    if (!playing || finished) return;
    const timer = window.setTimeout(() => setStep((current) => Math.min(current + 1, result.frames.length - 1)), 850);
    return () => window.clearTimeout(timer);
  }, [playing, finished, step, result]);
  const advance = () => { setPlaying(false); setStep((current) => Math.min(current + 1, result.frames.length - 1)); };
  return (
    <section className="page battle-page">
      <button className="battle-back" onClick={onClose}>← BATTLE BROWSER</button>
      <div className={`battle-result ${finished ? result.winner : "playing"}`}>
        <span>{finished ? result.winner === "player" ? "VICTORY" : result.winner === "enemy" ? "DEFEAT" : "DRAW" : "PARTY BATTLE"}</span>
        <h1>{finished ? result.winner === "player" ? "YOUR PARTY PREVAILED." : result.winner === "enemy" ? "THE WAITING SQUAD WON." : "NO SQUAD YIELDED." : `${result.arena.toUpperCase()} ARENA`}</h1>
        {finished && result.settlement && <p className="arena-settlement">{result.settlement}</p>}
        <p className="arena-rule">Matching land or Genesis · +10% damage and healing</p>
        <div className="battle-arena" data-team-size={result.player.length}>
          <LandScene dungeon={{ scenery: result.arena }}>
            {frame.units.map((unit) => {
              const team = frame.units.filter((pet) => pet.side === unit.side);
              return <RoamingBattlePet key={unit.id} unit={unit}
                index={team.findIndex((pet) => pet.id === unit.id)} count={team.length}
                moving={playing && !finished && unit.hp > 0} step={step}
                acting={frame.actorId === unit.id}
                hit={frame.targetId === unit.id && frame.kind === "attack"}
                healed={frame.targetId === unit.id && frame.kind === "heal"} />;
            })}
          </LandScene>
        </div>
        <p className="arena-event" role="status" aria-live="polite">{frame.message}</p>
        <div className="arena-controls">
          <button onClick={() => { if (finished) setStep(0); setPlaying((current) => finished ? true : !current); }}>
            {finished ? "REPLAY" : playing ? "PAUSE" : "PLAY"}
          </button>
          <button onClick={advance} disabled={finished}>NEXT ACTION</button>
          <button onClick={() => { setPlaying(false); setStep(result.frames.length - 1); }} disabled={finished}>SHOW RESULT</button>
          <span>{step}/{result.frames.length - 1} ACTIONS</span>
        </div>
        <div className="battle-survivors arena-rosters">
          {(["player", "enemy"] as const).map((side) => (
            <div key={side}>
              <small>{side === "player" ? "YOUR PARTY" : "OPPONENT"}</small>
              {frame.units.filter((unit) => unit.side === side).map((unit) => (
                <div className="arena-roster-pet" key={unit.id}>
                  <b data-down={unit.hp === 0 || undefined}>{unit.name} · {unit.hp}/{unit.maxHp} HP</b>
                  <span>{unit.role} · {unit.collection === "Genesis" ? "Genesis · +10% on every land" : `${unit.land ?? "Land unknown"} · ${unit.efficiency > 1 ? "+10% land match" : "no arena bonus"}`}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="battle-terminal">
          <div><i /><i /><i /><b>AUTO-BATTLE LOG</b></div>
          {result.log.slice(0, frame.logCount).map((line, index) => <p key={index}><span>›</span> {line}</p>)}
        </div>
        {finished && <button className="primary" onClick={onClose}>FIND ANOTHER BATTLE</button>}
      </div>
    </section>
  );
}

function Battle(
  { player, assignRole, consumePotions, settleWager }: {
    player: Player;
    assignRole: (id: string, role: BattleRole) => void;
    consumePotions: (loadout: BattlePotion[]) => void;
    settleWager: (
      outcome: BattleResult["winner"],
      wager: BattleWager,
      amount: number,
      stake?: ItemStake,
    ) => void;
  },
) {
  const [selected, setSelected] = useState<string[]>([player.selectedId]),
    [potionKeys, setPotionKeys] = useState<string[]>([]),
    [result, setResult] = useState<BattleResult | null>(null),
    [listed, setListed] = useState<WaitingSquad | null>(null),
    [wagerType, setWagerType] = useState<BattleWager["type"]>("none"),
    [rfRange, setRfRange] = useState({ min: 10, max: 25 }),
    [listedItemKey, setListedItemKey] = useState(""),
    [challengeRf, setChallengeRf] = useState<Record<string, number>>({}),
    [challengeItems, setChallengeItems] = useState<Record<string, string>>({}),
    party = player.friends.filter((f) => selected.includes(f.id)),
    wagerItems: ItemStake[] = party.flatMap((friend) =>
      battleGear(friend).map((item) => ({ ownerId: friend.id, item }))
    ),
    availablePotions: BattlePotion[] = party.flatMap((friend) =>
      friend.inventory.map((item, index) => ({
        key: `${friend.id}:${index}`,
        ownerId: friend.id,
        item,
      })).filter((x) => x.item.kind === "potion")
    ),
    loadout = availablePotions.filter((x) => potionKeys.includes(x.key)),
    waiting = [...(listed ? [listed] : []), ...WAITING_SQUADS].filter((s) =>
      s.size === party.length
    ),
    toggle = (id: string) => {
      setSelected((ids) =>
        ids.includes(id)
          ? ids.filter((x) => x !== id)
          : ids.length < 4
          ? [...ids, id]
          : ids
      );
      setPotionKeys([]);
    },
    togglePotion = (key: string) =>
      setPotionKeys((keys) =>
        keys.includes(key)
          ? keys.filter((x) => x !== key)
          : keys.length < 3
          ? [...keys, key]
          : keys
      ),
    fight = (squad: WaitingSquad) => {
      const amount = squad.wager.type === "rf"
          ? (challengeRf[squad.id] ?? squad.wager.min)
          : 0,
        stake = squad.wager.type === "item"
          ? matchingItemStakes(wagerItems, squad.wager).find((entry) =>
            entry.item.id === challengeItems[squad.id]
          )
          : undefined;
      if (squad.wager.type === "rf" && player.rf < amount) return;
      if (squad.wager.type === "item" && !stake) return;
      const nextResult = simulateBattle(
        party,
        squad,
        loadout.map((x) => x.item),
      );
      nextResult.settlement = nextResult.winner === "draw"
        ? "Draw · wager returned."
        : squad.wager.type === "none"
        ? "Friendly battle · no wager."
        : squad.wager.type === "rf"
        ? `${nextResult.winner === "player" ? "Won" : "Lost"} ${amount} $RF.`
        : `${nextResult.winner === "player" ? "Won" : "Lost"} ${nextResult.winner === "player" ? squad.wager.item.name : stake!.item.name}.`;
      setResult(nextResult);
      consumePotions(loadout);
      settleWager(nextResult.winner, squad.wager, amount, stake);
      setPotionKeys([]);
    },
    publish = () => {
      if (!party.length) return;
      const units = party.map(battleStats),
        power = Math.max(
          1,
          Math.round(
            units.reduce(
              (n, u) => n + u.attack + u.armor + u.block + u.maxHp / 5,
              0,
            ) / units.length,
          ),
        );
      const selectedStake = wagerItems.find((entry) =>
          entry.item.id === listedItemKey
        ),
        wager: BattleWager = wagerType === "rf"
          ? {
            type: "rf",
            min: Math.max(1, rfRange.min),
            max: Math.max(rfRange.min, rfRange.max),
          }
          : wagerType === "item" && selectedStake
          ? {
            type: "item",
            item: selectedStake.item,
            rarity: itemRarity(selectedStake.item),
          }
          : { type: "none" };
      if (wagerType === "item" && !selectedStake) return;
      setListed({
        id: "your-defense",
        owner: "YOUR WAITING SQUAD",
        rating: 1000,
        size: party.length,
        roles: party.map((f) => f.role ?? "fighter"),
        power,
        members: party.map((f) => f.name),
        pets: units.map(({ collection, land, spriteUrl, color }) => ({ collection, land, spriteUrl, color })),
        isOwn: true,
        wager,
      });
    };
  if (result) {
    return <BattleReplay result={result} onClose={() => setResult(null)} />;
  }
  return (
    <section className="page battle-page">
      <div className="page-title">
        <span>AUTO-BATTLER</span>
        <h1>BUILD YOUR PARTY.</h1>
        <p>
          Assign roles, prepare potions, and challenge an equally sized squad.
          Equipment earned in adventures determines combat stats. Each fight draws one of eight arena lands: matching pets and all Genesis pets gain 10% damage and healing.
        </p>
      </div>
      <div className="battle-builder">
        <section>
          <div className="battle-heading">
            <h2>YOUR FORMATION</h2>
            <b>{party.length}/4 FRIENDS</b>
          </div>
          <div className="battle-party">
            {player.friends.map((friend) => {
              const stats = battleStats(friend),
                active = selected.includes(friend.id),
                gear = battleGear(friend);
              return (
                <article key={friend.id} data-active={active || undefined}>
                  <button
                    className="battle-friend"
                    onClick={() => toggle(friend.id)}
                  >
                    <FriendFace friend={friend} />
                    <span>
                      <small>{active ? "IN FORMATION" : "AVAILABLE"}</small>
                      <b>{friend.name}</b>
                      <small>{friend.collection === "Genesis" ? "GENESIS · +10% IN EVERY ARENA" : petLand(friend) ? `${petLand(friend)} · +10% ON MATCH` : "LAND UNKNOWN · NO MATCH BONUS"}</small>
                      <em>
                        ATK {stats.attack} · ARM {stats.armor} · BLK{" "}
                        {stats.block}
                      </em>
                    </span>
                  </button>
                  <div className="battle-equipment">
                    <small>EQUIPPED GEAR</small>
                    {gear.length
                      ? (
                        <div>
                          {gear.map((item) => (
                            <span
                              key={item.id}
                              title={`${item.name} · ${item.desc}`}
                            >
                              <i>
                                <ItemVisual item={item} />
                              </i>
                              <b>{item.name}</b>
                              <em>
                                +{item.power} {item.kind === "weapon"
                                  ? "ATK"
                                  : item.kind === "armor"
                                  ? "GUARD"
                                  : "BLOCK"}
                              </em>
                            </span>
                          ))}
                        </div>
                      )
                      : <p>NO GEAR EQUIPPED</p>}
                  </div>
                  <label>
                    <small>FIGHTING TYPE</small>
                    <select
                      value={friend.role ?? "fighter"}
                      onChange={(e) =>
                        assignRole(friend.id, e.target.value as BattleRole)}
                    >
                      {BATTLE_ROLES.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p>
                    {BATTLE_ROLES.find((r) =>
                      r.id === (friend.role ?? "fighter")
                    )?.copy}
                  </p>
                </article>
              );
            })}
          </div>
          <div className="composition-preview">
            <h3>ACTIVE COMPOSITION</h3>
            {party.length
              ? (() => {
                const preview = party.map(battleStats),
                  bonuses = composition(preview);
                return bonuses.length
                  ? bonuses.map((x) => <span key={x}>{x}</span>)
                  : (
                    <p>
                      Add complementary or matching roles to activate bonuses.
                    </p>
                  );
              })()
              : <p>Select at least one Friend.</p>}
          </div>
          <div className="battle-potions">
            <div>
              <span>
                <Backpack />
                <b>BATTLE POTIONS</b>
              </span>
              <small>{loadout.length}/3 PREPARED</small>
            </div>
            {availablePotions.length
              ? (
                <div className="battle-potion-grid">
                  {availablePotions.map((p) => (
                    <button
                      key={p.key}
                      data-active={potionKeys.includes(p.key) || undefined}
                      onClick={() => togglePotion(p.key)}
                    >
                      <i>
                        <ItemVisual item={p.item} />
                      </i>
                      <span>
                        <b>{p.item.name}</b>
                        <small>{p.item.desc.split(" · ")[1]}</small>
                        <em>
                          {player.friends.find((f) => f.id === p.ownerId)?.name}
                        </em>
                      </span>
                    </button>
                  ))}
                </div>
              )
              : (
                <p>
                  Selected Friends have no potions. Buy or find potions to
                  prepare up to three for the next battle.
                </p>
              )}
            <small className="potion-note">
              Prepared potions are consumed when you start a battle.
            </small>
          </div>
        </section>
        <section>
          <div className="defense-squad">
            <div className="battle-heading">
              <h2>YOUR WAITING SQUAD</h2>
              <b>{listed ? "LISTED" : "NOT LISTED"}</b>
            </div>
            {listed
              ? (
                <div className="defense-summary">
                  <small>DEFENDING · {listed.size}v{listed.size}</small>
                  <b>{listed.members?.join(" · ")}</b>
                  <span>
                    {listed.roles.map((r) => r.toUpperCase()).join(" · ")}{" "}
                    · POWER {listed.power}
                  </span>
                  <WagerLabel wager={listed.wager} />
                  <button onClick={() => setListed(null)}>
                    WITHDRAW SQUAD
                  </button>
                </div>
              )
              : (
                <div className="defense-summary">
                  <small>SET A DEFENSE</small>
                  <b>Use your current formation</b>
                  <span>
                    Your Friends can wait for an equal-size challenger while you
                    browse battles.
                  </span>
                  <div className="wager-setup">
                    <label>
                      <small>BATTLE WAGER</small>
                      <select
                        value={wagerType}
                        onChange={(e) =>
                          setWagerType(e.target.value as BattleWager["type"])}
                      >
                        <option value="none">No wager</option>
                        <option value="rf">$RF range</option>
                        <option value="item">Item</option>
                      </select>
                    </label>
                    {wagerType === "rf" && (
                      <div className="rf-range">
                        <label>
                          <small>MINIMUM</small>
                          <input
                            type="number"
                            min="1"
                            max={player.rf}
                            value={rfRange.min}
                            onChange={(e) =>
                              setRfRange((range) => ({
                                ...range,
                                min: Number(e.target.value),
                              }))}
                          />
                        </label>
                        <span>TO</span>
                        <label>
                          <small>MAXIMUM</small>
                          <input
                            type="number"
                            min={rfRange.min}
                            max={player.rf}
                            value={rfRange.max}
                            onChange={(e) =>
                              setRfRange((range) => ({
                                ...range,
                                max: Number(e.target.value),
                              }))}
                          />
                        </label>
                        <p>
                          The challenger chooses the stake inside this range.
                          Both parties add that amount to the pot.
                        </p>
                        {rfRange.max > player.rf && (
                          <div className="wager-warning">
                            <b>UPPER BOUND EXCEEDS WALLET</b>
                            <span>
                              Your {player.rf} $RF balance cannot cover the{" "}
                              {rfRange.max}{" "}
                              $RF maximum. Lower the upper bound to list this
                              squad.
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    {wagerType === "item" && (
                      <label>
                        <small>ITEM AT STAKE</small>
                        <select
                          value={listedItemKey}
                          onChange={(e) => setListedItemKey(e.target.value)}
                        >
                          <option value="">Choose equipped item</option>
                          {wagerItems.map((entry) => (
                            <option key={entry.item.id} value={entry.item.id}>
                              {itemRarity(entry.item)} · {entry.item.name}
                            </option>
                          ))}
                        </select>
                        <p>
                          The challenger must wager an item of the same rarity.
                        </p>
                      </label>
                    )}
                  </div>
                  <button
                    className="primary"
                    disabled={!party.length ||
                      (wagerType === "item" && !listedItemKey) ||
                      (wagerType === "rf" &&
                        (rfRange.min < 1 || rfRange.max < rfRange.min ||
                          rfRange.max > player.rf))}
                    onClick={publish}
                  >
                    LIST THIS SQUAD <ChevronRight />
                  </button>
                </div>
              )}
          </div>
          <div className="waiting-panel">
            <div className="battle-heading">
              <h2>WAITING SQUADS</h2>
              <b>{waiting.length} MATCHES · {party.length}v{party.length}</b>
            </div>
            <div className="battle-browser">
              {waiting.length
                ? waiting.map((squad) => (
                  <article key={squad.id} data-own={squad.isOwn || undefined}>
                    <div>
                      <small>
                        {squad.isOwn
                          ? "YOUR DEFENSE"
                          : `RATING ${squad.rating}`}
                      </small>
                      <b>{squad.owner}</b>
                      <span>
                        {squad.members?.join(" · ") ?? squad.roles.map((r) =>
                          r.toUpperCase()
                        ).join(" · ")}
                      </span>
                    </div>
                    <strong>POWER {squad.power}</strong>
                    <WagerLabel wager={squad.wager} />
                    {!squad.isOwn && squad.wager.type === "rf" && (
                      <label className="challenge-stake">
                        <small>YOUR STAKE · BOTH PARTIES FUND THE POT</small>
                        <input
                          type="range"
                          min={squad.wager.min}
                          max={squad.wager.max}
                          value={challengeRf[squad.id] ?? squad.wager.min}
                          onChange={(e) =>
                            setChallengeRf((values) => ({
                              ...values,
                              [squad.id]: Number(e.target.value),
                            }))}
                        />
                        <b>
                          {challengeRf[squad.id] ?? squad.wager.min}{" "}
                          $RF EACH · POT{" "}
                          {(challengeRf[squad.id] ?? squad.wager.min) * 2} $RF
                        </b>
                        {squad.wager.max > player.rf && (
                          <div className="wager-warning">
                            <b>RANGE EXCEEDS YOUR WALLET</b>
                            <span>
                              The upper bound is {squad.wager.max}{" "}
                              $RF, but you have {player.rf}{" "}
                              $RF. Choose an affordable amount within the range.
                            </span>
                          </div>
                        )}
                      </label>
                    )}
                    {!squad.isOwn && squad.wager.type === "item" && (
                      <label className="challenge-stake">
                        <small>MATCH WITH A {squad.wager.rarity} ITEM</small>
                        <select
                          value={challengeItems[squad.id] ?? ""}
                          onChange={(e) =>
                            setChallengeItems((values) => ({
                              ...values,
                              [squad.id]: e.target.value,
                            }))}
                        >
                          <option value="">Choose matching item</option>
                          {matchingItemStakes(wagerItems, squad.wager).map((
                            entry,
                          ) => (
                            <option key={entry.item.id} value={entry.item.id}>
                              {entry.item.name} ·{" "}
                              {player.friends.find((friend) =>
                                friend.id === entry.ownerId
                              )?.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {squad.isOwn
                      ? <button disabled>AWAITING CHALLENGER</button>
                      : (
                        <button
                          className="primary"
                          disabled={(squad.wager.type === "rf" &&
                            player.rf <
                              (challengeRf[squad.id] ?? squad.wager.min)) ||
                            (squad.wager.type === "item" &&
                              !challengeItems[squad.id])}
                          onClick={() => fight(squad)}
                        >
                          FIGHT <ChevronRight />
                        </button>
                      )}
                  </article>
                ))
                : (
                  <div className="battle-empty">
                    <Swords />
                    <b>NO EQUAL-SIZE SQUADS</b>
                    <p>
                      Select between one and four Friends to browse matching
                      formations.
                    </p>
                  </div>
                )}
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
function Raids(
  { player, settle }: {
    player: Player;
    settle: (friendId: string, fee: number, result: RaidResult) => void;
  },
) {
  const [selectedName, setSelectedName] = useState(RAID_DUNGEONS[0].name),
    [difficulty, setDifficulty] = useState<RaidDifficulty>("EXPEDITION"),
    [friendId, setFriendId] = useState(player.selectedId),
    [queued, setQueued] = useState(false),
    [result, setResult] = useState<RaidResult | null>(null),
    dungeon = RAID_DUNGEONS.find((entry) => entry.name === selectedName)!,
    friend = player.friends.find((entry) => entry.id === friendId) ??
      player.friends[0],
    modifier = RAID_DIFFICULTIES[difficulty],
    fee = Math.round(dungeon.baseFee * modifier.fee),
    raidTithe = titheAmount(fee, player),
    totalEntry = fee + raidTithe,
    requiredPower = Math.round(dungeon.basePower * modifier.power),
    minimumPower = Math.ceil(requiredPower * .18),
    power = raidPower(friend, dungeon.element),
    lobby = raidLobby(dungeon, difficulty),
    projectedPower = lobby.reduce((sum, entrant) => sum + entrant.power, 0) +
      power,
    roles = [...lobby.map((entrant) => entrant.role), friend.role ?? "fighter"],
    diversity = new Set(roles).size,
    compositionBonus = diversity === 4 ? 10 : diversity === 3 ? 6 : 2,
    canEnter = player.rf >= totalEntry && power >= minimumPower;
  const join = () => {
    if (!canEnter || queued) return;
    setQueued(true);
    window.setTimeout(() => {
      const outcome = simulateRaid(dungeon, difficulty, friend, fee);
      settle(friend.id, fee, outcome);
      setResult(outcome);
      setQueued(false);
    }, 850);
  };
  if (result) {
    return (
      <section className="page raid-page">
        <button className="battle-back" onClick={() => setResult(null)}>
          ← RAID BOARD
        </button>
        <div className={`raid-result ${result.success ? "success" : "failed"}`}>
          <span>{result.difficulty} RAID · {result.dungeon}</span>
          <h1>
            {result.success ? "DUNGEON CLEARED." : "THE RAID PARTY FELL."}
          </h1>
          <div className="raid-result-stats">
            <div>
              <small>TEAM POWER</small>
              <b>{result.teamPower} / {result.requiredPower}</b>
            </div>
            <div>
              <small>YOUR CONTRIBUTION</small>
              <b>{(result.contribution * 100).toFixed(1)}%</b>
            </div>
            <div>
              <small>RAID POT</small>
              <b>{result.pot} $RF</b>
            </div>
            <div>
              <small>YOUR PAYOUT</small>
              <b>{result.reward} $RF</b>
            </div>
          </div>
          {result.item && (
            <div className="raid-drop">
              <i>
                <ItemVisual item={result.item} />
              </i>
              <span>
                <small>RAID-EXCLUSIVE DROP</small>
                <b>{result.item.name}</b>
                <em>{result.item.desc}</em>
              </span>
            </div>
          )}
          <div className="battle-terminal">
            <div>
              <i />
              <i />
              <i />
              <b>RAID AUTO-BATTLE LOG</b>
            </div>
            {result.log.map((line, index) => (
              <p key={index}>
                <span>›</span> {line}
              </p>
            ))}
          </div>
          <button className="primary" onClick={() => setResult(null)}>
            RETURN TO RAID BOARD
          </button>
        </div>
      </section>
    );
  }
  return (
    <section className="page raid-page">
      <div className="page-title">
        <span>FOUR-WALLET DUNGEONS</span>
        <h1>RAID AS ONE.</h1>
        <p>
          Join three other wallets, meet the entry power, and combine roles and
          equipment in an automatic dungeon battle. Entry fees form the raid
          pot.
        </p>
      </div>
      <div className="raid-dungeons">
        {RAID_DUNGEONS.map((entry) => (
          <button
            key={entry.name}
            data-active={entry.name === dungeon.name || undefined}
            onClick={() => setSelectedName(entry.name)}
            style={{ background: entry.color }}
          >
            <img src={LAND_ART[entry.scenery as ArenaLand]} alt="" />
            <span>
              <small>{entry.reward} · {ELEMENT_META[entry.element].label}</small>
              <b>{entry.name}</b>
              <em>BASE POWER {entry.basePower}</em>
            </span>
            <ChevronRight />
          </button>
        ))}
      </div>
      <div className="raid-layout">
        <section className="raid-config">
          <div className="battle-heading">
            <h2>RAID CONTRACT</h2>
            <b>{difficulty}</b>
          </div>
          <div className="raid-contract">
            <label>
              <small>DIFFICULTY</small>
              <div className="raid-difficulty">
                {(Object.keys(RAID_DIFFICULTIES) as RaidDifficulty[]).map((
                  level,
                ) => (
                  <button
                    key={level}
                    data-active={difficulty === level || undefined}
                    onClick={() => setDifficulty(level)}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </label>
            <label>
              <small>YOUR ENTRANT</small>
              <select
                value={friend.id}
                onChange={(event) => setFriendId(event.target.value)}
              >
                {player.friends.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name} · {raidPower(entry, dungeon.element)} POWER ·{" "}
                    {(entry.role ?? "fighter").toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
            <div className="raid-requirements">
              <div>
                <small>TEAM REQUIREMENT</small>
                <b>{requiredPower} POWER</b>
              </div>
              <div>
                <small>YOUR MINIMUM</small>
                <b>{minimumPower} POWER</b>
              </div>
              <div>
                <small>YOUR POWER</small>
                <b data-low={power < minimumPower || undefined}>{power}</b>
              </div>
              <div>
                <small>ENTRY</small>
                <b>{totalEntry} $RF</b>
              </div>
            </div>
            {power < minimumPower && (
              <div className="wager-warning">
                <b>MORE POWER REQUIRED</b>
                <span>
                  {friend.name} needs {minimumPower - power}{" "}
                  more power from roles or equipment to enter this difficulty.
                </span>
              </div>
            )}
            {player.rf < totalEntry && (
              <div className="wager-warning">
                <b>INSUFFICIENT $RF</b>
                <span>
                  The {fee} $RF entry plus {raidTithe} $RF tithe is above your
                  {" "}
                  {player.rf} $RF wallet balance.
                </span>
              </div>
            )}
            <div className="raid-exclusive">
              <small>POSSIBLE RARE DROP</small>
              <i>
                <ItemVisual item={RAID_ITEMS[RAID_DUNGEONS.indexOf(dungeon)]} />
              </i>
              <span>
                <b>{RAID_ITEMS[RAID_DUNGEONS.indexOf(dungeon)].name}</b>
                {RAID_ITEMS[RAID_DUNGEONS.indexOf(dungeon)].modifier && (
                  <ElementBadge
                    element={RAID_ITEMS[RAID_DUNGEONS.indexOf(dungeon)].modifier!}
                  />
                )}
                <em>
                  Heroic and Mythic contribution reward · elemental gear is
                  exclusive to rewards and the daily rare shelf
                </em>
              </span>
            </div>
          </div>
        </section>
        <section className="raid-lobby">
          <div className="battle-heading">
            <h2>PARTY QUEUE</h2>
            <b>{queued ? "4/4 · STARTING" : "3/4 WALLETS"}</b>
          </div>
          <div className="raid-slots">
            {lobby.map((entrant, index) => (
              <article key={entrant.wallet}>
                <b>0{index + 1}</b>
                <span>
                  <small>{entrant.wallet}</small>
                  <strong>{entrant.friend}</strong>
                  <em>{entrant.role.toUpperCase()} · {entrant.power} POWER</em>
                </span>
              </article>
            ))}
            <article
              className="your-raid-slot"
              data-ready={canEnter || undefined}
            >
              <b>04</b>
              <span>
                <small>YOUR WALLET</small>
                <strong>{friend.name}</strong>
                <em>
                  {(friend.role ?? "fighter").toUpperCase()} · {power} POWER
                </em>
              </span>
            </article>
          </div>
          <div className="raid-composition">
            <small>PROJECTED RAID PERFORMANCE</small>
            <b>{projectedPower + compositionBonus} / {requiredPower} POWER</b>
            <span>
              Raw {projectedPower} + {compositionBonus} composition ·{" "}
              {diversity}/4 unique roles
            </span>
            <div>
              <i
                style={{
                  width: `${
                    Math.min(
                      100,
                      (projectedPower + compositionBonus) / requiredPower * 100,
                    )
                  }%`,
                }}
              />
            </div>
          </div>
          <div className="raid-pot">
            <Coins />
            <span>
              <small>FOUR-WALLET RAID POT</small>
              <b>{fee * 4} $RF</b>
              <em>
                4 entries × {fee}{" "}
                $RF · payout weighted by contribution and clear
              </em>
            </span>
          </div>
          <button
            className="primary raid-join"
            disabled={!canEnter || queued}
            onClick={join}
          >
            {queued
              ? "FINAL WALLET JOINED · RAID STARTING…"
              : `JOIN QUEUE FOR ${totalEntry} $RF`}{" "}
            {!queued && <ChevronRight />}
          </button>
        </section>
      </div>
    </section>
  );
}
function Marketplace(
  { player, sell, buy }: {
    player: Player;
    sell: (ownerId: string, itemId: string, price: number) => void;
    buy: (item: Item, price: number) => void;
  },
) {
  const [selectedId, setSelectedId] = useState(""),
    [price, setPrice] = useState(20),
    [listings, setListings] = useState<MarketListing[]>([]),
    found = player.friends.flatMap((friend) =>
      friend.inventory.filter((item) =>
        item.origin === "adventure" || item.origin === "raid"
      ).map((item) => ({ ownerId: friend.id, ownerName: friend.name, item }))
    ),
    available = found.filter((entry) =>
      !listings.some((listing) => listing.item.id === entry.item.id)
    ),
    selected = available.find((entry) => entry.item.id === selectedId),
    market: MarketListing[] = [{
      id: "market-1",
      ownerId: "moss.eth",
      ownerName: "moss.eth",
      item: { ...catalogItem("moon-scythe"), origin: "market" },
      price: 78,
    }, {
      id: "market-2",
      ownerId: "tide.eth",
      ownerName: "tide.eth",
      item: { ...catalogItem("tide-mirror"), origin: "market" },
      price: 39,
    }, {
      id: "market-3",
      ownerId: "garden.eth",
      ownerName: "garden.eth",
      item: { ...RAID_ITEMS[0], origin: "market" },
      price: 145,
    }, {
      id: "market-4",
      ownerId: "root.eth",
      ownerName: "root.eth",
      item: { ...catalogItem("sun-crown"), origin: "market" },
      price: 48,
    }];
  const list = () => {
      if (!selected || price < 1) return;
      setListings((
        current,
      ) => [...current, {
        id: `listing-${selected.item.id}`,
        ...selected,
        price,
      }]);
      setSelectedId("");
    },
    completeSale = (listing: MarketListing) => {
      sell(listing.ownerId, listing.item.id, listing.price);
      setListings((current) =>
        current.filter((entry) => entry.id !== listing.id)
      );
    };
  return (
    <section className="page market-page">
      <div className="page-title">
        <span>PLAYER MARKETPLACE</span>
        <h1>TURN FINDS INTO $RF.</h1>
        <p>
          List loot discovered on adventures or earned in raids. Shop purchases
          cannot be relisted as found loot.
        </p>
      </div>
      <div className="market-layout">
        <section className="market-sell">
          <div className="battle-heading">
            <h2>SELL FOUND LOOT</h2>
            <b>5% MARKET FEE</b>
          </div>
          <div className="market-list-form">
            <label>
              <small>CHOOSE DISCOVERED ITEM</small>
              <select
                value={selectedId}
                onChange={(event) => {
                  const id = event.target.value,
                    entry = available.find((candidate) =>
                      candidate.item.id === id
                    );
                  setSelectedId(id);
                  if (entry) setPrice(Math.max(1, entry.item.price));
                }}
              >
                <option value="">Select adventure or raid loot</option>
                {available.map((entry) => (
                  <option key={entry.item.id} value={entry.item.id}>
                    {entry.item.origin?.toUpperCase()} · {entry.item.name} ·
                    {" "}
                    {entry.ownerName}
                  </option>
                ))}
              </select>
            </label>
            {selected
              ? (
                <div className="market-preview">
                  <i>
                    <ItemVisual item={selected.item} />
                  </i>
                  <span>
                    <small>
                      {itemRarity(selected.item)} · {selected.item.origin} loot
                    </small>
                    <b>{selected.item.name}</b>
                    <em>{selected.item.desc}</em>
                  </span>
                </div>
              )
              : (
                <div className="market-no-loot">
                  <Backpack />
                  <span>
                    <b>
                      {found.length
                        ? "CHOOSE AN ITEM TO LIST"
                        : "NO FOUND LOOT AVAILABLE"}
                    </b>
                    <small>
                      {found.length
                        ? "Only unlisted discoveries appear here."
                        : "Complete adventures or raids to discover sellable items."}
                    </small>
                  </span>
                </div>
              )}
            <label>
              <small>ASKING PRICE</small>
              <div className="market-price">
                <input
                  type="number"
                  min="1"
                  value={price}
                  onChange={(event) =>
                    setPrice(Math.max(1, Number(event.target.value)))}
                />
                <b>$RF</b>
              </div>
            </label>
            <div className="market-fee">
              <span>
                SALE PRICE <b>{price} $RF</b>
              </span>
              <span>
                MARKET FEE <b>{Math.max(1, Math.ceil(price * .05))} $RF</b>
              </span>
              <span>
                YOU RECEIVE{" "}
                <b>
                  {Math.max(0, price - Math.max(1, Math.ceil(price * .05)))} $RF
                </b>
              </span>
            </div>
            <button className="primary" disabled={!selected} onClick={list}>
              LIST ITEM FOR SALE <ChevronRight />
            </button>
          </div>
          <div className="your-listings">
            <h3>YOUR ACTIVE LISTINGS · {listings.length}</h3>
            {listings.length
              ? listings.map((listing) => (
                <article key={listing.id}>
                  <i>
                    <ItemVisual item={listing.item} />
                  </i>
                  <span>
                    <small>{listing.ownerName}</small>
                    <b>{listing.item.name}</b>
                    <em>{listing.price} $RF</em>
                  </span>
                  <button
                    onClick={() =>
                      setListings((current) =>
                        current.filter((entry) => entry.id !== listing.id)
                      )}
                  >
                    CANCEL
                  </button>
                  <button
                    className="market-sale"
                    onClick={() => completeSale(listing)}
                  >
                    SIMULATE SALE
                  </button>
                </article>
              ))
              : (
                <p>
                  No items listed. Listings remain with their owner until a sale
                  settles.
                </p>
              )}
          </div>
        </section>
        <section className="market-browse">
          <div className="battle-heading">
            <h2>BROWSE MARKET</h2>
            <b>{market.length} LISTINGS</b>
          </div>
          <div className="market-grid">
            {market.map((listing) => (
              <article key={listing.id}>
                <div className="market-art">
                  <ItemVisual item={listing.item} />
                </div>
                <small>{itemRarity(listing.item)} · {listing.item.kind}</small>
                <h3>{listing.item.name}</h3>
                <p>{listing.item.desc}</p>
                <span>SELLER · {listing.ownerName}</span>
                <button
                  disabled={player.rf <
                    listing.price + titheAmount(listing.price, player)}
                  onClick={() => buy(listing.item, listing.price)}
                >
                  <b>BUY FOR ACTIVE FRIEND</b>
                  <strong>
                    {listing.price + titheAmount(listing.price, player)} $RF
                  </strong>
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
function PotionCard(
  { kind, buy, player, friend }: {
    kind: (typeof POTION_KINDS)[number];
    buy: (i: Item) => void;
    player: Player;
    friend: Friend;
  },
) {
  const [tier, setTier] = useState(0),
    item = POTIONS.find((p) => p.id === `${kind.id}-${POTION_TIERS[tier].id}`)!,
    total = item.price + titheAmount(item.price, player);
  return (
    <article>
      <div className="item-art">
        <ItemVisual item={item} />
      </div>
      <span>POTION · {item.effect}</span>
      <h3>{kind.name}</h3>
      <label className="tier-picker">
        <span>EFFECTIVENESS</span>
        <select value={tier} onChange={(e) => setTier(Number(e.target.value))}>
          {POTION_TIERS.map((t, i) => {
            const option = POTIONS.find((p) => p.id === `${kind.id}-${t.id}`)!;
            return (
              <option key={t.id} value={i}>
                {t.label} · {option.desc.split(" · ")[1]} · {option.price} $RF
              </option>
            );
          })}
        </select>
      </label>
      <p>{item.desc}</p>
      <div className="durability">
        <span>USES</span>
        <b>1 / 1</b>
      </div>
      <button onClick={() => buy(item)} disabled={player.rf < total}>
        <span>BUY FOR {friend.name.toUpperCase()}</span>
        <b>{total} $RF</b>
      </button>
    </article>
  );
}
function Shop(
  { tab, setTab, buy, player, friend }: {
    tab: Kind;
    setTab: (k: Kind) => void;
    buy: (i: Item) => void;
    player: Player;
    friend: Friend;
  },
) {
  const tabs: [Kind, string][] = [["armor", "ARMOR"], ["weapon", "WEAPONS"], [
    "defense",
    "DEFENSE",
  ], ["potion", "POTIONS"]], rareItems = dailyRareItems();
  return (
    <section className="page">
      <div className="page-title">
        <span>SHOPPING FOR {friend.name.toUpperCase()}</span>
        <h1>DON'T GO EMPTY-HANDED.</h1>
        <p>Every purchase is placed in the active Friend's inventory.</p>
      </div>
      <section className="rare-shop">
        <div className="rare-shop-heading">
          <span>
            <small>DAILY ROTATION · RESETS 00:00 UTC</small>
            <h2>THE RARE SHELF</h2>
          </span>
          <p>
            Element-bound weapons and armor rotate once per day. They can also
            be discovered on adventures or earned from dungeon raids.
          </p>
        </div>
        <div className="rare-shop-grid">
          {rareItems.map((item) => (
            <article key={item.id}>
              <div className="item-art"><ItemVisual item={item} /></div>
              <ElementBadge element={item.modifier!} />
              <h3>{item.name}</h3>
              <p>{item.desc}</p>
              <div className="durability">
                <span>USES / DURABILITY</span>
                <b>{item.uses} / {item.maxUses}</b>
              </div>
              <button
                onClick={() => buy(item)}
                disabled={player.rf < item.price + titheAmount(item.price, player)}
              >
                <span>BUY RARE FOR {friend.name.toUpperCase()}</span>
                <b>{item.price + titheAmount(item.price, player)} $RF</b>
              </button>
            </article>
          ))}
        </div>
      </section>
      <div className="shop-tabs">
        {tabs.map((t) => (
          <button
            key={t[0]}
            data-active={tab === t[0] || undefined}
            onClick={() => setTab(t[0])}
          >
            {t[1]}
          </button>
        ))}
      </div>
      <div className="goods">
        {tab === "potion"
          ? POTION_KINDS.map((p) => (
            <PotionCard
              key={p.id}
              kind={p}
              buy={buy}
              player={player}
              friend={friend}
            />
          ))
          : GOODS.filter((i) => i.kind === tab).map((i) => (
            <article key={i.id}>
              <div className="item-art">
                <ItemVisual item={i} />
              </div>
              <span>{i.kind}</span>
              {i.modifier && <ElementBadge element={i.modifier} />}
              <h3>{i.name}</h3>
              <p>{i.desc}</p>
              <div className="durability">
                <span>USES / DURABILITY</span>
                <b>{i.uses} / {i.maxUses}</b>
              </div>
              <button
                onClick={() => buy(i)}
                disabled={player.rf < i.price + titheAmount(i.price, player)}
              >
                <span>BUY FOR {friend.name.toUpperCase()}</span>
                <b>{i.price + titheAmount(i.price, player)} $RF</b>
              </button>
            </article>
          ))}
      </div>
    </section>
  );
}
function RunInventory(
  { run, friend, drink }: {
    run: Run;
    friend: Friend;
    drink: (i: Item) => void;
  },
) {
  const equipped = friend.inventory.filter((i) =>
      i.kind !== "potion" && run.equipment.includes(i.id)
    ),
    potions = friend.inventory.filter((i) => i.kind === "potion"),
    potionGroups = potions.reduce<{ item: Item; count: number }[]>(
      (groups, item) => {
        const group = groups.find((g) => g.item.name === item.name);
        if (group) group.count += 1;
        else groups.push({ item, count: 1 });
        return groups;
      },
      [],
    ),
    effect = (item: Item) =>
      item.kind === "weapon"
        ? `+${item.power} ATTACK`
        : item.kind === "armor"
        ? `-${item.power} DAMAGE`
        : `+${Math.min(70, item.power * 6)}% BLOCK CHANCE`;
  return (
    <section className="run-inventory">
      <div className="run-inventory-title">
        <Backpack />
        <span>
          <b>ADVENTURE INVENTORY</b>
          <small>
            {equipped.length} EQUIPPED · {potions.length}{" "}
            POTION{potions.length === 1 ? "" : "S"}
          </small>
        </span>
      </div>
      <div className="run-inventory-groups">
        <div>
          <h3>EQUIPPED ITEMS</h3>
          <div className="run-items">
            {equipped.length
              ? equipped.map((item) => (
                <article key={item.id}>
                  <i>
                    <ItemVisual item={item} />
                  </i>
                  <span>
                    <b>{item.name}</b>
                    <small>{item.kind} · {effect(item)}</small>
                    {item.modifier && <ElementBadge element={item.modifier} />}
                  </span>
                  <em>{item.uses}/{item.maxUses}</em>
                </article>
              ))
              : <p>NO GEAR EQUIPPED</p>}
          </div>
        </div>
        <div>
          <h3>AVAILABLE POTIONS</h3>
          <div className="run-items">
            {potionGroups.length
              ? potionGroups.map(({ item, count }) => (
                <button
                  key={item.name}
                  onClick={() => drink(item)}
                  disabled={item.effect === "heal" && run.hp >= run.maxHp}
                >
                  <i>
                    <ItemVisual item={item} />
                  </i>
                  <span>
                    <b>{item.name}</b>
                    <small>{item.desc.split(" · ")[1]?.toUpperCase()}</small>
                  </span>
                  <em>×{count}</em>
                </button>
              ))
              : <p>NO POTIONS PACKED</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
function RunView(
  { run, friend, choose, leave, player, drink }: {
    run: Run;
    friend: Friend;
    choose: (p: boolean) => void;
    leave: () => void;
    player: Player;
    drink: (i: Item) => void;
  },
) {
  const ev = EVENTS[run.event],
    actionTithe = titheAmount(ev.burn, player),
    actionTotal = ev.burn + actionTithe,
    done = run.room > run.dungeon.rooms,
    dead = !run.hp,
    enemy = run.enemy;
  return (
    <section className="run">
      <div className="run-top">
        <button onClick={leave}>← ABANDON</button>
        <span>{friend.name} · {run.dungeon.name}</span>
        <b>
          ROOM {Math.min(run.room, run.dungeon.rooms)} / {run.dungeon.rooms}
        </b>
      </div>
      {dead || done
        ? (
          <div className={`outcome ${dead ? "dead" : "win"}`}>
            {dead ? <Skull /> : <Trophy />}
            <span>{dead ? "THE ADVENTURE ENDS HERE" : "THE GATE OPENS"}</span>
            <h1>
              {dead
                ? `${friend.name.toUpperCase()} HAS FALLEN.`
                : "YOU MADE IT OUT."}
            </h1>
            <p>{run.log.at(-1)}</p>
            <strong className="outcome-spend">
              <Coins /> TOTAL SPENT: {run.spentRf} $RF
            </strong>
            <button className="primary" onClick={leave}>
              RETURN TO THE TRAILS
            </button>
          </div>
        )
        : (
          <>
            <div className="encounter">
              <div className="encounter-art">
                <LandScene
                  dungeon={run.dungeon}
                  friend={friend}
                  hp={run.hp}
                  maxHp={run.maxHp}
                />
                <span>
                  {enemy ? "ENEMY ENCOUNTER" : ev.type} · ROOM {run.room}
                </span>
              </div>
              <div className="encounter-copy">
                {enemy && (
                  <div className="enemy-card">
                    <i>{enemy.icon}</i>
                    <span>
                      <small>ENEMY · ATTACK {enemy.attack}</small>
                      <b>{enemy.name}</b>
                      <ElementBadge element={enemy.element} />
                      <div>
                        <em
                          style={{ width: `${enemy.hp / enemy.maxHp * 100}%` }}
                        />
                      </div>
                    </span>
                    <strong>{enemy.hp}/{enemy.maxHp} HP</strong>
                  </div>
                )}
                <div className="run-terminal">
                  <div>
                    <i />
                    <i />
                    <i />
                    <b>ADVENTURE LOG</b>
                  </div>
                  {run.log.slice(-3).map((x, i) => (
                    <p key={i}>
                      <span>›</span> {x}
                    </p>
                  ))}
                  <p className="terminal-event">
                    <span>›</span> [{enemy ? "COMBAT" : ev.type}]{" "}
                    {enemy ? `${enemy.name} blocks the trail.` : ev.title}
                  </p>
                  <p>
                    <span>›</span> {enemy
                      ? "Defeat it to continue. Weapons add attack, armor reduces every hit, and defense gear can block damage."
                      : ev.copy}
                    <em>_</em>
                  </p>
                </div>
                <strong className="run-spend">
                  <Coins /> SPENT THIS RUN: {run.spentRf} $RF
                </strong>
                <div className="choices">
                  <button
                    onClick={() => choose(true)}
                    disabled={player.rf < actionTotal}
                  >
                    <i>{enemy ? <Swords /> : <Coins />}</i>
                    <span>
                      <small>
                        {enemy
                          ? `FOCUSED STRIKE · ${actionTotal} $RF`
                          : `SAFER PATH · ${actionTotal} $RF`}
                      </small>
                      <b>{enemy ? "Empower your weapon" : ev.safe}</b>
                      <em>
                        {enemy
                          ? "Deal +6 damage and soften the counterattack."
                          : "Greatly reduces incoming damage."}
                      </em>
                    </span>
                    <ChevronRight />
                  </button>
                  <button onClick={() => choose(false)}>
                    <i>
                      <Swords />
                    </i>
                    <span>
                      <small>
                        {enemy ? "STANDARD ATTACK · FREE" : "HARD PATH · FREE"}
                      </small>
                      <b>{enemy ? "Strike the enemy" : ev.hard}</b>
                      <em>
                        {enemy
                          ? "Attack with your equipped weapon and brace for retaliation."
                          : "Risk injury for a chance at loot."}
                      </em>
                    </span>
                    <ChevronRight />
                  </button>
                </div>
              </div>
            </div>
            <RunInventory run={run} friend={friend} drink={drink} />
          </>
        )}
    </section>
  );
}
