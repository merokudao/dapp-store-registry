import Debug from "debug";
import { Octokit } from "octokit";
import { DappStoreRegistry, RegistryStrategy } from "./registry";
import { createAppAuth } from "@octokit/auth-app";
import {
  cacheStoreOrRegistry,
  isExistInRegistry,
  updateRegistryOrStores,
  validateSchema
} from "./utils";
import { StoreSchema, StoresSchema } from "../interfaces/dAppStoreSchema";
import { FeaturedSection } from "../interfaces";

const debug = Debug("@merokudao:dapp-store-registry:Stores");

const DappRegistry = new DappStoreRegistry();

export class DappStores {
  strategy: RegistryStrategy;

  private static TTL = 10 * 60 * 1000; // 10 minutes

  private lastStoresCheckedAt: Date | undefined;

  private initialized = false;

  private readonly githubOwner = "merokudao";
  private readonly githubRepo = "dapp-store-registry";

  public readonly storesRemoteUrl = `https://raw.githubusercontent.com/${this.githubOwner}/${this.githubRepo}/main/src/dappStore.json`;

  private cachedStores: StoresSchema | undefined;

  private appOctokit: Octokit | undefined = undefined;

  private schema = "stores";

  constructor(strategy: RegistryStrategy = RegistryStrategy.GitHub) {
    this.strategy = strategy;
    if (
      process.env.GITHUB_APP_ID &&
      process.env.GITHUB_APP_PRIVATE_KEY &&
      process.env.GITHUB_CLIENT_ID &&
      process.env.GITHUB_CLIENT_SECRET
    ) {
      this.appOctokit = new Octokit({
        authStrategy: createAppAuth,
        auth: {
          appId: process.env.GITHUB_APP_ID,
          privateKey: process.env.GITHUB_APP_PRIVATE_KEY,
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET
        }
      });
    }
  }

