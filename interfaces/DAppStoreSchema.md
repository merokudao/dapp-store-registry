[@merokudao/dapp-store-registry](../README.md) / [Exports](../modules.md) / DAppStoreSchema

# Interface: DAppStoreSchema

Schema for dApp Store

## Table of contents

### Properties

- [chains](DAppStoreSchema.md#chains)
- [dapps](DAppStoreSchema.md#dapps)
- [featuredSections](DAppStoreSchema.md#featuredsections)
- [title](DAppStoreSchema.md#title)

## Properties

### chains

• **chains**: `number`[]

List of chains supported by the dApp. This should be chainID of an EVM powered network. Ref https://chainlist.org/

#### Defined in

[src/interfaces/registrySchema.ts:15](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/registrySchema.ts#L15)

___

### dapps

• **dapps**: [`DAppSchema`](DAppSchema.md)[]

List of dApps

#### Defined in

[src/interfaces/registrySchema.ts:19](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/registrySchema.ts#L19)

___

### featuredSections

• `Optional` **featuredSections**: [`FeaturedSection`](FeaturedSection.md)[]

#### Defined in

[src/interfaces/registrySchema.ts:21](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/registrySchema.ts#L21)

___

### title

• **title**: `string`

Title of the dApp Store

#### Defined in

[src/interfaces/registrySchema.ts:11](https://github.com/merokudao/dapp-store-registry/blob/ed22941/src/interfaces/registrySchema.ts#L11)
