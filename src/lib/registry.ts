import { fetch } from "cross-fetch";
import { DAppSchema, DAppStoreSchema, FilterOptions } from "../interfaces";
import * as JsSearch from "js-search";
import porterStemmer from "@stdlib/nlp-porter-stemmer";
import parseISO from "date-fns/parseISO";
import Ajv2019 from "ajv/dist/2019";
import addFormats from "ajv-formats";
import crypto from "crypto";
import Debug from "debug";

import dAppRegistrySchema from "../schemas/merokuDappStore.registrySchema.json";
import featuredSchema from "../schemas/merokuDappStore.featuredSchema.json";
import dAppSchema from "../schemas/merokuDappStore.dAppSchema.json";

import registryJson from "./../registry.json";
import { Octokit } from "octokit";

const debug = Debug("@merokudao:dapp-store-registry:Registry");

export enum RegistryStrategy {
  GitHub = "GitHub",
  Static = "Static"
}

export class DappStoreRegistry {
  strategy: RegistryStrategy;

  private static TTL = 10 * 60 * 1000; // 10 minutes

  private lastRegistryCheckedAt: Date | undefined;

  private readonly githubOwner = "merokudao";
  private readonly githubRepo = "dapp-store-registry";

  public readonly registryRemoteUrl = `https://raw.githubusercontent.com/${this.githubOwner}/${this.githubRepo}/main/src/registry.json`;

  private searchEngine = new JsSearch.Search("dappId");

  private cachedRegistry: DAppStoreSchema | undefined;

  constructor(strategy: RegistryStrategy = RegistryStrategy.GitHub) {
    this.strategy = strategy;

    // Configure the search engine Index
    this.searchEngine.indexStrategy = new JsSearch.PrefixIndexStrategy();
    this.searchEngine.tokenizer = new JsSearch.StopWordsTokenizer(
      new JsSearch.SimpleTokenizer()
    );
    this.searchEngine.tokenizer = new JsSearch.StemmingTokenizer(
      porterStemmer,
      new JsSearch.SimpleTokenizer()
    );
    this.searchEngine.addIndex("name");
    this.searchEngine.addIndex("tags");
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
      if (this.validateRegistryJson(json)[0]) {
        registry = json as DAppStoreSchema;
      } else {
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

  private validateRegistryJson = (json: DAppStoreSchema) => {
    const ajv = new Ajv2019({
      strict: false
    });
    addFormats(ajv);
    ajv.addSchema(featuredSchema, "featuredSchema");
    ajv.addSchema(dAppSchema, "dAppSchema");
    const validate = ajv.compile(dAppRegistrySchema);
    const valid = validate(json);
    return [valid, validate.errors];
  };

  private registry = async (): Promise<DAppStoreSchema> => {
    if (!this.cachedRegistry) {
      debug(
        "registry not cached. fetching with strategy " + this.strategy + "..."
      );
      switch (this.strategy) {
        case RegistryStrategy.GitHub:
          this.cachedRegistry = await this.queryRemoteRegistry(
            this.registryRemoteUrl
          );
          this.lastRegistryCheckedAt = new Date();
          break;
        case RegistryStrategy.Static:
          this.cachedRegistry = this.localRegistry();
          break;
        default:
          throw new Error(
            `@merokudao/dapp-store-registry: invalid registry strategy ${this.strategy}`
          );
          break;
      }
      this.searchEngine.addDocuments(this.cachedRegistry.dapps);
    } else {
      if (
        this.lastRegistryCheckedAt &&
        new Date().getTime() - this.lastRegistryCheckedAt.getTime() <
          DappStoreRegistry.TTL
      ) {
        debug("registry cached. returning...");
        return this.cachedRegistry;
      }

      const remoteRegistry = await this.queryRemoteRegistry(
        this.registryRemoteUrl
      );
      const checksumCached = crypto
        .createHash("md5")
        .update(JSON.stringify(this.cachedRegistry))
        .digest("hex");
      const checksumRemote = crypto
        .createHash("md5")
        .update(JSON.stringify(remoteRegistry))
        .digest("hex");
      if (checksumCached !== checksumRemote) {
        debug("registry changed. updating...");
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
      if (filterOpts.isListed !== undefined) {
        res = res.filter(d => d.isListed === filterOpts.isListed);
      }
      if (filterOpts.chainId) {
        const chainId = filterOpts.chainId;
        res = res.filter(d => d.chains.includes(chainId));
      }
      if (filterOpts.language) {
        res = res.filter(d => d.language === filterOpts.language);
      }
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
          if (d.geoRestrictions && d.geoRestrictions.allowedCountries) {
            return d.geoRestrictions.allowedCountries.some(x =>
              allowedCountries.includes(x)
            );
          }
          return false;
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
          return false;
        });
      }
      if (filterOpts.categories) {
        const categories = filterOpts.categories;
        res = res.filter(d => categories.includes(d.category));
      }
      if (filterOpts.developer) {
        const developerId = filterOpts.developer.githubID;
        res = res.filter(d => d.developer?.githubID === developerId);
      }
    }

    return res;
  }

