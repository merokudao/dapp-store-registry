@merokudao/dapp-store-registry / [Exports](modules.md)

# dApp Store Registry

MerokuDAO dApp Store Registry is self explanatory name. It contains
the dApp Store registry and a helper class to search, filter & list dApps

# Adding your dApp to registry

1. Fork this repo
2. Update the file `registry.json` to add your dApp. The schema is described in [merokuDappStore.registrySchema.json](src/merokuDappStore.registrySchema.json).
3. Create a PR
4. After PR is approved and merged, your dApp will be listed in the Meroku dApp Store.

# Usage

## Installation

Install using NPM as `npm install @merokudao/dapp-store-registry` or using YARN as
`yarn add @merokudao/dapp-store-registry`

## Usage

### Basic

```typescript
// Import
import { DappStoreRegistry } from "@merokudao/dapp-store-registry";

// Instantiate a registry.
const registry = new DappStoreRegistry();
await registry.init();

// Find all the dApps
const dApps = await registry.dApps();

// Search dApps with query string "nft"
const dAppsResult = registry.search("nft");
```

Detailed docs can be viewed at [docs](/docs/index.html).
