[@merokudao/dapp-store-registry](../README.md) / [Exports](../modules.md) / DAppSchema

# Interface: DAppSchema

A schema for dapps for dApp Registry

## Table of contents

### Properties

- [appUrl](DAppSchema.md#appurl)
- [availableOnPlatform](DAppSchema.md#availableonplatform)
- [category](DAppSchema.md#category)
- [chains](DAppSchema.md#chains)
- [contracts](DAppSchema.md#contracts)
- [dappId](DAppSchema.md#dappid)
- [description](DAppSchema.md#description)
- [developer](DAppSchema.md#developer)
- [downloadBaseUrls](DAppSchema.md#downloadbaseurls)
- [geoRestrictions](DAppSchema.md#georestrictions)
- [images](DAppSchema.md#images)
- [isForMatureAudience](DAppSchema.md#isformatureaudience)
- [isListed](DAppSchema.md#islisted)
- [isSelfModerated](DAppSchema.md#isselfmoderated)
- [language](DAppSchema.md#language)
- [listDate](DAppSchema.md#listdate)
- [minAge](DAppSchema.md#minage)
- [name](DAppSchema.md#name)
- [repoUrl](DAppSchema.md#repourl)
- [tags](DAppSchema.md#tags)
- [version](DAppSchema.md#version)

## Properties

### appUrl

• `Optional` **appUrl**: `string`

The URL of the dApp. This is optional. If specified, the dApp will be shown as a
link on the dApp store

**`Format`**

uri

**`Pattern`**

^https?://

#### Defined in

[src/interfaces/dAppSchema.ts:55](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/dAppSchema.ts#L55)

___

### availableOnPlatform

• **availableOnPlatform**: (``"android"`` \| ``"ios"`` \| ``"web"``)[]

A string signifying if the dApp is available on which platform - web, iOS, android

**`Min Items`**

1

#### Defined in

[src/interfaces/dAppSchema.ts:114](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/dAppSchema.ts#L114)

___

### category

• **category**: ``"books"`` \| ``"business"`` \| ``"developer tools"`` \| ``"education"`` \| ``"entertainment"`` \| ``"finance"`` \| ``"food and drink"`` \| ``"games"`` \| ``"graphics and design"`` \| ``"health and fitness"`` \| ``"lifestyle"`` \| ``"kids"`` \| ``"magazines and newspapers"`` \| ``"medical"`` \| ``"music"`` \| ``"navigation"`` \| ``"news"`` \| ``"photo and video"`` \| ``"productivity"`` \| ``"reference"`` \| ``"shopping"`` \| ``"social networking"`` \| ``"sports"`` \| ``"travel"`` \| ``"utilities"`` \| ``"weather"``

#### Defined in

[src/interfaces/dAppSchema.ts:144](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/dAppSchema.ts#L144)

___

### chains

• **chains**: `number`[]

**`Min Items`**

1

#### Defined in

[src/interfaces/dAppSchema.ts:142](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/dAppSchema.ts#L142)

___

### contracts

• `Optional` **contracts**: { `address`: `string` ; `chainId`: `string`  }[]

#### Defined in

[src/interfaces/dAppSchema.ts:66](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/dAppSchema.ts#L66)

___

### dappId

• **dappId**: `string`

A Unique ID for each dApp.

#### Defined in

[src/interfaces/dAppSchema.ts:83](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/dAppSchema.ts#L83)

___

### description

• **description**: `string`

A detailed description of the dApp

#### Defined in

[src/interfaces/dAppSchema.ts:47](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/dAppSchema.ts#L47)

___

### developer

• `Optional` **developer**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `githubID` | `string` | - |
| `legalName` | `string` | Legal name of the developer or the company |
| `logo` | `string` | - |
| `privacyPolicyUrl` | `string` | - |
| `support` | { `email?`: `string` ; `url`: `string`  } | - |
| `support.email?` | `string` | - |
| `support.url` | `string` | - |
| `website` | `string` | - |

#### Defined in

[src/interfaces/dAppSchema.ts:121](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/dAppSchema.ts#L121)

___

### downloadBaseUrls

• `Optional` **downloadBaseUrls**: { `architecture`: `string` ; `maxVersion?`: `string` ; `minVersion`: `string` ; `platform`: ``"android"`` \| ``"ios"`` \| ``"web"`` ; `screenDPI?`: `string` ; `url`: `string`  }[]

#### Defined in

[src/interfaces/dAppSchema.ts:57](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/dAppSchema.ts#L57)

___

### geoRestrictions

• `Optional` **geoRestrictions**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `allowedCountries?` | `string`[] |
| `blockedCountries?` | `string`[] |

#### Defined in

[src/interfaces/dAppSchema.ts:116](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/dAppSchema.ts#L116)

___

### images

• `Optional` **images**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `banner?` | `string` |
| `logo?` | `string` |
| `screenshots?` | `string`[] |

#### Defined in

[src/interfaces/dAppSchema.ts:71](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/dAppSchema.ts#L71)

___

### isForMatureAudience

• **isForMatureAudience**: `boolean`

Boolean to signify if the dApp is for mature audience

#### Defined in

[src/interfaces/dAppSchema.ts:91](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/dAppSchema.ts#L91)

___

### isListed

• **isListed**: `boolean`

#### Defined in

[src/interfaces/dAppSchema.ts:104](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/dAppSchema.ts#L104)

___

### isSelfModerated

• **isSelfModerated**: `boolean`

Boolean to signify if the dApp developers have a moderation in place for the content posted/generated by the dApp or it's users

#### Defined in

[src/interfaces/dAppSchema.ts:95](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/dAppSchema.ts#L95)

___

### language

• **language**: `string`

A string in ISO-639-1 which signifies the language of the dApp

#### Defined in

[src/interfaces/dAppSchema.ts:99](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/dAppSchema.ts#L99)

___

### listDate

• **listDate**: `string`

The date on which this dApp is listed on dApp store. This date can be a future date as well. This can not be in past.

#### Defined in

[src/interfaces/dAppSchema.ts:108](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/dAppSchema.ts#L108)

___

### minAge

• **minAge**: `number`

The min age of user who should access this dApp

#### Defined in

[src/interfaces/dAppSchema.ts:87](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/dAppSchema.ts#L87)

___

### name

• **name**: `string`

The name of the dApp. This is what is shown on listing

#### Defined in

[src/interfaces/dAppSchema.ts:43](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/dAppSchema.ts#L43)

___

### repoUrl

• `Optional` **repoUrl**: `string`

If this is in OpenSource, the URL of the repository

#### Defined in

[src/interfaces/dAppSchema.ts:79](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/dAppSchema.ts#L79)

___

### tags

• `Optional` **tags**: `string`[]

**`Min Items`**

1

#### Defined in

[src/interfaces/dAppSchema.ts:138](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/dAppSchema.ts#L138)

___

### version

• **version**: `string`

The version of the dApp that is available on the dApp store

#### Defined in

[src/interfaces/dAppSchema.ts:103](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/dAppSchema.ts#L103)
