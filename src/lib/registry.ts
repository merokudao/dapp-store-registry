import { fetch } from 'cross-fetch';
import {  DAppSchema, DAppStoreSchema, FilterOptions } from '../interfaces';
import * as JsSearch from 'js-search';
import porterStemmer from  '@stdlib/nlp-porter-stemmer';
import parseISO from 'date-fns/parseISO';
import Ajv2019 from "ajv/dist/2019";
import addFormats from 'ajv-formats';
import crypto from 'crypto';

import dAppRegistrySchema from '../schemas/merokuDappStore.registrySchema.json';
import featuredSchema from '../schemas/merokuDappStore.featuredSchema.json';
import dAppSchema from '../schemas/merokuDappStore.dAppSchema.json';

import registryJson from './../registry.json';

export enum RegistryStrategy {
  GitHub = 'GitHub',
  Static = 'Static'
}

export class DappStoreRegistry {

  strategy: RegistryStrategy;

  private static TTL = 10 * 60 * 1000; // 10 minutes

  private lastRegistryCheckedAt: Date | undefined;

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

  private localRegistry = (): DAppStoreSchema => {
    const res = registryJson as DAppStoreSchema;
    if (this.validateRegistryJson(res)[0]) {
      return res;
    } else {
      throw new Error(
        `@merokudao/dapp-store-registry: local registry is invalid.`
      );
    }
  }

  private queryRemoteRegistry = async (remoteFile: string): Promise<DAppStoreSchema> => {
    let registry: DAppStoreSchema;
    try {
      const response = await fetch(remoteFile);
      const json = (await response.json()) as DAppStoreSchema;
      if (this.validateRegistryJson(json)[0]) {
        registry =  json as DAppStoreSchema;
      } else {
        console.info(
          `@merokudao/dapp-store-registry: remote registry is invalid. Falling back to static repository.`
        );
        registry = this.localRegistry();
      }
    } catch {
      console.info(
        `@merokudao/dapp-store-registry: Can't fetch remote. falling back to static repository.`
      );
      registry = this.localRegistry();
    }
    return registry;
  };

  private validateRegistryJson = (json: DAppStoreSchema) => {
    const ajv = new Ajv2019({
      strict: false
    });
    addFormats(ajv);
    ajv.addSchema(featuredSchema, 'featuredSchema');
    ajv.addSchema(dAppSchema, 'dAppSchema');
    const validate = ajv.compile(dAppRegistrySchema);
    const valid = validate(json);
    return [valid, validate.errors];
  }

  private registry = async (): Promise<DAppStoreSchema> => {
    if (!this.cachedRegistry) {
      switch (this.strategy) {
        case RegistryStrategy.GitHub:
          this.cachedRegistry = await this.queryRemoteRegistry(this.registryRemoteUrl);
          this.lastRegistryCheckedAt = new Date();
        case RegistryStrategy.Static:
          this.cachedRegistry = this.localRegistry();
      }
      this.searchEngine.addDocuments(this.cachedRegistry.dapps);
    } else {
      if (this.lastRegistryCheckedAt &&
        new Date().getTime() - this.lastRegistryCheckedAt.getTime() < DappStoreRegistry.TTL) {
        return this.cachedRegistry;
      }

      const remoteRegistry = await this.queryRemoteRegistry(this.registryRemoteUrl);
      const checksumCached = crypto
        .createHash('md5')
        .update(JSON.stringify(this.cachedRegistry))
        .digest('hex');
      const checksumRemote = crypto
        .createHash('md5')
        .update(JSON.stringify(remoteRegistry))
        .digest('hex');
      if (checksumCached !== checksumRemote) {
        this.cachedRegistry = remoteRegistry;
        this.lastRegistryCheckedAt = new Date();
        this.searchEngine.addDocuments(this.cachedRegistry.dapps);
      }
    }

    return this.cachedRegistry;
  };

  private buildSearchIndex = async (): Promise<void> => {
    const docs = (await this.registry()).dapps;
    this.searchEngine.addDocuments(docs);
  };

  private filterDapps(dapps: DAppSchema[], filterOpts: FilterOptions) {
    let res = dapps;

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

  /**
   * Initializes the registry. This is required before you can use the registry.
   * It builds the search Index and caches the registry. Specifically it performs
   * the following steps
   * 1. If there's no cached Registry or the cached registry is stale, it fetches
   *   the registry from the remote URL
   * 2. It builds the search index
   *
   * If the strategy is Static, then the first load will **always** happen from
   * local registry.json file. Any subsequent calls after TTL will fetch the
   * registry from the remote URL (if static is stale) & rebuild the search index.
   * @returns A promise that resolves when the registry is initialized
   */
  public async init() {
    await this.buildSearchIndex();
  }

  /**
   * Returns the list of dApps that are listed in the registry. You can optionally
   * filter the results. This always returns the dApps that are listed.
   * @param filterOpts The filter options. If undefined, no filtering is performed
   * @returns The list of dApps that are listed in the registry
   */
  public dApps = async(filterOpts: FilterOptions | undefined = undefined): Promise<DAppSchema[]> => {
    let res = (await this.registry()).dapps.filter(d => d.isListed);

    if (filterOpts) {
      res = this.filterDapps(res, filterOpts);
    }

    return res;
  };

  /**
   * Performs search & filter on the dApps in the registry. This always returns the dApps
   * that are listed.
   * @param queryTxt The text to search for
   * @param filterOpts The filter options. If undefined, no filtering is performed
   * @returns The filtered & sorted list of dApps
   */
  public search = (queryTxt: string, filterOpts: FilterOptions | undefined = undefined): DAppSchema[] => {
    let res =  this.searchEngine.search(queryTxt) as DAppSchema[];

    // Filter to ensure only listed dapps make it to the results
    res = res.filter(d => d.isListed);

    if (filterOpts) {
      res = this.filterDapps(res, filterOpts);
    }

    return res;
  }

  /**
   * Gets all the featured sections defined in the registry. Along with the dApps.
   * If no featured section is defined, returns `undefined`
   * @returns The list of featured sections and the dApps in that section
   */
  public getFeaturedDapps = async () => {
    return (await this.registry()).featuredSections;
  }
}
