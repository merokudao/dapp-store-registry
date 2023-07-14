import Dotenv from "dotenv";
import { fetch } from "cross-fetch";
import { DAppSchema, DAppStoreSchema, FilterOptions } from "../interfaces";
import MiniSearch from "minisearch";
import parseISO from "date-fns/parseISO";
import Ajv2019 from "ajv/dist/2019";
import addFormats from "ajv-formats";
// import crypto from "crypto";
import Debug from "debug";

import dAppRegistrySchema from "../schemas/merokuDappStore.registrySchema.json";
import featuredSchema from "../schemas/merokuDappStore.featuredSchema.json";
import dAppDownloadBaseUrlsSchema from "../schemas/merokuDappStore.dAppDownloadBaseUrlsSchema.json";
import dAppImagesSchema from "../schemas/merokuDappStore.dAppImagesSchema.json";
import dAppSchema from "../schemas/merokuDappStore.dAppSchema.json";

import registryJson from "./../registry.json";
import categoryJson from "./../dappCategory.json";
import dappEnrichCustomDetails from "./../dappEnrichCustom.json";

import { getCatSubCatMapping, getDappId } from "./utils";
import _ from "lodash";
import { redisClient } from "../handlers/database/redis";

const DAPP_REGISTRY_CACHE = "DAPP_REGISTRY_CACHE";

Dotenv.config();

const debug = Debug("@merokudao:dapp-store-registry:Registry");

export enum RegistryStrategy {
  GitHub = "GitHub",
  Static = "Static"
}

export class DappStoreRegistry {
  strategy: RegistryStrategy;

  private static TTL = 12 * 60 * 60 * 1000; // 12 hours

  // private lastRegistryCheckedAt: Date | undefined;

  // private initialized = false;

  private readonly githubOwner = "merokudao";
  private readonly githubRepo = "dapp-store-registry";

  public readonly registryRemoteUrl = `https://raw.githubusercontent.com/${this.githubOwner}/${this.githubRepo}/main/src/registry.json`;

  private searchEngine: MiniSearch<any> | undefined;

  // private cachedRegistry: DAppStoreSchema | undefined;

  constructor(strategy: RegistryStrategy = RegistryStrategy.GitHub) {
    this.strategy = strategy;

    this.searchEngine = new MiniSearch({
      idField: "dappId",
      fields: ["name", "description", "dappId", "tags"],
      storeFields: [
        "name",
        "description",
        "dappId",
        "category",
        "appUrl",
        "downloadBaseUrls",
        "contracts",
        "repoUrl",
        "isForMatureAudience",
        "isSelfModerated",
        "language",
        "version",
        "versionCode",
        "isListed",
        "listDate",
        "availableOnPlatform",
        "geoRestrictions",
        "tags",
        "images",
        "chains",
        "minAge",
        "developer",
        "packageId",
        "walletApiVersion",
        "subCategory",
        "expiryDate",
        "referredBy",
        "whitelistedForStores",
        "cdn"
      ],
      searchOptions: { prefix: true }
    });
  }

  private localRegistry = (): DAppStoreSchema => {
    const res = registryJson as DAppStoreSchema;
    const [valid, errors] = DappStoreRegistry.validateRegistryJson(res);
    if (valid) {
      return res;
    } else {
      debug(errors);
      throw new Error(
        `@merokudao/dapp-store-registry: local registry is invalid.`
      );
    }
  };

