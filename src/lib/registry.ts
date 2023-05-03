import Dotenv from "dotenv";
import { fetch } from "cross-fetch";
import {
  DAppSchema,
  DAppStoreSchema,
  FeaturedSection,
  FilterOptions
} from "../interfaces";
import MiniSearch from "minisearch";
import parseISO from "date-fns/parseISO";
import Ajv2019 from "ajv/dist/2019";
import addFormats from "ajv-formats";
import crypto from "crypto";
import Debug from "debug";

import dAppRegistrySchema from "../schemas/merokuDappStore.registrySchema.json";
import featuredSchema from "../schemas/merokuDappStore.featuredSchema.json";
import dAppSchema from "../schemas/merokuDappStore.dAppSchema.json";

import registryJson from "./../registry.json";
import categoryJson from "./../dappCategory.json";

import { Octokit } from "octokit";
import { createAppAuth } from "@octokit/auth-app";
import { cloneable } from "./utils";

Dotenv.config();

const debug = Debug("@merokudao:dapp-store-registry:Registry");

export enum RegistryStrategy {
  GitHub = "GitHub",
  Static = "Static"
}

export class DappStoreRegistry {
  strategy: RegistryStrategy;

  private static TTL = 10 * 60 * 1000; // 10 minutes

  private lastRegistryCheckedAt: Date | undefined;

  private initialized = false;

  private readonly githubOwner = "merokudao";
  private readonly githubRepo = "dapp-store-registry";

  public readonly registryRemoteUrl = `https://raw.githubusercontent.com/${this.githubOwner}/${this.githubRepo}/main/src/registry.json`;

  private searchEngine: MiniSearch<any> | undefined;

  private cachedRegistry: DAppStoreSchema | undefined;

