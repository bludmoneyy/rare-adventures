# Rare Adventures

A choose-your-adventure game that gives Rare Friends a progression loop through equipment, dangerous expeditions, party battles, and a simulated $RAREFRIENDS economy.

**[Play the demo](https://bludmoneyy.github.io/rare-adventures/)** · **[Source code](https://github.com/bludmoneyy/rare-adventures)** · **[Rare Friends Vibeathon](https://github.com/spokesz/rarefriends-vibeathon)**

| Submission detail | Rare Adventures |
| --- | --- |
| Builder / contact | [@bludmoneyy on GitHub](https://github.com/bludmoneyy) |
| Proposed category | **Economy Potential** |
| Approach | Standalone web game; **does not use FriendSDK** |
| Stack | React 18, TypeScript 5.7, Vite 6, CSS and SVG assets; GitHub Pages hosting |
| Wallet / network requirements | None for the playable demo. No NFT ownership check, wallet connection, transaction signature, or funded account is required. |
| Economy status | All RF balances, purchases, sinks, wagers, rewards, and marketplace trades are simulated locally. |

## What did we build?

Choose a demo Friend, buy equipment and potions, and attempt one of eight adventure tiers. Each room asks you to trade simulated RF for safer progress or take a free, riskier action. Clear the expedition to receive a reward from the visible pool; die and lose that Friend's carried inventory. Purchases and entry fees replenish the pool and record a separate RF sink.

The wider prototype adds party battles with replayable combat, raids with simulated teammates, elemental loot, a marketplace, and weekly guild competition. These systems explore how preparation, item loss, rewards, and social goals could create reasons to spend and reuse $RAREFRIENDS across repeated sessions.

**Why Economy Potential:** the central experiment is a traceable economy with costs, rewards, consumables, item attrition, and pool accounting. The demo records simulated spending and burning; it does not claim real token activity or a proven sustainable return. The [economy operator guide](#economy-operator-guide) includes parameters, break-even estimates, and production work still needed.

## How it connects to Rare Friends

Friends are the persistent characters carrying equipment, run history, and RF metrics. The demo uses preset Generations and Genesis identities, Rare Friends-themed visuals, and eight land scenes derived from Generations scenery. Party battles give a land-matching pet a 10% damage/healing bonus; Genesis pets receive that bonus on every land.

The current roster and land assignments are demo data. The default sprite is a bundled fallback, not a wallet-selected NFT's verified original artwork. Verified ownership, token metadata, individual character artwork, and real settlement remain future integrations. The custom interface uses responsive pages for inventories, economy information, and multiple game modes rather than the FriendSDK runtime.

## Try the core interaction

1. Open the [public demo](https://bludmoneyy.github.io/rare-adventures/). A fresh save starts with **250 simulated RF** and a reward pool of **18,420 simulated RF**.
2. Open **Friends** and select a character. Use **Shops** to buy equipment or a potion for that Friend; the item cards show costs, power, and durability.
3. Open **Adventures**, select the first tier, and enter for **12 RF**. It contains five rooms and advertises an **18–32 RF** clear reward, limited by the available pool.
4. Choose paid or free actions in each room. Fight enemies until their HP reaches zero, and use carried potions during the run as needed. Paid choices improve survival but do not guarantee a clear.
5. Finish the adventure or encounter death, then inspect the Friend's inventory, history, and RF metrics. Open **Docs** for the economy explanation and **Metrics** for the content overview.
6. Explore **Battles**, **Raids**, **Marketplace**, **Guild**, and **Guild Wars** for the connected systems. Other participants, listings, and standings are local simulations, not live multiplayer.

**Controls:** click or tap buttons and cards; use Tab to focus controls and Enter/Space to activate buttons. On small screens, use the menu button to open navigation. Characters roam automatically; there are no WASD movement controls. Battle playback supports pause, next action, show result, and replay, with reduced-motion handling.

Progress is saved in this browser's `localStorage`. To start over, use **RESET DEMO** in the navigation drawer, preferably after leaving an active run. Reloading does not preserve an in-progress expedition.

## Costs, chances, and consumables

- Adventure entry ranges from **12 to 155 RF** across eight tiers; the complete room counts and reward ranges are in [current tier economics](#current-tier-economics).
- A room has a **42% enemy chance**. Trap, loot, and story rooms each account for approximately **19.33%**. Paid choices cost 6 RF per focused combat strike, 5 RF for traps, 8 RF for loot rooms, and 7 RF for story rooms. Free choices cost 0 RF before any optional preparation.
- Surviving a free choice in a loot room gives a **35% item-drop chance**; a Fortune charge guarantees that eligible drop. Combat and damage also depend on tier, equipment, potion effects, and random rolls, so there is no single fixed adventure win probability.
- Entry, ordinary shop purchases, and paid adventure actions contribute `ceil(payment × 0.5)` to the reward pool; the remainder is recorded as a simulated sink. Optional guild tithes add a separate charge. Raids, marketplace fees, and wagers have their own rules below.
- Potions are single-use items with nine effects and three strength tiers. Effects include healing, attack, armor, defense, evasion, loot fortune, revival, repair, and maximum HP. Run buffs last for that expedition; charges are consumed by their relevant events.
- Equipment has limited durability. Gear carried into a successful adventure loses one use; depleted gear is removed. Fatal death clears the Friend's carried inventory. Abandoning does not refund entry.
- Rewards are simulated, capped by available funds, and have no cash or token redemption. Client-side randomness and storage are suitable for this demo only.

## Checks and known limitations

Checks completed during deployment preparation:

- TypeScript checking and Vite production builds passed for both `/` and `/rare-adventures/` hosting paths.
- A local asset audit found all **44 referenced public SVG assets**, including dynamically selected potion art. The missing lance reference was corrected, with compatibility for old saved paths.
- Scripted checks passed for asset URL mapping, generated entry links, the web manifest, and service-worker cache isolation and offline fallback behavior.

These were local build and scripted checks, not a full automated browser or gameplay suite. Desktop/mobile gameplay, keyboard accessibility, and every secondary game mode still need a complete reviewer pass. There is no FriendSDK validation result because this project does not use the SDK.

Known limits and future work:

- No wallet access or live funds are involved. Verified NFT selection and original per-token artwork are not implemented.
- Saves, guild chat, opponents, raid wallets, market activity, and balances are local. There is no shared backend, authenticated multiplayer, escrow, or authoritative settlement.
- Local saves and outcomes can be edited; `Math.random()` is not secure randomness. Production would need trusted settlement and prevention of duplicated trades/rewards.
- The initial reward pool is a demo subsidy. Economy tuning and raid-wide payout accounting need playtesting before any real RF integration.
- Browser storage must be available for persistence. Clearing site data removes progress; active expeditions are not restored on reload. Offline support covers cached resources after an online visit.

## Credits

- **Rare Friends:** character/collection concepts and Generations scenery. The extraction script at [`scripts/extract-generation-one-lands.mjs`](scripts/extract-generation-one-lands.mjs) reads Generations metadata from Robinhood mainnet and extracts/adapts scenery into `src/assets/lands/`. This is an optional asset-generation tool; the playable demo uses committed SVGs and does not call that RPC.
- **Font Awesome / Fonticons:** the `fa-*.svg` navigation icons retain their attribution and CC BY 4.0 notices. See [Font Awesome Free licensing](https://fontawesome.com/license/free).
- **Google Fonts and their designers:** Archivo, Silkscreen, and Sometype Mono, loaded through Google Fonts.
- Item illustrations and the fallback walking sprite are bundled under `public/`; additional UI SVGs are in `src/assets/svgs/`. These credits do not assert ownership of Rare Friends artwork or grant additional rights to third-party assets.

## Preparing the Vibeathon PR

The [submission instructions](https://github.com/spokesz/rarefriends-vibeathon#how-to-submit) ask for a PR adding `submissions/your-project/README.md`. For this entry, use **`submissions/rare-adventures/README.md`** in a fork of the Vibeathon repository. Keep the application source in this repository and link to it from the submission.

Suggested PR title: **Submission: Rare Adventures — Economy Potential**.

Use the overview, builder/contact, category, demo and source links, stack, play instructions, economy rules, checks, limitations, and credits above in both the submission README and PR description. Link back to this README's economy guide for full parameters. When copying text to the submission repository, replace local asset/script links with links to this source repository. Confirm the proposed category and builder contact, and complete a fresh browser playthrough before opening the PR.

## Run locally

Use Node.js 22 (the version used by the deployment workflow) and npm. No API keys or environment variables are required.

```bash
git clone https://github.com/bludmoneyy/rare-adventures.git
cd rare-adventures
npm ci
npm run dev
```

Use `npm run build` and `npm run preview` to test the production build. Demo state is stored in `localStorage` under `rare-adventures-save-v1`.

## Host on GitHub Pages

The included `.github/workflows/pages.yml` builds and deploys the app on pushes to `main`, or when run manually. It reads the site's base path from GitHub Pages, so asset URLs work at `/rare-adventures/`, at a renamed repository path, or on a custom domain. No backend server or deployment secret is needed.

1. Commit these changes and push them to the GitHub repository's `main` branch.
2. Open **Settings → Pages → Build and deployment**, and set **Source** to **GitHub Actions**. Do not choose a branch or create another workflow.
3. Open **Actions → Deploy to GitHub Pages → Run workflow**, select `main`, and run it. Later pushes to `main` deploy automatically.
4. Wait for the workflow to succeed, then open the URL in the deployment summary. For this repository, the default URL is **https://bludmoneyy.github.io/rare-adventures/**.

If the initial push runs before Pages is enabled, enable it and rerun the workflow. See the [GitHub Pages setup guide](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) and [Vite deployment guide](https://vite.dev/guide/static-deploy.html#github-pages).

To preview the repository path locally:

```bash
npm ci
npm run build -- --base=/rare-adventures/
npm run preview -- --base=/rare-adventures/
```

Open `http://localhost:4173/rare-adventures/`. The default `npm run build` still supports hosting at `/`. Navigation uses React state rather than separate URL routes, so Pages does not need a custom `404.html` redirect. The manifest and production service worker use the deployment directory; previously visited resources are available offline, but a first visit requires a connection.

Pages publishes the browser demo, including local saves and simulated economy actions. It does not run `server/production.mjs`, provide shared persistence, or turn the prototype into on-chain transactions. The workflow installs from `package-lock.json` and builds fresh output; existing committed `dist/` and `node_modules/` files are not used as the deployment artifact.

## Prototype behavior

- Eight adventure tiers with escalating entry costs, room counts, danger, and rewards
- Weapons, armor, defense items, and functional potions
- Paid safer actions and free riskier actions
- Enemy, trap, loot, and story rooms
- Fatal death that clears the Friend's carried inventory
- Entry, shop, and paid-action revenue split between the reward pool and an RF sink
- Clear rewards paid from the visible reward pool

Chain calls are represented by local state for hackathon testing. The economy actions (`buy`, `start`, paid `choose`, potion use, and clear payout) are isolated in `src/App.tsx` and can be replaced with wallet or contract calls.

## Economy operator guide

This describes the implemented prototype, not a promise of production returns. Calibrate it with playtest telemetry before enabling real RF.

### Where to tune values

The relevant constants and tables are near the top of `src/App.tsx`:

- `ECONOMY`: pool share, room odds, HP, and paid-action combat benefits
- `DUNGEONS`: entry cost, room count, and reward range for each tier
- `EVENTS`: paid-action prices
- `GOODS`: equipment prices, power, and durability
- `POTION_KINDS` and `POTION_TIERS`: potion effects, strength, and price scaling
- `makeEnemy`: enemy HP and attack scaling

Changing difficulty also changes economics. Lower enemy damage, stronger equipment, or stronger potions raise the clear rate and therefore reward-pool outflow.

### RF ledger

Every RF movement belongs to one of three ledgers:

| Event | Player balance | Reward pool | Protocol sink | Friend metrics |
| --- | ---: | ---: | ---: | --- |
| Enter adventure | `-entry` | `+poolContribution(entry)` | `+sinkAmount(entry)` | spent and burned |
| Buy item or potion | `-price` | `+poolContribution(price)` | `+sinkAmount(price)` | spent, burned, item bought |
| Choose paid action | `-actionCost` | `+poolContribution(actionCost)` | `+sinkAmount(actionCost)` | spent and burned |
| Choose free action | `0` | `0` | `0` | none |
| Clear adventure | `+reward` | `-reward` | `0` | earned and clear |
| Find an item | `0` | `0` | `0` | inventory only |
| Die | `0` | `0` | `0` | death; carried items removed |
| Abandon | no refund | no new movement | no new movement | no refund |

Current payment split:

```text
pool contribution = ceil(payment × 0.50)
protocol sink      = payment - pool contribution
```

**RF spent** is total player RF paid. **RF burned** is only the protocol-sink portion. Pool contributions are not counted as burned.

### Reward calculation

On a clear, the game samples within the displayed reward range, rounds to a whole RF amount, and caps the result at the available pool. Because it rounds a continuous sample, the two endpoints are each approximately half as likely as an interior integer:

```text
sampled reward = round(minReward + random × (maxReward - minReward))
actual reward  = min(sampled reward, rewardPool)
```

The displayed range and payout logic now use the same values.

### Current tier economics

The last column is the approximate clear rate at which entry contributions alone cover mean rewards. It excludes shops and paid actions, so it is conservative.

| Tier | Rooms | Entry | Reward | Mean reward | Player margin after entry only | Pool entry inflow | Entry-only break-even clear rate |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 5 | 12 | 18–32 | 25 | +13 | 6 | 24.0% |
| 2 | 6 | 22 | 32–52 | 42 | +20 | 11 | 26.2% |
| 3 | 6 | 36 | 54–82 | 68 | +32 | 18 | 26.5% |
| 4 | 7 | 52 | 78–118 | 98 | +46 | 26 | 26.5% |
| 5 | 8 | 72 | 108–164 | 136 | +64 | 36 | 26.5% |
| 6 | 9 | 96 | 146–218 | 182 | +86 | 48 | 26.4% |
| 7 | 10 | 122 | 186–286 | 236 | +114 | 61 | 25.8% |
| 8 | 12 | 155 | 245–440 | 342.5 | +187.5 | 78 | 22.8% |

Core formulas:

```text
player EV per attempt = clearRate × meanReward
                      - entry
                      - expected paid-action spend
                      - amortized gear and potion spend

pool EV per attempt   = poolContribution(entry)
                      + expected pool share of actions and purchases
                      - clearRate × meanReward

sink revenue          = sum of sinkAmount for entries, purchases, and paid actions

break-even clear rate = expected pool inflow per attempt / meanReward
```

### Paid-action assumptions

Rooms currently roll as follows:

- 42% enemy encounter, with a 6 RF focused strike
- The remaining 58% split evenly across a 5 RF trap action, 8 RF loot action, and 7 RF story action

If a player pays exactly once per room, the weighted mean action cost is approximately **6.39 RF**, contributing about **3.39 RF** to the pool and **3.00 RF** to the sink per action. Enemy rooms can require multiple combat rounds, so real action counts may be higher. Free actions contribute nothing and carry more health risk.

### Sanity-check findings

- Mean rewards are roughly 1.88×–2.21× entry cost, which is reasonably consistent across tiers.
- A successful player is profitable before optional actions and consumables. Death risk, gear loss, and paid choices must offset that upside.
- The pool is **not sustainable at a 100% clear rate** from entry fees alone. Entry-only sustainability requires clear rates near 23%–27%, or enough shop and action contributions to cover the difference.
- Higher tiers offer larger margins but add rooms, stronger enemies, equipment requirements, and more chances to spend or die.
- The starting 250 RF balance supports early and middle tiers. Tier 8 consumes 62% before gear or actions, and the app warns when a run is likely unaffordable.
- Free-path play is the main stress case: skilled, well-equipped players can win while adding only their entry contribution to the pool.
- Found items do not move RF but reduce future shop demand. Monitor their effective value and the 35% hard-path loot chance.
- Durability decreases on clears; death removes inventory. Abandoning preserves durability but never refunds entry.
- The initial 18,420 RF pool is a demo subsidy, not evidence that the live loop is self-funding.

### Party battle arenas

Party battles reuse the adventure `LandScene` renderer. A fight draws uniformly from the eight lands (Coastal, Garden, Industrial, Market, Mineral, Orbital, Reading, Rooftop) once, then keeps that arena for every action and replay. Up to four pets per side roam within the land’s central walkable area as compact sprites, with HP bars, attack/heal feedback, and knockout states. Hover or keyboard-focus a pet for its name, exact HP, and bonus; the roster below retains full details. Roaming stops when playback is paused or finished, a pet is knocked out, or reduced motion is enabled. Stored `spriteUrl` values are used when present, with the same walking-sprite fallback as Adventures.

A pet gains **10% damage and healing efficiency** when its land matches the arena. **Genesis pets always gain 10%**, regardless of land. The bonuses do not stack: a Genesis pet with a matching land still receives 10%, never 20%.

```text
multiplier = Genesis OR matching land ? 1.10 : 1.00
hit = round(max(1, attack after critical, armor and block) × multiplier)
heal = min(missing HP, round(base Support healing × multiplier))
```

The rule applies to both sides. It does not change maximum HP, armor, block stats, potion preparation, or wager payouts. Whole-HP rounding can leave very small hits unchanged. This arena bonus belongs to party battles; adventure and raid rules are unchanged.

The local demo roster has preset lands: Generations #184 is Coastal, #409 Garden, and #612 Orbital. These are demo assignments, not verified NFT metadata. Existing saves retain valid land traits; known demo pets inherit their preset if missing, and unknown pets without a land receive no match bonus. Demo waiting squads have stable preset traits; a supplied opponent roster can provide its own collection, land, and sprite. Wallet integration must populate these fields from verified pet metadata rather than the demo defaults.

Combat generates immutable action snapshots once per challenge. Playback supports pause, next action, show result, and replay; reduced-motion users start paused. Each frame reflects the actual post-action HP and reveals the corresponding log entries. Potions and wagers settle once at challenge time, including if the player leaves playback; replay and skipping never repeat settlement or reroll the land. Wager results appear with the final outcome.

### Elemental gear

Reward weapons and armor can carry Water, Earth, Wind, Fire, Electricity, or Curse modifiers. The counter cycle is `Water → Fire → Earth → Electricity → Wind → Curse → Water`. A weapon whose modifier counters the encounter gains 50% of its base power as bonus strike; armor gains the same amount as bonus guard. Modifiers are never attached to the ordinary shop catalog. They enter the economy only through adventure discoveries, eligible raid drops, or the three-item rare shelf, which rotates deterministically at 00:00 UTC each day.

### Four-wallet raid economy

Raids require four distinct wallets. Each wallet pays the same entry fee, so `raid pot = entry fee × 4`. The prototype adds that full pot—including the three simulated wallets—to the reward pool, then pays a clearing player according to:

`player payout = raid pot × player raw-power share × difficulty reward multiplier`

Expedition, Heroic, and Mythic currently use power multipliers of 1.00, 1.35, and 1.75; fee multipliers of 1.00, 1.60, and 2.40; and payout multipliers of 1.00, 1.30, and 1.70. Failed raids pay nothing, leaving the pot in the reward pool. Team power includes gear-derived pet power plus a 2/6/10-point composition bonus based on role diversity. Heroic and Mythic clears may award dungeon-exclusive items when the player contributes at least 20% of raw team power.

Before production, replace simulated wallet funds with escrowed deposits and make settlement atomic. Track total party payout—not only the local player payout—when tuning pool profitability. Rare-drop value must also be included in player EV because those items improve later battle and raid performance without an RF purchase.

### Player marketplace

Only items tagged as adventure discoveries or raid drops can be listed as found loot; direct shop purchases are excluded. The prototype charges a 5% fee rounded up to at least 1 RF. Seller proceeds are `asking price - market fee`, and the fee enters the ecosystem reward pool. Production listings should escrow the exact tokenized item, settle the item and RF atomically, and prevent the same asset from being equipped, wagered, transferred, or listed twice while an order is active.

### Weekly guild wars

Players choose one of four guilds for the current Monday-to-Monday war. Adventure clears award `tier × 12` points; raid clears award 45/75/120 points for Expedition/Heroic/Mythic plus 8 points per dungeon-depth index; party battle wins award 20 points and draws award 5; marketplace sales award 3; shop preparation awards 1. Failed raids award 4 participation points. Points only accrue after joining, and the local prototype resets membership and contribution when a new weekly key is detected.

To reduce the disadvantage of smaller guilds without fully converting the contest into a per-capita leaderboard, standings use a square-root population adjustment:

`adjusted score = raw score × √(largest guild member count ÷ guild member count)`

This dampens, but does not erase, the advantage of having more active players. Production should use unique eligible wallets, minimum participation requirements, sybil controls, and a capped adjustment based on active—not merely registered—members.

Guild members can optionally set a 0%–20% tithe that is charged **on top of** eligible RF purchases. The prototype splits each rounded-up tithe 80% to the member's weekly guild treasury contribution and 20% to the global reward pool. Shop purchases, marketplace buys, adventure entries and paid actions, and raid entries are eligible; battle wagers are not purchases and are excluded. Purchase buttons and affordability checks use `base price + tithe`. Guild membership and the recorded weekly guild-treasury contribution reset with the Monday war key, while the user's preferred percentage is retained.

The Guild page owns membership, treasury information, weekly objectives, tithe controls, and the strategy-chat prototype. Guild Wars is a separate competitive view for the countdown, normalized standings, scoring weights, and war activity. Production chat requires wallet authentication, guild-scoped authorization, persistence, moderation, blocking, and rate limits.

### Recommended production telemetry

Record these values per attempt:

- Tier, entry fee, rooms entered, and rooms cleared
- Clear, death, or abandon outcome
- RF spent on entry, shop items, potions, and actions separately
- RF contributed to the pool, sent to the sink, and paid out
- Combat rounds and paid versus free actions
- Gear and potions carried, consumed, lost, and found
- Starting and ending player and pool balances
- Player profit: `reward - all attempt-attributable spend`
- Pool profit: `all pool contributions - reward`
- Clear rate and pool profit by tier, loadout value, and player cohort
- Raid queue completion, four-wallet pot size, contribution share, composition bonus, clear rate, RF payout, and rare-drop value by dungeon and difficulty
- Marketplace listing price, time to sale, cancellation rate, gross volume, seller proceeds, and RF fees contributed to the pool
- Guild raw and adjusted score, active members, points per action category, wallet concentration, and score changes caused by population normalization
- Tithe opt-in rate, selected percentage, guild/global split, purchase abandonment caused by total price, and treasury contributions by eligible purchase category

### Rebalance checklist

1. Measure clear rate and paid-action frequency per tier.
2. Calculate player EV and pool EV with the formulas above.
3. Choose the desired player return and pool runway explicitly.
4. Tune reward ranges first, then entries, actions, pool share, and difficulty.
5. Simulate free-path, fully paid, ungeared, and optimized-loadout strategies.
6. Define behavior when the pool cannot cover the advertised minimum reward.
7. Review loot and durability because they change future RF demand.
8. Version economic parameters so old runs and analytics remain interpretable.