  private queryRemoteRegistry = async (
    remoteFile: string
  ): Promise<DAppStoreSchema> => {
    debug(`fetching remote registry from ${remoteFile}`);
    let registry: DAppStoreSchema;

    try {
      const response = await fetch(remoteFile);
      if (response.status > 400) {
        throw new Error(
          `@merokudao/dapp-store-registry: remote registry is invalid. status: ${response.status} ${response.statusText}`
        );
      }
      debug(
        `remote registry fetched. status: ${response.status} ${response.statusText}`
      );
      const json = (await response.json()) as DAppStoreSchema;
      const [valid, errors] = DappStoreRegistry.validateRegistryJson(json);
      if (valid) {
        registry = json as DAppStoreSchema;
      } else {
        debug(errors);
        debug(`remote registry is invalid. Falling back to static repository.`);
        registry = this.localRegistry();
      }
    } catch (err) {
      debug(err);
      debug(`Can't fetch remote. falling back to static repository.`);
      registry = this.localRegistry();
    }

    return registry;
  };

  public static validateRegistryJson = (json: DAppStoreSchema) => {
    // find duplicate dapp
    const counts: any = { dappIds: {}, names: {} };
    const duplicates: string[] = [];
    json.dapps.forEach(dapp => {
      const name = dapp.name.toLowerCase();
      const dappId = dapp.dappId;
      counts.dappIds[dappId] = counts.dappIds[dappId]
        ? counts.dappIds[dappId]
        : 0;
      counts.names[name] = counts.names[name] ? counts.names[name] : 0;
      counts.dappIds[dappId] += 1;
      counts.names[name] += 1;
      if (counts.dappIds[dappId] >= 2 || counts.names[name] >= 2) {
        duplicates.push(dapp.dappId);
      }
    });

    if (duplicates.length) {
      debug(`duplicate dapp: ${JSON.stringify(duplicates)}`);
      throw new Error(
        `@merokudao/dapp-store-registry: registry is invalid. dApp IDs must be unique.`
      );
    }

    const ajv = new Ajv2019({
      strict: false
    });
    addFormats(ajv);
    ajv.addSchema(featuredSchema, "featuredSchema");
    ajv.addSchema(dAppDownloadBaseUrlsSchema, "dAppDownloadBaseUrlsSchema");
    ajv.addSchema(dAppImagesSchema, "dAppImagesSchema");
    ajv.addSchema(dAppSchema, "dAppSchema");
    ajv.addFormat("url", /^https?:\/\/.+/);
    const validate = ajv.compile(dAppRegistrySchema);
    const valid = validate(json);
    debug(JSON.stringify(validate.errors));
    return [valid, JSON.stringify(validate.errors)];
  };

  public registry = async (
    isBuildingSearchIndex = false
  ): Promise<DAppStoreSchema> => {
    const cachedRegistry = await redisClient.get(DAPP_REGISTRY_CACHE);
    if (cachedRegistry.length) {
      const parsedRegistry = JSON.parse(cachedRegistry) as DAppStoreSchema;
      debug(`registry cached.,${parsedRegistry.dapps.length}`);
      return parsedRegistry;
    }
    debug(
      "registry not cached. fetching with strategy " + this.strategy + "..."
    );

    if (this.strategy === RegistryStrategy.GitHub) {
      const cachedRegistryRemote = await this.queryRemoteRegistry(
        this.registryRemoteUrl
      );
      redisClient.set(
        DAPP_REGISTRY_CACHE,
        JSON.stringify(cachedRegistryRemote),
        DappStoreRegistry.TTL
      );
      !isBuildingSearchIndex && this.buildSearchIndex(cachedRegistryRemote);
      return cachedRegistryRemote as DAppStoreSchema;
    } else if (this.strategy === RegistryStrategy.Static) {
      const cachedRegistry = this.localRegistry();
      redisClient.set(
        DAPP_REGISTRY_CACHE,
        JSON.stringify(cachedRegistry),
        DappStoreRegistry.TTL
      );
      !isBuildingSearchIndex && this.buildSearchIndex(cachedRegistry);
      return cachedRegistry as DAppStoreSchema;
    }
    throw new Error(
      `@merokudao/dapp-store-registry: invalid registry strategy ${this.strategy}`
    );
    // }
    // this.searchEngine?.addAll(this.cachedRegistry.dapps);
    // } else {
    // if (
    //   this.lastRegistryCheckedAt &&
    //   new Date().getTime() - this.lastRegistryCheckedAt.getTime() <
    //     DappStoreRegistry.TTL
    // ) {
    //   debug("registry cached. returning...");
    //   return cloneable.deepCopy(this.cachedRegistry);
    // }

    // const remoteRegistry = await this.queryRemoteRegistry(
    //   this.registryRemoteUrl
    // );
    // const checksumCached = crypto
    //   .createHash("md5")
    //   .update(JSON.stringify(this.cachedRegistry))
    //   .digest("hex");
    // const checksumRemote = crypto
    //   .createHash("md5")
    //   .update(JSON.stringify(remoteRegistry))
    //   .digest("hex");
    // if (checksumCached !== checksumRemote) {
    //   debug("registry changed. updating...");
    //   this.cachedRegistry = remoteRegistry;
    //   this.lastRegistryCheckedAt = new Date();
    //   // this.searchEngine?.addAll(this.cachedRegistry.dapps);
    // }
    // }

    // return cloneable.deepCopy(this.cachedRegistry);
  };

