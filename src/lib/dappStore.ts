import Debug from "debug";
import { RegistryStrategy } from "./registry";
import { cacheStoreOrRegistry } from "./utils";
import { EnrichSchema, StoresSchema } from "../interfaces/dAppStoreSchema";
import { FeaturedSection } from "../interfaces";
import dAppEnrichImagesSchema from "../schemas/merokuDappStore.dAppEnrichImagesSchema.json";
import dAppEnrichSchema from "../schemas/merokuDappStore.dAppEnrich.json";
import Ajv2019 from "ajv/dist/2019";
import addFormats from "ajv-formats";
import categoryJson from "../dappStoreCategory.json";

const debug = Debug("@merokudao:dapp-store-registry:Stores");

export class DappStores {
  strategy: RegistryStrategy;

  private static TTL = 10 * 60 * 1000; // 10 minutes

  private lastStoresCheckedAt: Date | undefined;

  private initialized = false;

  private readonly githubOwner = "merokudao";
  private readonly githubRepo = "dapp-store-registry";

  public readonly storesRemoteUrl = `https://raw.githubusercontent.com/${this.githubOwner}/${this.githubRepo}/main/src/dappStore.json`;

  private cachedStores: StoresSchema | undefined;

  private schema = "stores";

  constructor(strategy: RegistryStrategy = RegistryStrategy.GitHub) {
    this.strategy = strategy;
  }

  public async init() {
    if (!this.initialized) {
      await this.dappStores();
      this.initialized = true;
    }
  }

  public dappStores = async (): Promise<StoresSchema> => {
    const result = await cacheStoreOrRegistry(
      this.storesRemoteUrl,
      this.cachedStores,
      this.strategy,
      this.schema,
      this.lastStoresCheckedAt,
      DappStores.TTL
    );
    this.cachedStores = result[0] as StoresSchema;
    this.lastStoresCheckedAt = result[1];
    return this.cachedStores;
  };

  public async getStore(key: string) {
    const currDappStores = await this.dappStores();
    const store = currDappStores.dappStores.find(x => x.key === key);
    if (!store) {
      throw new Error(`No store with key ${key} found`);
    }

    return store;
  }

  /**
   * Gets all the featured sections defined in th2e store. Along with the dApps.
   * If no featured section is defined, returns `undefined`
   * @returns The list of featured sections and the dApps in that section
   */
  public getFeaturedDapps = async (storeKey: string) => {
    const currDappStores = await this.dappStores();
    const currStore = currDappStores.dappStores.find(x => x.key === storeKey);
    if (!currStore) {
      debug(`No Store Found with ${storeKey}`);
      return new Array<FeaturedSection>();
    }
    const currFeaturedSections = currStore.featuredSections;
    if (!currFeaturedSections) {
      debug(`No featured sections defined in the store`);
      return new Array<FeaturedSection>();
    }
    return currFeaturedSections;
  };

  /**
   * validate dapp enrich details for dapps
   * when a appstore is overiding the metadata of dapps
   * @param json
   * @returns
   */
  public validateDappEnrichSchema = (payload: EnrichSchema) => {
    const ajv = new Ajv2019({
      strict: false
    });
    addFormats(ajv);
    ajv.addSchema(dAppEnrichImagesSchema, "dAppEnrichImagesSchema");
    ajv.addSchema(dAppEnrichSchema, "dAppEnrichSchema");
    ajv.addFormat("url", /^https?:\/\/.+/);
    const validate = ajv.compile(dAppEnrichSchema);
    const valid = validate(payload);
    debug(JSON.stringify(validate.errors));
    return [valid, JSON.stringify(validate.errors)];
  };

  /**
   * get all category for dappStore
   * @returns
   */
  public getAllCategories = () => {
    return categoryJson;
  };
}
