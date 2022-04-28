import { fetch } from 'cross-fetch';

import registry from './../registry.json';


export interface Chain {
  readonly name: string;
  readonly chainId: number;
}

export interface Version {
  readonly version: string;
}

export interface Tag {
  readonly name: string;
  readonly description?: string;
}

export interface Dapp {
  readonly name: string;
  readonly repoUrl: string;
  readonly description?: string;
  readonly chains: number[];
  readonly tags: string[];
}

export interface Registry {
  readonly name: string;
  readonly schema: Version;
  readonly tags: Tag[];
  readonly chains: Chain[];
  readonly dapps: Dapp[];
}

export enum Strategy {
  GitHub = 'GitHub',
  Static = 'Static'
}

export class StaticTokenListResolutionStrategy {
  resolve = (): Registry => {
    return registry;
  };
}

const queryJsonFiles = async (files: string[]): Promise<Registry> => {
  const responses: Registry[] = (await Promise.all(
    files.map(async (repo) => {
      try {
        const response = await fetch(repo);
        const json = (await response.json()) as Registry;
        return json;
      } catch {
        console.info(
          `@merokudao/dapp-store-registry: falling back to static repository.`
        );
        return registry;
      }
    })
  )) as Registry[];

  const dApps = responses
    .map((registry: Registry) => registry.dapps)
    .reduce((acc, arr) => (acc as Dapp[]).concat(arr), []);

  return {
    name: responses[0].name,
    schema: responses[0].schema,
    tags: responses[0].tags,
    chains: responses[0].chains,
    dapps: dApps
  };
};

export class GitHubTokenListResolutionStrategy {
  repositories = [
    'https://raw.githubusercontent.com/merokudao/dapp-store-registry/main/src/registry.json',
  ];

  resolve = () => {
    return queryJsonFiles(this.repositories);
  };
}

export class RegistryListProvider {
  static strategies = {
    [Strategy.GitHub]: new GitHubTokenListResolutionStrategy(),
    [Strategy.Static]: new StaticTokenListResolutionStrategy()
  };

  resolve = async (
    strategy: Strategy = Strategy.Static
  ): Promise<RegistryContainer> => {
    return new RegistryContainer(
      await RegistryListProvider.strategies[strategy].resolve()
    );
  };
}

const getKeyValue = <U extends keyof T, T extends object>(key: U) => (obj: T) => {
  return obj[key];
};


export class RegistryContainer {
  private registry: Registry;

  constructor(registry: Registry) {
    this.registry = registry;
  }

  public fromThis(this: RegistryContainer, dapps: Dapp[]): RegistryContainer {
    return new RegistryContainer({
      name: this.registry.name,
      schema: this.registry.schema,
      tags: this.registry.tags,
      chains: this.registry.chains,
      dapps: dapps
    })
  };

  /**
   * Creates a new instance of the registry container with the dapps filtered by tag
   * @param tag
   * @returns
   */
  filterByTag = (tag: string) => {
    return this.fromThis(this.registry.dapps.filter(dapp => {
      return dapp.tags.some(t => t.toLocaleLowerCase().includes(tag));
    }));
  };

  filterByChainId = (chainId: number) => {
    const dApps = this.registry.dapps.filter((item) => item.chains.includes(chainId));
    return this.fromThis(dApps);
  };

  searchForText = (queryTxt: string, queryFields: string[]) => {
    const dApps = this.registry.dapps.filter((dapp: Dapp) => {
      return queryFields.some((field: string) => {
        const val = getKeyValue<keyof Dapp, Dapp>(field as keyof Dapp)(dapp);
        if (val && typeof val === 'string') {
          return val.toLowerCase().includes(queryTxt.toLowerCase());
        }
        return false;
      });
    });
    return this.fromThis(dApps);

  };

  getRegistry = () => {
    return this.registry;
  };

  getDapps = () => {
    return this.registry.dapps;
  };
}
