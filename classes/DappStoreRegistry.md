[@merokudao/dapp-store-registry](../README.md) / [Exports](../modules.md) / DappStoreRegistry

# Class: DappStoreRegistry

## Table of contents

### Constructors

- [constructor](DappStoreRegistry.md#constructor)

### Properties

- [appOctokit](DappStoreRegistry.md#appoctokit)
- [cachedRegistry](DappStoreRegistry.md#cachedregistry)
- [githubOwner](DappStoreRegistry.md#githubowner)
- [githubRepo](DappStoreRegistry.md#githubrepo)
- [initialized](DappStoreRegistry.md#initialized)
- [lastRegistryCheckedAt](DappStoreRegistry.md#lastregistrycheckedat)
- [registryRemoteUrl](DappStoreRegistry.md#registryremoteurl)
- [searchEngine](DappStoreRegistry.md#searchengine)
- [strategy](DappStoreRegistry.md#strategy)
- [TTL](DappStoreRegistry.md#ttl)

### Methods

- [addFeaturedSection](DappStoreRegistry.md#addfeaturedsection)
- [addOrUpdateDapp](DappStoreRegistry.md#addorupdatedapp)
- [buildSearchIndex](DappStoreRegistry.md#buildsearchindex)
- [dApps](DappStoreRegistry.md#dapps)
- [deleteDapp](DappStoreRegistry.md#deletedapp)
- [filterDapps](DappStoreRegistry.md#filterdapps)
- [getFeaturedDapps](DappStoreRegistry.md#getfeatureddapps)
- [getRegistryTitle](DappStoreRegistry.md#getregistrytitle)
- [ghAppInstallURL](DappStoreRegistry.md#ghappinstallurl)
- [init](DappStoreRegistry.md#init)
- [isGHAppInstalled](DappStoreRegistry.md#isghappinstalled)
- [localRegistry](DappStoreRegistry.md#localregistry)
- [queryRemoteRegistry](DappStoreRegistry.md#queryremoteregistry)
- [registry](DappStoreRegistry.md#registry)
- [removeFeaturedSection](DappStoreRegistry.md#removefeaturedsection)
- [search](DappStoreRegistry.md#search)
- [toggleDappInFeaturedSection](DappStoreRegistry.md#toggledappinfeaturedsection)
- [toggleListing](DappStoreRegistry.md#togglelisting)
- [updateRegistry](DappStoreRegistry.md#updateregistry)
- [validateRegistryJson](DappStoreRegistry.md#validateregistryjson)

## Constructors

### constructor

• **new DappStoreRegistry**(`strategy?`)

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `strategy` | [`RegistryStrategy`](../enums/RegistryStrategy.md) | `RegistryStrategy.GitHub` |

#### Defined in

[src/lib/registry.ts:55](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/lib/registry.ts#L55)

## Properties

### appOctokit

• `Private` **appOctokit**: `undefined` \| `Octokit` & { `paginate`: `PaginateInterface`  } & `Api` & { `retry`: { `retryRequest`: (`error`: `RequestError`, `retries`: `number`, `retryAfter`: `number`) => `RequestError`  }  } = `undefined`

#### Defined in

[src/lib/registry.ts:53](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/lib/registry.ts#L53)

___

### cachedRegistry

• `Private` **cachedRegistry**: `undefined` \| [`DAppStoreSchema`](../interfaces/DAppStoreSchema.md)

#### Defined in

[src/lib/registry.ts:51](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/lib/registry.ts#L51)

___

### githubOwner

• `Private` `Readonly` **githubOwner**: ``"merokudao"``

#### Defined in

[src/lib/registry.ts:44](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/lib/registry.ts#L44)

___

### githubRepo

• `Private` `Readonly` **githubRepo**: ``"dapp-store-registry"``

#### Defined in

[src/lib/registry.ts:45](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/lib/registry.ts#L45)

___

### initialized

• `Private` **initialized**: `boolean` = `false`

#### Defined in

[src/lib/registry.ts:42](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/lib/registry.ts#L42)

___

### lastRegistryCheckedAt

• `Private` **lastRegistryCheckedAt**: `undefined` \| `Date`

#### Defined in

[src/lib/registry.ts:40](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/lib/registry.ts#L40)

___

### registryRemoteUrl

• `Readonly` **registryRemoteUrl**: `string`

#### Defined in

[src/lib/registry.ts:47](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/lib/registry.ts#L47)

___

### searchEngine

• `Private` **searchEngine**: `Search`

#### Defined in

[src/lib/registry.ts:49](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/lib/registry.ts#L49)

___

### strategy

• **strategy**: [`RegistryStrategy`](../enums/RegistryStrategy.md)

#### Defined in

[src/lib/registry.ts:36](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/lib/registry.ts#L36)

___

### TTL

▪ `Static` `Private` **TTL**: `number`

#### Defined in

[src/lib/registry.ts:38](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/lib/registry.ts#L38)

## Methods

### addFeaturedSection

▸ **addFeaturedSection**(`name`, `email`, `accessToken`, `githubID`, `section`): `Promise`<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `email` | `string` |
| `accessToken` | `string` |
| `githubID` | `string` |
| `section` | [`FeaturedSection`](../interfaces/FeaturedSection.md) |

#### Returns

`Promise`<`string`\>

#### Defined in

[src/lib/registry.ts:668](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/lib/registry.ts#L668)

___

### addOrUpdateDapp

▸ **addOrUpdateDapp**(`name`, `email`, `accessToken`, `githubID`, `dapp`, `org?`): `Promise`<`string`\>

Adds or updates the dApp in the registry. If the dApp already exists, it
updates the dApp. If the dApp doesn't exist, it adds the dApp.

Only the developer of the dApp can add or update the dApp.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `name` | `string` | `undefined` | The name of the developer (from GitHub) |
| `email` | `string` | `undefined` | The email of the developer (from Github) |
| `accessToken` | `string` | `undefined` | The JWT access token of the developer (from Github) for user to server API Calls |
| `githubID` | `string` | `undefined` | The GitHub ID of the developer |
| `dapp` | [`DAppSchema`](../interfaces/DAppSchema.md) | `undefined` | The dApp to add or update |
| `org` | `undefined` \| `string` | `undefined` | The GitHub organization to fork the repo to. Defaults to undefined. |

#### Returns

`Promise`<`string`\>

A promise that resolves to PR URL when the dApp is added or updated. This should
be shown to the user on UI, so that they can visit this URL and create a PR.

#### Defined in

[src/lib/registry.ts:455](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/lib/registry.ts#L455)

___

### buildSearchIndex

▸ `Private` **buildSearchIndex**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[src/lib/registry.ts:213](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/lib/registry.ts#L213)

___

### dApps

▸ **dApps**(`filterOpts?`): `Promise`<[`DAppSchema`](../interfaces/DAppSchema.md)[]\>

Returns the list of dApps that are listed in the registry. You can optionally
filter the results.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `filterOpts` | [`FilterOptions`](../interfaces/FilterOptions.md) | The filter options. Defaults to `{ isListed: true}` |

#### Returns

`Promise`<[`DAppSchema`](../interfaces/DAppSchema.md)[]\>

The list of dApps that are listed in the registry

#### Defined in

[src/lib/registry.ts:428](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/lib/registry.ts#L428)

___

### deleteDapp

▸ **deleteDapp**(`name`, `email`, `accessToken`, `githubID`, `dappId`, `org?`): `Promise`<`string`\>

Deletes the dApp from registry. Only the developer who added this dApp can
delete it.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `name` | `string` | `undefined` | The name of the developer (from GitHub) |
| `email` | `string` | `undefined` | The email of the developer (from Github) |
| `accessToken` | `string` | `undefined` | The JWT access token of the developer (from Github) for user to server API Calls |
| `githubID` | `string` | `undefined` | The GitHub ID of the developer |
| `dappId` | `string` | `undefined` | The ID of the dApp to delete |
| `org` | `undefined` \| `string` | `undefined` | The GitHub organization to fork the repo to. Defaults to undefined. |

#### Returns

`Promise`<`string`\>

A promise that resolves to PR URL when the dApp is deleted. This should
be shown to the user on UI, so that they can visit this URL and create a PR.

#### Defined in

[src/lib/registry.ts:528](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/lib/registry.ts#L528)

___

### filterDapps

▸ `Private` **filterDapps**(`dapps`, `filterOpts`): [`DAppSchema`](../interfaces/DAppSchema.md)[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `dapps` | [`DAppSchema`](../interfaces/DAppSchema.md)[] |
| `filterOpts` | [`FilterOptions`](../interfaces/FilterOptions.md) |

#### Returns

[`DAppSchema`](../interfaces/DAppSchema.md)[]

#### Defined in

[src/lib/registry.ts:218](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/lib/registry.ts#L218)

___

### getFeaturedDapps

▸ **getFeaturedDapps**(): `Promise`<`undefined` \| [`FeaturedSection`](../interfaces/FeaturedSection.md)[]\>

Gets all the featured sections defined in the registry. Along with the dApps.
If no featured section is defined, returns `undefined`

#### Returns

`Promise`<`undefined` \| [`FeaturedSection`](../interfaces/FeaturedSection.md)[]\>

The list of featured sections and the dApps in that section

#### Defined in

[src/lib/registry.ts:866](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/lib/registry.ts#L866)

___

### getRegistryTitle

▸ **getRegistryTitle**(): `Promise`<`string`\>

#### Returns

`Promise`<`string`\>

The title of the registry

#### Defined in

[src/lib/registry.ts:418](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/lib/registry.ts#L418)

___

### ghAppInstallURL

▸ **ghAppInstallURL**(): `Promise`<`string`\>

Get the URL where the user can install the GitHub App

#### Returns

`Promise`<`string`\>

#### Defined in

[src/lib/registry.ts:405](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/lib/registry.ts#L405)

___

### init

▸ **init**(): `Promise`<`void`\>

Initializes the registry. This is required before you can use the registry.
It builds the search Index and caches the registry. Specifically it performs
the following steps
1. If there's no cached Registry or the cached registry is stale, it fetches
  the registry from the remote URL
2. It builds the search index

If the strategy is Static, then the first load will **always** happen from
local registry.json file. Any subsequent calls after TTL will fetch the
registry from the remote URL (if static is stale) & rebuild the search index.

#### Returns

`Promise`<`void`\>

A promise that resolves when the registry is initialized

#### Defined in

[src/lib/registry.ts:380](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/lib/registry.ts#L380)

___

### isGHAppInstalled

▸ **isGHAppInstalled**(`username`): `Promise`<`boolean`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `username` | `string` |

#### Returns

`Promise`<`boolean`\>

#### Defined in

[src/lib/registry.ts:390](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/lib/registry.ts#L390)

___

### localRegistry

▸ `Private` **localRegistry**(): [`DAppStoreSchema`](../interfaces/DAppStoreSchema.md)

#### Returns

[`DAppStoreSchema`](../interfaces/DAppStoreSchema.md)

#### Defined in

[src/lib/registry.ts:90](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/lib/registry.ts#L90)

___

### queryRemoteRegistry

▸ `Private` **queryRemoteRegistry**(`remoteFile`): `Promise`<[`DAppStoreSchema`](../interfaces/DAppStoreSchema.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `remoteFile` | `string` |

#### Returns

`Promise`<[`DAppStoreSchema`](../interfaces/DAppStoreSchema.md)\>

#### Defined in

[src/lib/registry.ts:103](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/lib/registry.ts#L103)

___

### registry

▸ **registry**(): `Promise`<[`DAppStoreSchema`](../interfaces/DAppStoreSchema.md)\>

#### Returns

`Promise`<[`DAppStoreSchema`](../interfaces/DAppStoreSchema.md)\>

#### Defined in

[src/lib/registry.ts:159](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/lib/registry.ts#L159)

___

### removeFeaturedSection

▸ **removeFeaturedSection**(`name`, `email`, `accessToken`, `githubID`, `sectionKey`): `Promise`<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `email` | `string` |
| `accessToken` | `string` |
| `githubID` | `string` |
| `sectionKey` | `string` |

#### Returns

`Promise`<`string`\>

#### Defined in

[src/lib/registry.ts:731](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/lib/registry.ts#L731)

___

### search

▸ **search**(`queryTxt`, `filterOpts?`): [`DAppSchema`](../interfaces/DAppSchema.md)[]

Performs search & filter on the dApps in the registry. This always returns the dApps
that are listed.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `queryTxt` | `string` | The text to search for |
| `filterOpts` | [`FilterOptions`](../interfaces/FilterOptions.md) | The filter options. Defaults to `{ isListed: true}` |

#### Returns

[`DAppSchema`](../interfaces/DAppSchema.md)[]

The filtered & sorted list of dApps

#### Defined in

[src/lib/registry.ts:655](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/lib/registry.ts#L655)

___

### toggleDappInFeaturedSection

▸ **toggleDappInFeaturedSection**(`name`, `email`, `accessToken`, `githubID`, `sectionKey`, `dappIds`): `Promise`<`string`\>

Toggles the dApp in the featured section. If the dApp is already in the section,
it is removed. If it is not in the section, it is added.

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `email` | `string` |
| `accessToken` | `string` |
| `githubID` | `string` |
| `sectionKey` | `string` |
| `dappIds` | `string`[] |

#### Returns

`Promise`<`string`\>

#### Defined in

[src/lib/registry.ts:787](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/lib/registry.ts#L787)

___

### toggleListing

▸ **toggleListing**(`name`, `email`, `accessToken`, `githubID`, `dappId`, `org?`): `Promise`<`string`\>

Toggle the listing of the dApp. Only the developer who added this dApp can
toggle the listing.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `name` | `string` | `undefined` | The name of the developer (from GitHub) |
| `email` | `string` | `undefined` | The email of the developer (from Github) |
| `accessToken` | `string` | `undefined` | The JWT access token of the developer (from Github) for user to server API Calls |
| `githubID` | `string` | `undefined` | The GitHub ID of the developer |
| `dappId` | `string` | `undefined` | The ID of the dApp to toggle listing |
| `org` | `undefined` \| `string` | `undefined` | The GitHub organization to fork the repo to. Defaults to undefined. |

#### Returns

`Promise`<`string`\>

A promise that resolves to PR URL when the dApp is deleted. This should
be shown to the user on UI, so that they can visit this URL and create a PR.

#### Defined in

[src/lib/registry.ts:586](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/lib/registry.ts#L586)

___

### updateRegistry

▸ `Private` **updateRegistry**(`name`, `email`, `githubId`, `accessToken`, `newRegistry`, `commitMessage`, `org?`): `Promise`<`string`\>

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `name` | `string` | `undefined` |
| `email` | `string` | `undefined` |
| `githubId` | `string` | `undefined` |
| `accessToken` | `string` | `undefined` |
| `newRegistry` | [`DAppStoreSchema`](../interfaces/DAppStoreSchema.md) | `undefined` |
| `commitMessage` | `string` | `undefined` |
| `org` | `undefined` \| `string` | `undefined` |

#### Returns

`Promise`<`string`\>

#### Defined in

[src/lib/registry.ts:290](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/lib/registry.ts#L290)

___

### validateRegistryJson

▸ **validateRegistryJson**(`json`): (`string` \| `boolean`)[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `json` | [`DAppStoreSchema`](../interfaces/DAppStoreSchema.md) |

#### Returns

(`string` \| `boolean`)[]

#### Defined in

[src/lib/registry.ts:137](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/lib/registry.ts#L137)
