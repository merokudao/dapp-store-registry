[@merokudao/dapp-store-registry](../README.md) / [Exports](../modules.md) / FilterOptions

# Interface: FilterOptions

## Table of contents

### Properties

- [allowedInCountries](FilterOptions.md#allowedincountries)
- [availableOnPlatform](FilterOptions.md#availableonplatform)
- [blockedInCountries](FilterOptions.md#blockedincountries)
- [categories](FilterOptions.md#categories)
- [chainId](FilterOptions.md#chainid)
- [developer](FilterOptions.md#developer)
- [forMatureAudience](FilterOptions.md#formatureaudience)
- [isListed](FilterOptions.md#islisted)
- [language](FilterOptions.md#language)
- [listedOnOrAfter](FilterOptions.md#listedonorafter)
- [listedOnOrBefore](FilterOptions.md#listedonorbefore)
- [minAge](FilterOptions.md#minage)

## Properties

### allowedInCountries

• `Optional` **allowedInCountries**: `string`[]

While filtering, an OR operation is performed on the elements of the array.
This means that the dapp must be allowed in at least one of the countries in the array.

#### Defined in

[src/interfaces/filterOptions.ts:24](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/filterOptions.ts#L24)

___

### availableOnPlatform

• `Optional` **availableOnPlatform**: `string`[]

While filtering, an OR operation is performed on the elements of the array.
This means that the dapp must be available on at least one of the platforms in the array.

#### Defined in

[src/interfaces/filterOptions.ts:10](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/filterOptions.ts#L10)

___

### blockedInCountries

• `Optional` **blockedInCountries**: `string`[]

While filtering, an OR operation is performed on the elements of the array.
This means that the dapp must be blocked in at least one of the countries in the array.

#### Defined in

[src/interfaces/filterOptions.ts:30](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/filterOptions.ts#L30)

___

### categories

• `Optional` **categories**: `string`[]

#### Defined in

[src/interfaces/filterOptions.ts:32](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/filterOptions.ts#L32)

___

### chainId

• `Optional` **chainId**: `number`

#### Defined in

[src/interfaces/filterOptions.ts:2](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/filterOptions.ts#L2)

___

### developer

• `Optional` **developer**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `githubID` | `string` |

#### Defined in

[src/interfaces/filterOptions.ts:36](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/filterOptions.ts#L36)

___

### forMatureAudience

• `Optional` **forMatureAudience**: `boolean`

#### Defined in

[src/interfaces/filterOptions.ts:12](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/filterOptions.ts#L12)

___

### isListed

• `Optional` **isListed**: `boolean`

#### Defined in

[src/interfaces/filterOptions.ts:34](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/filterOptions.ts#L34)

___

### language

• `Optional` **language**: `string`

#### Defined in

[src/interfaces/filterOptions.ts:4](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/filterOptions.ts#L4)

___

### listedOnOrAfter

• `Optional` **listedOnOrAfter**: `Date`

#### Defined in

[src/interfaces/filterOptions.ts:16](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/filterOptions.ts#L16)

___

### listedOnOrBefore

• `Optional` **listedOnOrBefore**: `Date`

#### Defined in

[src/interfaces/filterOptions.ts:18](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/filterOptions.ts#L18)

___

### minAge

• `Optional` **minAge**: `number`

#### Defined in

[src/interfaces/filterOptions.ts:14](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/filterOptions.ts#L14)
