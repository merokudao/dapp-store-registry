# dApp Store Registry

MerokuDAO dApp Store Registry is a package that allows application
to query for list of tokens.

# Adding your dApp to registry

1. Fork this repo
2. Update the file `registry.json` to add your dApp. The schema is described in [registry.ts](src/lib//registry.ts).
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
import { RegistryListProvider } from '@merokudao/dapp-store-registry';

// Instantiate a registry.
const registry = await new RegistryListProvider().resolve();

// Find all the dApps
const dApps = registry.getDapps();

// Filter dApps which have the tag `nft`
const dAppsFiltered = registry.filterByTag('nft').getDapps();

// Can be chained
const dApps = registry
    .filterByTag('nft')
    .filterByChainId(137)
    .searchForText('deploy')
    .getDapps();
```