  private buildSearchIndex = async (
    cachedRegistry: DAppStoreSchema | null
  ): Promise<void> => {
    const docs =
      (cachedRegistry && cachedRegistry.dapps) ||
      (await this.registry(true)).dapps;
    this.searchEngine?.addAll(docs);
  };

  public enrichMetadataForDappStore(storeKey: string, res: DAppSchema[]) {
    const dappStoreEnrichData = dappEnrichCustomDetails.dappStores.find(
      dStores => dStores.key === storeKey
    );
    if (!dappStoreEnrichData) return res;
    dappStoreEnrichData.dappEnrich.forEach(dappEnrichData => {
      const idx = res.findIndex(r => r.dappId === dappEnrichData.dappId);
      if (idx !== -1) res[idx] = _.merge(res[idx], dappEnrichData.fields);
    });
    return res;
  }

  private filterDapps(dapps: DAppSchema[], filterOpts: FilterOptions) {
    let res = dapps;

    if (filterOpts) {
      if (filterOpts.isListed !== undefined) {
        res = res.filter(d => d.isListed === filterOpts.isListed);
      }
      if (filterOpts.chainId) {
        const chainId = filterOpts.chainId;
        res = res.filter(d => d.chains.includes(chainId));
      }

      res = res.filter(
        d => !filterOpts.language || d.language.includes(filterOpts.language)
      );

      if (filterOpts.availableOnPlatform) {
        const platforms = filterOpts.availableOnPlatform;
        res = res.filter(d =>
          d.availableOnPlatform.some(x => platforms.includes(x))
        );
      }
      if (filterOpts.forMatureAudience !== undefined) {
        res = res.filter(
          d => d.isForMatureAudience === filterOpts.forMatureAudience
        );
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
        res = res.filter(d => {
          // return true if any country matches in allowed countries.
          if (d.geoRestrictions && d.geoRestrictions.allowedCountries) {
            return d.geoRestrictions.allowedCountries.some(x =>
              allowedCountries.includes(x)
            );
          }
          // return false if any country matches in blocked countries
          if (d.geoRestrictions && d.geoRestrictions.blockedCountries) {
            return !d.geoRestrictions.blockedCountries.some(x =>
              allowedCountries.includes(x)
            );
          }
          return true;
        });
      }
      if (filterOpts.blockedInCountries) {
        const blockedCountries = filterOpts.blockedInCountries;
        res = res.filter(d => {
          if (d.geoRestrictions && d.geoRestrictions.blockedCountries) {
            return d.geoRestrictions.blockedCountries.some(x =>
              blockedCountries.includes(x)
            );
          }

          // return false if any country matches in allowed countries.
          if (d.geoRestrictions && d.geoRestrictions.allowedCountries) {
            return !d.geoRestrictions.allowedCountries.some(x =>
              blockedCountries.includes(x)
            );
          }
          return false;
        });
      }

      const catSubCatMapping = getCatSubCatMapping(
        filterOpts.categories,
        filterOpts.subCategory
      );

      if (filterOpts.categories) {
        const categories = filterOpts.categories;
        res = res.filter(d => categories.includes(d.category));
      }
      catSubCatMapping.forEach(catD => {
        const { category, subCategory } = catD;
        if (subCategory.length) {
          res = res.filter(
            d =>
              d.category !== category ||
              (d.subCategory && subCategory.includes(d.subCategory))
          );
        }
      });

      if (filterOpts.developer) {
        const developerId = filterOpts.developer.githubID;
        res = res.filter(d => d.developer?.githubID === developerId);
      }

      if (filterOpts.storeKey) {
        const storeKey = filterOpts.storeKey;
        res = res.filter(
          d =>
            d.whitelistedForStores && d.whitelistedForStores.includes(storeKey)
        );
        res = this.enrichMetadataForDappStore(storeKey, res);
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
    const docIndexed = this.searchEngine?.documentCount;
    if (docIndexed && docIndexed > 0) return;
    await this.buildSearchIndex(null);
    // this.initialized = true;
  }

  /**
   *
   * @returns The title of the registry
   */
  public async getRegistryTitle() {
    return (await this.registry()).title;
  }

  /**
   * Returns the list of dApps that are listed in the registry. You can optionally
   * filter the results.
   * @param filterOpts The filter options. Defaults to `{ isListed: true}`
   * @returns The list of dApps that are listed in the registry
   */
  public dApps = async (
    filterOpts: FilterOptions = { isListed: true }
  ): Promise<DAppSchema[]> => {
    let res = (await this.registry()).dapps;

    if (filterOpts) {
      res = this.filterDapps(res, filterOpts);
    }

    return res;
  };

  /**
   * Performs search & filter on the dApps in the registry. This always returns the dApps
   * that are listed.
   * @param queryTxt The text to search for
   * @param filterOpts The filter options. Defaults to `{ isListed: true}`
   * @returns The filtered & sorted list of dApps
   */
  public search = (
    queryTxt: string,
    filterOpts: FilterOptions = { isListed: true }
  ): DAppSchema[] => {
    let res = this.searchEngine?.search(queryTxt) as unknown as DAppSchema[];

    if (filterOpts) {
      res = this.filterDapps(res, filterOpts);
    }

    return res;
  };

  /**
   * search by dapp id
   * @param queryTxt dappId
   * @returns if matches return dappInfo
   */
  public searchByDappId = (queryTxt: string): DAppSchema[] => {
    const res = this.searchEngine?.search(queryTxt, {
      fields: ["dappId"],
      combineWith: "AND"
    }) as unknown as DAppSchema[];
    return res;
  };

  /**
   * Gets all the featured sections defined in the registry. Along with the dApps.
   * If no featured section is defined, returns `undefined`
   * @returns The list of featured sections and the dApps in that section
   */
  public getFeaturedDapps = async () => {
    return (await this.registry()).featuredSections;
  };

  public getAllCategories = () => {
    return categoryJson;
  };

  public getAllDappIds = async (): Promise<number> => {
    const dapps = (await this.registry()).dapps as DAppSchema[];
    const newUrls: string[] = [];
    const newNames: string[] = [];
    try {
      dapps.map(dapp => {
        const dappId = getDappId(dapp.name, dapp.appUrl, [], newUrls, newNames);
        newUrls.push(dapp.appUrl as string);
        newNames.push(dapp.name.toLowerCase());
        return dappId;
      });
      return 200;
    } catch (error) {
      debug(`Error occurred: ${error}`);
      return 400;
    }
  };

  public dropRedisCache = async (key: string) => {
    try {
      await redisClient.delete(key);
      return {
        status: 200
      };
    } catch (error) {
      return {
        status: 400
      };
    }
  };
}