  public async init() {
    if (!this.initialized) {
      await this.dappStores();

      if (this.appOctokit) {
        await this.appOctokit.rest.apps.getAuthenticated();
      }
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

  /**
   * Adds the store in the dappStores.
   * Only the owner of the store can add or update the store.
   * @param name The name of the owner (from GitHub)
   * @param email The email of the owner (from Github)
   * @param accessToken The JWT access token of the owner (from Github) for user to server
   * API Calls
   * @param githubID The GitHub ID of the owner
   * @param store The store to add or update
   * @param org The GitHub organization to fork the repo to. Defaults to undefined.
   * @returns A promise that resolves to PR URL when the dApp is added or updated. This should
   * be shown to the user on UI, so that they can visit this URL and create a PR.
   */
  public async addStore(
    name: string,
    email: string,
    accessToken: string,
    githubID: string,
    store: StoreSchema,
    org: string | undefined = undefined
  ): Promise<string> {
    if (store.githubId !== githubID) {
      throw new Error(`Cannot add store ${store.key} as you are not the owner`);
    }

    if (!store.key.endsWith(".dappstore")) {
      throw new Error(
        `Unique id ${store.key} is invalid. It must end with .dappstore`
      );
    }

    const currDappStores = await this.dappStores();
    const storeExists = currDappStores.dappStores.filter(
      x => x.key === store.key
    );

    if (storeExists.length === 1) {
      throw new Error(`Store already exist with the ID ${store.key}`);
    }

    // store not exist than add new store.
    currDappStores.dappStores.push(store);

    // Validate the dappStores
    const [valid, errors] = validateSchema(currDappStores);
    if (!valid) {
      throw new Error(`This update leads to Invalid dappStore.json: ${errors}`);
    }

    return await updateRegistryOrStores(
      name,
      email,
      githubID,
      accessToken,
      currDappStores,
      `add-${store.key}`,
      org,
      this.githubOwner,
      this.githubRepo,
      this.schema
    );
  }

  /**
   * updates store in the dappStores.
   * Only the owner of the store can add or update the store.
   * @param name The name of the owner (from GitHub)
   * @param email The email of the owner (from Github)
   * @param accessToken The JWT access token of the owner (from Github) for user to server
   * API Calls
   * @param githubID The GitHub ID of the owner
   * @param store The store to add or update
   * @param org The GitHub organization to fork the repo to. Defaults to undefined.
   * @returns A promise that resolves to PR URL when the dApp is added or updated. This should
   * be shown to the user on UI, so that they can visit this URL and create a PR.
   */
  public async updateStore(
    name: string,
    email: string,
    accessToken: string,
    githubID: string,
    store: StoreSchema,
    org: string | undefined = undefined
  ): Promise<string> {
    if (store.githubId !== githubID) {
      throw new Error(
        `Cannot add/update store ${store.key} as you are not the owner`
      );
    }

    if (!store.key.endsWith(".dappstore")) {
      throw new Error(
        `Unique id ${store.key} is invalid. It must end with .dappstore`
      );
    }

    const currDappStores = await this.dappStores();
    const storeExists = currDappStores.dappStores.filter(
      x => x.key === store.key
    );

    if (!storeExists.length) {
      throw new Error(`Store not exist with the ID ${store.key}`);
    }

    // store exist than update the store
    const idx = currDappStores.dappStores.findIndex(x => x.key === store.key);
    currDappStores.dappStores[idx] = store;

    // Validate the dappStores
    const [valid, errors] = validateSchema(currDappStores);
    if (!valid) {
      throw new Error(`This update leads to Invalid dappStore.json: ${errors}`);
    }

    return await updateRegistryOrStores(
      name,
      email,
      githubID,
      accessToken,
      currDappStores,
      `update-${store.key}`,
      org,
      this.githubOwner,
      this.githubRepo,
      this.schema
    );
  }

  /**
   * Deletes the store from dappStores. Only the developer who added this store can
   * delete it.
   * @param name The name of the developer (from GitHub)
   * @param email The email of the developer (from Github)
   * @param accessToken The JWT access token of the developer (from Github) for user to server
   * API Calls
   * @param githubID The GitHub ID of the developer
   * @param key The ID of the store to delete
   * @param org The GitHub organization to fork the repo to. Defaults to undefined.
   * @returns A promise that resolves to PR URL when the dApp is deleted. This should
   * be shown to the user on UI, so that they can visit this URL and create a PR.
   */
  public deleteStore = async (
    name: string,
    email: string,
    accessToken: string,
    githubID: string,
    key: string,
    org: string | undefined = undefined
  ): Promise<string> => {
    const currDappStores = await this.dappStores();
    const storeExists = currDappStores.dappStores.filter(x => x.key === key);

    if (!storeExists.length) {
      throw new Error(`No store with the ID ${key} found`);
    }

    // store exits
    if (!storeExists[0].githubId) {
      throw new Error(`Developer is unknown in dApp ${key}.`);
    }
    if (storeExists[0].githubId !== githubID) {
      throw new Error(`Cannot delete store ${key} as you are not the owner`);
    }
    const idx = currDappStores.dappStores.findIndex(x => x.key === key);
    currDappStores.dappStores.splice(idx, 1);

    // Validate the registry.json
    const [valid, errors] = validateSchema(currDappStores);
    if (!valid) {
      throw new Error(
        `This update leads to Invalid dappStore.json.: ${errors}`
      );
    }

    return await updateRegistryOrStores(
      name,
      email,
      githubID,
      accessToken,
      currDappStores,
      `delete-${key}`,
      org,
      this.githubOwner,
      this.githubRepo,
      this.schema
    );
  };

  /**
   * Toggles the dApp in the banned list. If the dApp is already in the list,
   * it is removed. If it is not in the list, it is added.
   * @param name
   * @param email
   * @param accessToken
   * @param githubID
   * @param key
   * @param dappIds
   * @returns
   */
  public toggleDappInBannedList = async (
    name: string,
    email: string,
    accessToken: string,
    githubID: string,
    key: string,
    dappIds: string[]
  ) => {
    const currDappStores = await this.dappStores();
    const currStore = currDappStores.dappStores.find(x => x.key === key);
    if (!currStore) {
      throw new Error(`No store defined in the dappStores`);
    }
    const storeIndex = currDappStores.dappStores.findIndex(x => x.key === key);
    if (storeIndex < 0) {
      throw new Error(`No store with key ${key} found`);
    }
    if (currStore.bannedDAppIds) {
      const dappIdsToRemove = dappIds.filter(dappId =>
        currStore.bannedDAppIds.includes(dappId)
      );
      const dappIdsToAdd = dappIds.filter(
        dappId => !currStore.bannedDAppIds.includes(dappId)
      );
      // Make sure the dappIds exist in the registry
      await isExistInRegistry(dappIdsToAdd, DappRegistry);
      debug(`Removing ${dappIdsToRemove} from banned list ${key}`);
      debug(`Adding ${dappIdsToAdd} to from banned list ${key}`);

      currStore.bannedDAppIds = currStore.bannedDAppIds.concat(dappIdsToAdd);

      currStore.bannedDAppIds = currStore.bannedDAppIds.filter(
        x => !dappIdsToRemove.includes(x)
      );

      currDappStores.dappStores[storeIndex] = currStore;
    } else {
      // Make sure the dappIds exist in the registry
      await isExistInRegistry(dappIds, DappRegistry);
      currStore.bannedDAppIds = dappIds;
      currDappStores.dappStores[storeIndex] = currStore;
    }

    // Validate the registry.json
    const [valid, errors] = validateSchema(currDappStores);
    if (!valid) {
      throw new Error(
        `This update leads to Invalid dappStore.json.: ${errors}`
      );
    }

    return await updateRegistryOrStores(
      name,
      email,
      githubID,
      accessToken,
      currDappStores,
      `add-dapp-to-bannedList-of-${key}-${dappIds.join("-")}`,
      undefined,
      this.githubOwner,
      this.githubRepo,
      this.schema
    );
  };

  public async getStore(key: string) {
    const currDappStores = await this.dappStores();
    const store = currDappStores.dappStores.find(x => x.key === key);
    if (!store) {
      throw new Error(`No store with key ${key} found`);
    }

    return store;
  }

  public addFeaturedSection = async (
    name: string,
    email: string,
    accessToken: string,
    githubID: string,
    storeKey: string,
    section: FeaturedSection
  ) => {
    const currDappStores = await this.dappStores();
    const currStoreIndex = currDappStores.dappStores.findIndex(
      x => x.key === storeKey
    );
    const currStore = currDappStores.dappStores[currStoreIndex];
    const currFeaturedSections = currStore.featuredSections;

    // Ensure that a section with same name doesn't already exists
    if (
      currFeaturedSections &&
      currFeaturedSections.filter(x => x.title === section.title).length > 0
    ) {
      throw new Error(`A section with name ${section.title} already exists`);
    }

    if (section.dappIds.length === 0) {
      throw new Error(`A section must have at least one dApp`);
    }

    // Make sure the dapp ids exist in the registry
    await isExistInRegistry(section.dappIds, DappRegistry);

    if (currStore.featuredSections) {
      currStore.featuredSections.push(section);
    } else {
      currStore.featuredSections = [section];
    }

    currDappStores.dappStores[currStoreIndex] = currStore;

    // Validate the registry.json
    const [valid, errors] = validateSchema(currDappStores);
    if (!valid) {
      throw new Error(
        `This update leads to Invalid dappStore.json.: ${errors}`
      );
    }

    return await updateRegistryOrStores(
      name,
      email,
      githubID,
      accessToken,
      currDappStores,
      `add-featured-section-${section.title}-in-store-${storeKey}`,
      undefined,
      this.githubOwner,
      this.githubRepo,
      this.schema
    );
  };

  public removeFeaturedSection = async (
    name: string,
    email: string,
    accessToken: string,
    githubID: string,
    storeKey: string,
    sectionKey: string
  ) => {
    const currDappStores = await this.dappStores();
    const currStoreIndex = currDappStores.dappStores.findIndex(
      x => x.key === storeKey
    );
    const currStore = currDappStores.dappStores[currStoreIndex];
    if (!currStore.featuredSections) {
      throw new Error(`No featured sections found`);
    }

    const idx = currStore.featuredSections.findIndex(x => x.key === sectionKey);
    if (idx === -1) {
      throw new Error(`No featured section with key ${sectionKey} found`);
    }

    currStore.featuredSections.splice(idx, 1);

    currDappStores.dappStores[currStoreIndex] = currStore;

    // Validate the registry.json
    const [valid, errors] = validateSchema(currDappStores);
    if (!valid) {
      throw new Error(
        `This update leads to Invalid dappStore.json.: ${errors}`
      );
    }

    return await updateRegistryOrStores(
      name,
      email,
      githubID,
      accessToken,
      currDappStores,
      `remove-featured-section-${sectionKey}-in-store-${storeKey}`,
      undefined,
      this.githubOwner,
      this.githubRepo,
      this.schema
    );
  };

  /**
   * Toggles the dApp in the featured section. If the dApp is already in the section,
   * it is removed. If it is not in the section, it is added.
   * @param name
   * @param email
   * @param accessToken
   * @param githubID
   * @param storeKey
   * @param sectionKey
   * @param dappIds
   * @returns
   */
  public toggleDappInFeaturedSection = async (
    name: string,
    email: string,
    accessToken: string,
    githubID: string,
    storeKey: string,
    sectionKey: string,
    dappIds: string[]
  ) => {
    const currDappStores = await this.dappStores();
    const currStoreIndex = currDappStores.dappStores.findIndex(
      x => x.key === storeKey
    );
    const currStore = currDappStores.dappStores[currStoreIndex];
    const currFeaturedSections = currStore.featuredSections;
    if (!currFeaturedSections) {
      throw new Error(`No featured sections defined in the store`);
    }
    const sectionIndex = currFeaturedSections.findIndex(
      x => x.key === sectionKey
    );
    if (sectionIndex < 0) {
      throw new Error(`No section with key ${sectionKey} found`);
    }
    const dappIdsToRemove = dappIds.filter(dappId =>
      currFeaturedSections[sectionIndex].dappIds.includes(dappId)
    );
    const dappIdsToAdd = dappIds.filter(
      dappId => !currFeaturedSections[sectionIndex].dappIds.includes(dappId)
    );
    // Make sure the dappIds exist in the registry
    await isExistInRegistry(dappIdsToAdd, DappRegistry);
    debug(`Removing ${dappIdsToRemove} from featured section ${sectionKey}`);
    debug(`Adding ${dappIdsToAdd} to featured section ${sectionKey}`);

    currFeaturedSections[sectionIndex].dappIds =
      currFeaturedSections[sectionIndex].dappIds.concat(dappIdsToAdd);

    currFeaturedSections[sectionIndex].dappIds = currFeaturedSections[
      sectionIndex
    ].dappIds.filter(x => !dappIdsToRemove.includes(x));

    currStore.featuredSections = currFeaturedSections;

    // Validate the registry.json
    const [valid, errors] = validateSchema(currDappStores);
    if (!valid) {
      throw new Error(
        `This update leads to Invalid dappStore.json.: ${errors}`
      );
    }

    return await updateRegistryOrStores(
      name,
      email,
      githubID,
      accessToken,
      currDappStores,
      `add-dapp-to-featured-section-${sectionKey}-in-store-${storeKey}`,
      undefined,
      this.githubOwner,
      this.githubRepo,
      this.schema
    );
  };

  /**
   * Gets all the featured sections defined in th2e store. Along with the dApps.
   * If no featured section is defined, returns `undefined`
   * @returns The list of featured sections and the dApps in that section
   */
  public getFeaturedDapps = async (storeKey: string) => {
    const currDappStores = await this.dappStores();
    const currStore = currDappStores.dappStores.find(x => x.key === storeKey);
    if (!currStore) {
      return "No Store Found";
    }
    return currStore.featuredSections;
  };
}