  private appOctokit: Octokit | undefined = undefined;

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
      ],
      searchOptions: { prefix: true }
    });
  }

  private localRegistry = (): DAppStoreSchema => {
    const res = registryJson as DAppStoreSchema;
    const [valid, errors] = this.validateRegistryJson(res);
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
      const [valid, errors] = this.validateRegistryJson(json);
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

  public validateRegistryJson = (json: DAppStoreSchema) => {
    const dAppIDs = json.dapps.map(dapp => dapp.dappId);
    // find duplicate dapp
    const counts: any = {};
    const duplicaes: any = [];
    dAppIDs.forEach(item => {
      counts[item] = counts[item] ? counts[item] : 0;
      counts[item] += 1;
      if (counts[item] >= 2) {
        duplicaes.push(item);
      }
    });

    if (duplicaes.length) {
      debug(`duplicate dapp: ${JSON.stringify(duplicaes)}`);
      throw new Error(
        `@merokudao/dapp-store-registry: registry is invalid. dApp IDs must be unique.`
      );
    }

    const ajv = new Ajv2019({
      strict: false
    });
    addFormats(ajv);
    ajv.addSchema(featuredSchema, "featuredSchema");
    ajv.addSchema(dAppSchema, "dAppSchema");
    ajv.addFormat("url", /^https?:\/\/.+/);
    const validate = ajv.compile(dAppRegistrySchema);
    const valid = validate(json);
    debug(JSON.stringify(validate.errors));
    return [valid, JSON.stringify(validate.errors)];
  };

  public registry = async (): Promise<DAppStoreSchema> => {
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
      // this.searchEngine?.addAll(this.cachedRegistry.dapps);
    } else {
      if (
        this.lastRegistryCheckedAt &&
        new Date().getTime() - this.lastRegistryCheckedAt.getTime() <
          DappStoreRegistry.TTL
      ) {
        debug("registry cached. returning...");
        return cloneable.deepCopy(this.cachedRegistry);
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
        // this.searchEngine?.addAll(this.cachedRegistry.dapps);
      }
    }

    return cloneable.deepCopy(this.cachedRegistry);
  };

  private buildSearchIndex = async (): Promise<void> => {
    const docs = (await this.registry()).dapps;
    this.searchEngine?.addAll(docs);
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
      if (filterOpts.categories) {
        const categories = filterOpts.categories;
        res = res.filter(d => categories.includes(d.category));
      }

      if (filterOpts.subCategory) {
        const subCategory = filterOpts.subCategory;
        res = res.filter(d => d.subCategory && subCategory.includes(d.subCategory));
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
      `getting sha of repos/${githubId}/${this.githubRepo}/contents/${registryFile}`
    );
    const {
      data: { sha }
    } = await octokit.request(
      "GET /repos/{owner}/{repo}/contents/{file_path}",
      {
        owner: githubId,
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

  // private githubContributors = async () => {
  //   const contributors = await this.appOctokit.rest.repos.listContributors();
  //   return contributors.data.map(c => c.login).filter((c): c is string => !!c);
  // };

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
    if (!this.initialized) {
      await this.buildSearchIndex();

      if (this.appOctokit) {
        await this.appOctokit.rest.apps.getAuthenticated();
      }
      this.initialized = true;
    }
  }

  public isGHAppInstalled = async (username: string): Promise<boolean> => {
    if (!this.appOctokit) {
      return false;
    }
    const { data: installations } =
      await this.appOctokit.rest.apps.listInstallations();
    return installations.some(i =>
      i.account ? i.account.login === username : false
    );
  };

  /**
   * Get the URL where the user can install the GitHub App
   * @returns
   */
  public ghAppInstallURL = async () => {
    if (this.appOctokit) {
      const { data: app } = await this.appOctokit.rest.apps.getAuthenticated();
      return `${app.html_url}/installations/new`;
    } else {
      return "";
    }
  };

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
    if (!dapp.developer) {
      throw new Error(`Developer is unknown in dApp ${dapp.dappId}.`);
    }
    if (dapp.developer.githubID !== githubID) {
      throw new Error(
        `Cannot add/update dApp ${dapp.dappId} as you are not the owner`
      );
    }

    if (!dapp.dappId.endsWith(".dapp")) {
      throw new Error(
        `dApp ID ${dapp.dappId} is invalid. It must end with .dapp`
      );
    }

    const currRegistry = await this.registry();
    const dappExists = currRegistry.dapps.filter(x => x.dappId === dapp.dappId);

    if (dappExists.length === 0) {
      currRegistry.dapps.push(dapp);
    } else if (dappExists.length === 1) {
      if (!dappExists[0].developer) {
        throw new Error(`Developer is unknown in dApp ${dapp.dappId}.`);
      }
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

    // Validate the registry
    const [valid, errors] = this.validateRegistryJson(currRegistry);
    if (!valid) {
      throw new Error(`This update leads to Invalid registry.json: ${errors}`);
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
      if (!dappExists[0].developer) {
        throw new Error(`Developer is unknown in dApp ${dappId}.`);
      }
      if (dappExists[0].developer.githubID !== githubID) {
        throw new Error(
          `Cannot delete dApp ${dappId} as you are not the owner`
        );
      }
      const idx = currRegistry.dapps.findIndex(x => x.dappId === dappId);
      currRegistry.dapps.splice(idx, 1);
    } else {
      throw new Error(`Multiple dApps with the same ID ${dappId} found`);
    }

    // Validate the registry.json
    const [valid, errors] = this.validateRegistryJson(currRegistry);
    if (!valid) {
      throw new Error(`This update leads to Invalid registry.json.: ${errors}`);
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
    let isListed: boolean;

    if (dappExists.length === 0) {
      throw new Error(`No dApp with the ID ${dappId} found`);
    } else if (dappExists.length === 1) {
      if (!dappExists[0].developer) {
        throw new Error(`Developer is unknown in dApp ${dappId}.`);
      }
      if (dappExists[0].developer.githubID !== githubID) {
        throw new Error(
          `Cannot toggle listing for dApp ${dappId} as you are not the owner`
        );
      }
      const idx = currRegistry.dapps.findIndex(x => x.dappId === dappId);
      currRegistry.dapps[idx].isListed = !currRegistry.dapps[idx].isListed;
      isListed = currRegistry.dapps[idx].isListed;
    } else {
      throw new Error(`Multiple dApps with the same ID ${dappId} found`);
    }

    if (!isListed) {
      // Remove the dApp from the search index
      // Remove the dapp from any featured section
      const currFeaturedSections = currRegistry.featuredSections;
      if (currFeaturedSections) {
        for (const section of currFeaturedSections) {
          const idx = section.dappIds.findIndex(x => x === dappId);
          if (idx !== -1) {
            section.dappIds.splice(idx, 1);
            debug(`Removed ${dappId} from featured section ${section.key}`);
          }
        }
      }
    }

    // Validate the registry.json
    const [valid, errors] = this.validateRegistryJson(currRegistry);
    if (!valid) {
      throw new Error(`This update leads to Invalid registry.json.: ${errors}`);
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

  public addFeaturedSection = async (
    name: string,
    email: string,
    accessToken: string,
    githubID: string,
    section: FeaturedSection
  ) => {
    // const contributors = await this.githubContributors();
    // if (!contributors.includes(githubID)) {
    //   throw new Error(
    //     `You are not a contributor to the registry. Please contact the registry maintainers to add you as a contributor`
    //   );
    // }
    const currFeaturedSections = await this.getFeaturedDapps();

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

    const currRegistry = await this.registry();
    // Make sure the dapp ids exist in the registry
    section.dappIds.forEach(dappId => {
      if (
        currRegistry.dapps.filter(x => x.dappId === dappId && x.isListed)
          .length === 0
      ) {
        throw new Error(
          `dApp ID ${dappId} not found or not listed in registry`
        );
      }
    });

    if (currRegistry.featuredSections) {
      currRegistry.featuredSections.push(section);
    } else {
      currRegistry.featuredSections = [section];
    }

    // Validate the registry.json
    const [valid, errors] = this.validateRegistryJson(currRegistry);
    if (!valid) {
      throw new Error(`This update leads to Invalid registry.json.: ${errors}`);
    }

    return await this.updateRegistry(
      name,
      email,
      githubID,
      accessToken,
      currRegistry,
      `add-featured-section-${section.title}`,
      undefined
    );
  };

  public removeFeaturedSection = async (
    name: string,
    email: string,
    accessToken: string,
    githubID: string,
    sectionKey: string
  ) => {
    // const contributors = await this.githubContributors();
    // if (!contributors.includes(githubID)) {
    //   throw new Error(
    //     `You are not a contributor to the registry. Please contact the registry maintainers to add you as a contributor`
    //   );
    // }

    const currRegistry = await this.registry();
    if (!currRegistry.featuredSections) {
      throw new Error(`No featured sections found`);
    }

    const idx = currRegistry.featuredSections.findIndex(
      x => x.key === sectionKey
    );
    if (idx === -1) {
      throw new Error(`No featured section with key ${sectionKey} found`);
    }

    currRegistry.featuredSections.splice(idx, 1);

    // Validate the registry.json
    const [valid, errors] = this.validateRegistryJson(currRegistry);
    if (!valid) {
      throw new Error(`This update leads to Invalid registry.json.: ${errors}`);
    }

    return await this.updateRegistry(
      name,
      email,
      githubID,
      accessToken,
      currRegistry,
      `remove-featured-section-${sectionKey}`,
      undefined
    );
  };

  /**
   * Toggles the dApp in the featured section. If the dApp is already in the section,
   * it is removed. If it is not in the section, it is added.
   * @param name
   * @param email
   * @param accessToken
   * @param githubID
   * @param sectionKey
   * @param dappIds
   * @returns
   */
  public toggleDappInFeaturedSection = async (
    name: string,
    email: string,
    accessToken: string,
    githubID: string,
    sectionKey: string,
    dappIds: string[]
  ) => {
    // const contributors = await this.githubContributors();
    // if (!contributors.includes(githubID)) {
    //   throw new Error(
    //     `You are not a contributor to the registry. Please contact the registry maintainers to add you as a contributor`
    //   );
    // }

    const currRegistry = await this.registry();
    const currFeaturedSections = currRegistry.featuredSections;
    if (!currFeaturedSections) {
      throw new Error(`No featured sections defined in the registry`);
    }
    const sectionIndex = currFeaturedSections.findIndex(
      x => x.key === sectionKey
    );
    if (sectionIndex < 0) {
      throw new Error(`No section with key ${sectionKey} found`);
    }
    // Make sure the dappIds exist in the registry

    const dappIdsToRemove = dappIds.filter(dappId =>
      currFeaturedSections[sectionIndex].dappIds.includes(dappId)
    );
    const dappIdsToAdd = dappIds.filter(
      dappId => !currFeaturedSections[sectionIndex].dappIds.includes(dappId)
    );
    dappIdsToAdd.map(x => {
      const exist = currRegistry.dapps.filter(
        y => y.dappId === x && y.isListed
      );
      if (exist.length === 0) {
        throw new Error(`dApp ID ${x} not found or not listed in registry`);
      }
      if (exist.length > 1) {
        throw new Error(`Multiple dApps with the same ID ${x} found`);
      }
    });
    debug(`Removing ${dappIdsToRemove} from featured section ${sectionKey}`);
    debug(`Adding ${dappIdsToAdd} to featured section ${sectionKey}`);

    currFeaturedSections[sectionIndex].dappIds =
      currFeaturedSections[sectionIndex].dappIds.concat(dappIdsToAdd);

    currFeaturedSections[sectionIndex].dappIds = currFeaturedSections[
      sectionIndex
    ].dappIds.filter(x => !dappIdsToRemove.includes(x));

    currRegistry.featuredSections = currFeaturedSections;

    // Validate the registry.json
    const [valid, errors] = this.validateRegistryJson(currRegistry);
    if (!valid) {
      throw new Error(`This update leads to Invalid registry.json.: ${errors}`);
    }

    return await this.updateRegistry(
      name,
      email,
      githubID,
      accessToken,
      currRegistry,
      `add-dapp-to-featured-section-${sectionKey}-${dappIds.join("-")}`,
      undefined
    );
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
  }
}
