import registry from './../registry.json';

export interface Version {
  readonly version: string;
}

export interface Tag {
  readonly name: string;
  readonly description: string;
}

export interface Dapp {
  name: string;
  repoUrl: string;
}

export interface Registry {
  readonly name: string;
  readonly schema: Version;
  readonly tags: Tag[];
  readonly dapps: Dapp[];
}
