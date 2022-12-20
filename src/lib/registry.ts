import { fetch } from 'cross-fetch';
import { DAppSchema } from '../interfaces/dAppSchema';
import { FilterOptions } from '../interfaces/searchOptions';
import {  DAppStoreSchema } from '../interfaces/registrySchema';
import * as JsSearch from 'js-search';
import porterStemmer from  '@stdlib/nlp-porter-stemmer';
import parseISO from 'date-fns/parseISO'

import registryJson from './../registry.json';

export enum RegistryStrategy {
  GitHub = 'GitHub',
  Static = 'Static'
}

export class DappStoreRegistry {

  strategy: RegistryStrategy;

  private registryRemoteUrl =
  'https://raw.githubusercontent.com/merokudao/dapp-store-registry/main/src/registry.json';

  private searchEngine = new JsSearch.Search('dappId');

  private cachedRegistry: DAppStoreSchema | undefined;

  constructor(strategy: RegistryStrategy = RegistryStrategy.GitHub) {
    this.strategy = strategy;

    // Configure the search engine Index
    this.searchEngine.indexStrategy = new JsSearch.PrefixIndexStrategy();
    this.searchEngine.tokenizer = new JsSearch.StopWordsTokenizer(
    	new JsSearch.SimpleTokenizer());
    this.searchEngine.tokenizer = new JsSearch.StemmingTokenizer(
      porterStemmer,
      new JsSearch.SimpleTokenizer()
    );
    this.searchEngine.addIndex('name');
    this.searchEngine.addIndex('tags');
  }

  public async init() {
    await this.addDocsForSearch();
  }

  private localRegistry = (): DAppStoreSchema => {
    return registryJson as DAppStoreSchema;
  }

  private static queryRemoteRegistry = async (remoteFile: string): Promise<DAppStoreSchema> => {
    try {
      const response = await fetch(remoteFile);
      const json = (await response.json()) as DAppStoreSchema;
      return json;
    } catch {
      console.info(
        `@merokudao/dapp-store-registry: falling back to static repository.`
      );
      return registryJson as DAppStoreSchema;
    }
  };

  private registry = async (): Promise<DAppStoreSchema> => {
    // TODO - check if remote registry is updated than this.cachedRegistry, then
    // fetch from remote
    if (!this.cachedRegistry) {
      switch (this.strategy) {
        case RegistryStrategy.GitHub:
          return await DappStoreRegistry.queryRemoteRegistry(this.registryRemoteUrl);
        case RegistryStrategy.Static:
          return this.localRegistry();
      }
    } else {
      return this.cachedRegistry;
    }
  };

  private addDocsForSearch = async (): Promise<void> => {
    const docs = (await this.registry()).dapps;
    this.searchEngine.addDocuments(docs);
  };

  /**
   * Returns the list of dApps that are listed in the registry.
   * You would probably not want to call this function in your use case, as it
   * simply returns all the dApps without any filtering.
   * Use the search function instead.
   * @returns The list of dApps that are listed in the registry
   */
  public dApps = async(): Promise<DAppSchema[]> => {
    return (await this.registry()).dapps.filter(d => d.isListed);
  };

  /**
   * Performs search & filter on the dApps in the registry
   * @param queryTxt The text to search for
   * @param filterOpts The filter options. If undefined, no filtering is performed
   * @returns The filtered & sorted list of dApps
   */
  public search = (queryTxt: string, filterOpts: FilterOptions | undefined = undefined): DAppSchema[] => {
    let res =  this.searchEngine.search(queryTxt) as DAppSchema[];

    // Filter to ensure only listed dapps make it to the results
    res = res.filter(d => d.isListed);

    if (filterOpts) {
      if (filterOpts.chainId) {
        const chainId = filterOpts.chainId;
        res = res.filter(d => d.chains.includes(chainId));
      }
      if (filterOpts.language) {
        res = res.filter(d => d.language === filterOpts.language);
      }
      if (filterOpts.availableOnPlatform) {
        const platforms = filterOpts.availableOnPlatform;
        res = res.filter(d => d.availableOnPlatform.some(platforms.includes));
      }
      if (filterOpts.forMatureAudience) {
        res = res.filter(d => d.isForMatureAudience === filterOpts.forMatureAudience);
      }
      if (filterOpts.minAge) {
        const minAge = filterOpts.minAge;
        res = res.filter(d => d.minAge > minAge);
      }
      if (filterOpts.listedOnOrAfter) {
        const listedAfter = filterOpts.listedOnOrAfter;
        res = res.filter(d => parseISO(d.listDate) >= listedAfter);
      }
      if (filterOpts.listedOnOrBefore) {
        const listedBefore = filterOpts.listedOnOrBefore;
        res = res.filter(d => parseISO(d.listDate) <= listedBefore);
      }
      if (filterOpts.allowedInCountries) {
        const allowedCountries = filterOpts.allowedInCountries;
        res = res.filter(d => d.geoRestrictions?.allowedCountries.some(allowedCountries.includes));
      }
      if (filterOpts.blockedInCountries) {
        const blockedCountries = filterOpts.blockedInCountries;
        res = res.filter(d => d.geoRestrictions?.blockedCountries.some(blockedCountries.includes));
      }
      if (filterOpts.categories) {
        const categories = filterOpts.categories;
        res = res.filter(d => categories.includes(d.category));
      }
    }

    return res;
  }

  public getFeaturedDapps = async () => {
    return (await this.registry()).featuredSections;
  }
}