  private async updateRegistry(
    name: string,
    email: string,
    githubId: string,
    accessToken: string,
    newRegistry: DAppStoreSchema,
    commitMessage: string,
    org: string | undefined = undefined
  ) {
    const registryFile = "src/registry.json";

    // Fork repo from merokudao to the authenticated user
    const octokit = new Octokit({
      userAgent: "@merokudao/dAppStore/v1.2.3",
      auth: accessToken
    });

    debug(
      `forking ${this.githubOwner}/${this.githubRepo} to ${githubId}/${this.githubRepo}`
    );
    await octokit.request("POST /repos/{owner}/{repo}/forks", {
      owner: this.githubOwner,
      repo: this.githubRepo,
      organization: org,
      name: this.githubRepo,
      default_branch_only: true
    });
    debug(`forked ${this.githubOwner}/${this.githubRepo} to ${githubId})`);

    // Get the SHA of the registry file
    debug(
      `getting sha of repos/${this.githubOwner}/${this.githubRepo}/contents/{registryFile}`
    );
    const {
      data: { sha }
    } = await octokit.request(
      "GET /repos/{owner}/{repo}/contents/{file_path}",
      {
        owner: this.githubOwner,
        repo: this.githubRepo,
        file_path: registryFile
      }
    );

    // Commit the changes
    // Push the changes to the forked repo
    debug(`pushing changes to ${githubId}/${this.githubRepo}`);
    await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
      owner: githubId,
      repo: this.githubRepo,
      path: registryFile,
      message: commitMessage,
      committer: {
        name: name,
        email: email
      },
      content: Buffer.from(JSON.stringify(newRegistry, null, 2)).toString(
        "base64"
      ),
      sha: sha
    });

    // Open a PR against the main branch of the merokudao repo
    // https://docs.github.com/en/rest/pulls/pulls?apiVersion=2022-11-28#create-a-pull-request
    // Since it's not possible to create a PR from one repo to another, we'll have to
    // resort to returning a URL that, when the user goes to, prompts to create a PR
    const prURL = `https://github.com/${this.githubOwner}/${this.githubRepo}/compare/main...${githubId}:${this.githubRepo}:main?expand=1`;

    debug(`PR URL: ${prURL}`);
    return prURL;
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
   * Adds or updates the dApp in the registry. If the dApp already exists, it
   * updates the dApp. If the dApp doesn't exist, it adds the dApp.
   *
   * Only the developer of the dApp can add or update the dApp.
   * @param name The name of the developer (from GitHub)
   * @param email The email of the developer (from Github)
   * @param accessToken The JWT access token of the developer (from Github) for user to server
   * API Calls
   * @param githubID The GitHub ID of the developer
   * @param dapp The dApp to add or update
   * @param org The GitHub organization to fork the repo to. Defaults to undefined.
   * @returns A promise that resolves to PR URL when the dApp is added or updated. This should
   * be shown to the user on UI, so that they can visit this URL and create a PR.
   */
  public async addOrUpdateDapp(
    name: string,
    email: string,
    accessToken: string,
    githubID: string,
    dapp: DAppSchema,
    org: string | undefined = undefined
  ): Promise<string> {
    const currRegistry = await this.registry();
    const dappExists = currRegistry.dapps.filter(x => x.dappId === dapp.dappId);

    if (dappExists.length === 0) {
      currRegistry.dapps.push(dapp);
    } else if (dappExists.length === 1) {
      if (dapp.developer.githubID !== dappExists[0].developer.githubID) {
        throw new Error(
          `Cannot update dApp ${dapp.dappId} as you are not the owner`
        );
      }
      const idx = currRegistry.dapps.findIndex(x => x.dappId === dapp.dappId);
      currRegistry.dapps[idx] = dapp;
    } else {
      throw new Error(`Multiple dApps with the same ID ${dapp.dappId} found`);
    }

    return await this.updateRegistry(
      name,
      email,
      githubID,
      accessToken,
      currRegistry,
      `add-${dapp.dappId}`,
      org
    );
  }

  /**
   * Deletes the dApp from registry. Only the developer who added this dApp can
   * delete it.
   * @param name The name of the developer (from GitHub)
   * @param email The email of the developer (from Github)
   * @param accessToken The JWT access token of the developer (from Github) for user to server
   * API Calls
   * @param githubID The GitHub ID of the developer
   * @param dappId The ID of the dApp to delete
   * @param org The GitHub organization to fork the repo to. Defaults to undefined.
   * @returns A promise that resolves to PR URL when the dApp is deleted. This should
   * be shown to the user on UI, so that they can visit this URL and create a PR.
   */
  public deleteDapp = async (
    name: string,
    email: string,
    accessToken: string,
    githubID: string,
    dappId: string,
    org: string | undefined = undefined
  ): Promise<string> => {
    const currRegistry = await this.registry();
    const dappExists = currRegistry.dapps.filter(x => x.dappId === dappId);

    if (dappExists.length === 0) {
      throw new Error(`No dApp with the ID ${dappId} found`);
    } else if (dappExists.length === 1) {
      if (
        dappExists[0].developer.githubID !== dappExists[0].developer.githubID
      ) {
        throw new Error(
          `Cannot delete dApp ${dappId} as you are not the owner`
        );
      }
      const idx = currRegistry.dapps.findIndex(x => x.dappId === dappId);
      currRegistry.dapps.splice(idx, 1);
    } else {
      throw new Error(`Multiple dApps with the same ID ${dappId} found`);
    }

    return await this.updateRegistry(
      name,
      email,
      githubID,
      accessToken,
      currRegistry,
      `delete-${dappId}`,
      org
    );
  };

  /**
   * Toggle the listing of the dApp. Only the developer who added this dApp can
   * toggle the listing.
   * @param name The name of the developer (from GitHub)
   * @param email The email of the developer (from Github)
   * @param accessToken The JWT access token of the developer (from Github) for user to server
   * API Calls
   * @param githubID The GitHub ID of the developer
   * @param dappId The ID of the dApp to toggle listing
   * @param org The GitHub organization to fork the repo to. Defaults to undefined.
   * @returns A promise that resolves to PR URL when the dApp is deleted. This should
   * be shown to the user on UI, so that they can visit this URL and create a PR.
   */
  public async toggleListing(
    name: string,
    email: string,
    accessToken: string,
    githubID: string,
    dappId: string,
    org: string | undefined = undefined
  ) {
    const currRegistry = await this.registry();
    const dappExists = currRegistry.dapps.filter(x => x.dappId === dappId);

    if (dappExists.length === 0) {
      throw new Error(`No dApp with the ID ${dappId} found`);
    } else if (dappExists.length === 1) {
      if (
        dappExists[0].developer.githubID !== dappExists[0].developer.githubID
      ) {
        throw new Error(
          `Cannot toggle listing for dApp ${dappId} as you are not the owner`
        );
      }
      const idx = currRegistry.dapps.findIndex(x => x.dappId === dappId);
      currRegistry.dapps[idx].isListed = !currRegistry.dapps[idx].isListed;
    } else {
      throw new Error(`Multiple dApps with the same ID ${dappId} found`);
    }

    return await this.updateRegistry(
      name,
      email,
      githubID,
      accessToken,
      currRegistry,
      `toggle-listing-${dappId}`,
      org
    );
  }

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
    let res = this.searchEngine.search(queryTxt) as DAppSchema[];

    if (filterOpts) {
      res = this.filterDapps(res, filterOpts);
    }

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
}
