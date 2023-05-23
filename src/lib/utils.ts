import * as opensearchConfig from "../handlers/opensearch-handlers/config.json";

const {
  _source: { autocompleteFields, searchFields }
} = opensearchConfig;
import {
  DAppStoreSchema,
  StoresSchema,
  OpenSearchCompositeQuery,
  PaginationQuery,
  DappEnrichPayload,
  EnrichSchema,
  ScreenShotSchema,
  DAppSchema
} from "../interfaces";
import storesJson from "../dappStore.json";
import registryJson from "./../registry.json";
import Debug from "debug";
import Ajv2019 from "ajv/dist/2019";
import addFormats from "ajv-formats";
import dAppStoreSchema from "../schemas/merokuDappStore.dAppStore.json";
import dAppEnrichSchema from "../schemas/merokuDappStore.dAppEnrich.json";
import dAppStoresSchema from "../schemas/merokuDappStore.dAppStores.json";
import dAppRegistrySchema from "../schemas/merokuDappStore.registrySchema.json";
import featuredSchema from "../schemas/merokuDappStore.featuredSchema.json";
import dAppSchema from "../schemas/merokuDappStore.dAppSchema.json";
import { DappStoreRegistry, RegistryStrategy } from "./registry";
import crypto from "crypto";
import { Octokit } from "octokit";

const debug = Debug("@merokudao:dapp-store-registry:utils");

export class cloneable {
  public static deepCopy<T>(source: T): T {
    return Array.isArray(source)
      ? source.map(item => this.deepCopy(item))
      : source instanceof Date
      ? new Date(source.getTime())
      : source && typeof source === "object"
      ? Object.getOwnPropertyNames(source).reduce((o, prop) => {
          Object.defineProperty(
            o,
            prop,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            Object.getOwnPropertyDescriptor(source, prop)!
          );
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          o[prop] = this.deepCopy((source as { [key: string]: any })[prop]);
          return o;
        }, Object.create(Object.getPrototypeOf(source)))
      : (source as T);
  }
}

export const recordsPerPage = 20;
export const recordsPerPageAutoComplete = 7;

/**
 * return order
 * @param params
 * @returns
 */
export const orderBy = (params: any) => {
  const order: any = [{ _score: { order: "desc" } }];
  try {
    params = JSON.parse(params);
  } catch (error) {
    //
  }
  const {
    rating = null,
    visits = null,
    installs = null,
    listDate = null,
    name = null
  } = params;
  if (rating) {
    order.push({ "metrics.rating": { order: rating } });
  }
  if (visits) {
    order.push({ "metrics.visits": { order: visits } });
  }
  if (installs) {
    order.push({ "metrics.installs": { order: installs } });
  }

  if (listDate) {
    order.push({ listDate: { order: listDate } });
  }

  if (name) {
    order.push({ nameKeyword: { order: name } });
  }
  return order;
};

export const validateSchema = (json: StoresSchema | DAppStoreSchema) => {
  let uniqueIDs: string[];
  if ("title" in json) {
    uniqueIDs = json.dapps.map(dapp => dapp.dappId);
  } else {
    uniqueIDs = json.dappStores.map(dapp => dapp.key);
  }
  const uniqueStoreIDs = Array.from(new Set(uniqueIDs));
  if (uniqueIDs.length !== uniqueStoreIDs.length) {
    throw new Error(
      `@merokudao/dapp-store-registry: stores is invalid. key IDs must be unique.`
    );
  }

  const ajv = new Ajv2019({
    strict: false
  });
  addFormats(ajv);
  let validate;
  if ("title" in json) {
    // registry
    ajv.addSchema(featuredSchema, "featuredSchema");
    ajv.addSchema(dAppSchema, "dAppSchema");
    ajv.addFormat("url", /^https?:\/\/.+/);
    validate = ajv.compile(dAppRegistrySchema);
  } else {
    // dAppStores
    ajv.addSchema(featuredSchema, "featuredSchema");
    ajv.addSchema(dAppStoreSchema, "dAppStoreSchema");
    ajv.addSchema(dAppEnrichSchema, "dappsEnrich");
    validate = ajv.compile(dAppStoresSchema);
  }
  const valid = validate(json);
  debug(JSON.stringify(validate.errors));
  return [valid, JSON.stringify(validate.errors)];
};

export const local = (schema: string): StoresSchema | DAppStoreSchema => {
  // const res = storesJson as storesSchema;
  let res;
  if (schema === "registry") {
    res = registryJson as DAppStoreSchema;
  } else {
    res = storesJson as unknown as StoresSchema;
  }
  const [valid, errors] = validateSchema(res);
  if (valid) {
    return res;
  } else {
    debug(errors);
    throw new Error(
      `@merokudao/dapp-store-registry: local ${schema} is invalid.`
    );
  }
};

export const queryRemote = async (
  remoteFile: string,
  schema: string
): Promise<StoresSchema | DAppStoreSchema> => {
  debug(`fetching remote ${schema} from ${remoteFile}`);
  try {
    const response = await fetch(remoteFile);
    if (response.status > 400) {
      throw new Error(
        `@merokudao/dapp-store-registry: remote ${schema} is invalid. status: ${response.status} ${response.statusText}`
      );
    }
    debug(
      `remote ${schema} fetched. status: ${response.status} ${response.statusText}`
    );

    const json =
      schema === "registry"
        ? ((await response.json()) as DAppStoreSchema)
        : ((await response.json()) as StoresSchema);

    const [valid, errors] = validateSchema(json);
    if (!valid) {
      debug(errors);
      debug(`remote ${schema} is invalid. Falling back to static repository.`);
      return local(schema);
    }
    if (schema === "registry") {
      return json as DAppStoreSchema;
    }
    return json as StoresSchema;
  } catch (err) {
    debug(err);
    debug(`Can't fetch remote. falling back to static ${schema}.`);
    return local(schema);
  }
};

export const cacheStoreOrRegistry = async (
  remoteFile: string,
  cached: DAppStoreSchema | StoresSchema | undefined,
  strategy: RegistryStrategy,
  schema: string,
  lastCheckedAt: Date | undefined,
  TTL: number
): Promise<[DAppStoreSchema | StoresSchema, Date | undefined]> => {
  if (!cached) {
    debug(`${schema} not cached. fetching with strategy " + strategy + "...`);
    switch (strategy) {
      case RegistryStrategy.GitHub:
        cached = await queryRemote(remoteFile, schema);
        lastCheckedAt = new Date();
        break;
      case RegistryStrategy.Static:
        cached = local(schema);
        break;
      default:
        throw new Error(
          `@merokudao/dapp-store-registry: invalid registry strategy ${strategy}`
        );
        break;
    }
    // this.searchEngine?.addAll(this.cachedRegistry.dapps);
  } else {
    if (lastCheckedAt && new Date().getTime() - lastCheckedAt.getTime() < TTL) {
      debug(`${schema} cached. returning...`);
      return [cloneable.deepCopy(cached), lastCheckedAt];
    }

    const remote = await queryRemote(remoteFile, schema);
    const checksumCached = crypto
      .createHash("md5")
      .update(JSON.stringify(cached))
      .digest("hex");
    const checksumRemote = crypto
      .createHash("md5")
      .update(JSON.stringify(remote))
      .digest("hex");
    if (checksumCached !== checksumRemote) {
      debug(`${schema} changed. updating...`);
      cached = remote;
      lastCheckedAt = new Date();
      // this.searchEngine?.addAll(this.cachedRegistry.dapps);
    }
  }

  return [cloneable.deepCopy(cached), lastCheckedAt];
};

export const updateRegistryOrStores = async (
  name: string,
  email: string,
  githubId: string,
  accessToken: string,
  newRegistry: DAppStoreSchema | StoresSchema,
  commitMessage: string,
  org: string | undefined = undefined,
  githubOwner: string,
  githubRepo: string,
  schema: string
) => {
  const filePath =
    schema === "registry" ? "src/registry.json" : "src/dappStore.json";
  // Fork repo from merokudao to the authenticated user
  const octokit = new Octokit({
    userAgent: "@merokudao/dAppStore/v1.2.3",
    auth: accessToken
  });

  debug(`forking ${githubOwner}/${githubRepo} to ${githubId}/${githubRepo}`);
  await octokit.request("POST /repos/{owner}/{repo}/forks", {
    owner: githubOwner,
    repo: githubRepo,
    organization: org,
    name: githubRepo,
    default_branch_only: true
  });
  debug(`forked ${githubOwner}/${githubRepo} to ${githubId})`);

  // Get the SHA of the registry file
  debug(`getting sha of repos/${githubId}/${githubRepo}/contents/${filePath}`);
  const {
    data: { sha }
  } = await octokit.request("GET /repos/{owner}/{repo}/contents/{file_path}", {
    owner: githubId,
    repo: githubRepo,
    file_path: filePath
  });

  // Commit the changes
  // Push the changes to the forked repo
  debug(`pushing changes to ${githubId}/${githubRepo}`);
  await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
    owner: githubId,
    repo: githubRepo,
    path: filePath,
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
  const prURL = `https://github.com/${githubOwner}/${githubRepo}/compare/main...${githubId}:${githubRepo}:main?expand=1`;

  debug(`PR URL: ${prURL}`);
  return prURL;
};

/**
 * It will check that dapps exist in registry or not.
 */
export const isExistInRegistry = async (
  dappIds: string[],
  DappRegistry: DappStoreRegistry
) => {
  const currRegistry = await DappRegistry.registry();
  dappIds.forEach(x => {
    const exist = currRegistry.dapps.filter(y => y.dappId === x && y.isListed);
    if (exist.length === 0) {
      throw new Error(`dApp ID ${x} not found or not listed in registry`);
    }
    if (exist.length > 1) {
      throw new Error(`Multiple dApps with the same ID ${x} found`);
    }
  });
};

/**
 * It will check that dapps exist in registry or not.
 */
export const dappMustExistInRegistry = async (
  dappIds: string[],
  DappRegistry: DappStoreRegistry
) => {
  const currRegistry = await DappRegistry.registry();
  dappIds.forEach(x => {
    const exist = currRegistry.dapps.filter(y => y.dappId === x && y.isListed);
    if (exist.length === 0) {
      throw new Error(`dApp ID ${x} not found or not listed in registry`);
    }
  });
  return;
};

export const searchFilters = (
  search: string,
  payload: any,
  autoComplete = false
): { finalQuery: PaginationQuery; limit: number } => {
  const query: OpenSearchCompositeQuery = {
    bool: {
      must: [],
      must_not: [],
      should: [],
      filter: []
    }
  };
  const {
    isForMatureAudience = null,
    minAge = null,
    chainId = null,
    language = null,
    availableOnPlatform = null,
    listedOnOrAfter = null,
    listedOnOrBefore = null,
    allowedInCountries = null,
    blockedInCountries = null,
    categories = null,
    subCategories = null,
    isListed = "true",
    developer = null,
    page = 1,
    dappId = null,
    searchById = false,
    ownerAddress = null
  } = payload;
  let { limit = recordsPerPage } = payload;

  // eslint-disable-next-line no-extra-boolean-cast
  if (!!isForMatureAudience)
    query.bool.must.push({
      match: {
        isForMatureAudience: isForMatureAudience === "true" ? true : false
      }
    });
  if (minAge) query.bool.must.push({ range: { minAge: { gte: minAge } } });
  if (chainId) query.bool.must.push({ match: { chains: chainId } });
  if (language) query.bool.must.push({ match: { language } });
  if (availableOnPlatform)
    query.bool.must.push({
      terms: { availableOnPlatform }
    });
  if (listedOnOrAfter)
    query.bool.must.push({ range: { listDate: { gte: listedOnOrAfter } } });
  if (listedOnOrBefore)
    query.bool.must.push({ range: { listDate: { lte: listedOnOrBefore } } });

  // it should be filter users location current not more then one country
  if (allowedInCountries && allowedInCountries.length) {
    query.bool.should.push({
      terms: { "geoRestrictions.allowedCountries": allowedInCountries }
    });
    allowedInCountries.forEach((ac: string) => {
      query.bool.must_not.push({
        term: { "geoRestrictions.blockedCountries": ac }
      });
    });
  }
  // it should be filter users location current not more then one country
  if (blockedInCountries && blockedInCountries.length)
    query.bool.must.push({
      terms: { "geoRestrictions.blockedCountries": blockedInCountries }
    });

  if (developer && developer.githubID)
    query.bool.must.push({
      match: { "developer.githubID": developer.githubID.trim() }
    });
  if (categories && categories.length)
    query.bool.must.push({
      terms: {
        category: categories
      }
    });

  if (subCategories && subCategories.length)
    query.bool.must.push({
      terms: {
        subCategory: subCategories
      }
    });

  if (dappId) query.bool.must.push({ term: { dappId: dappId.trim() } });

  // search on customer string
  if (!!search && search.length) {
    query.bool.should.push({
      match: { name: { query: search, operator: "and" } }
    });
    query.bool.should.push({
      match: { description: { query: search, operator: "and" } }
    });
    query.bool.should.push({
      match: { daapId: { query: search, operator: "and" } }
    });
    query.bool.should.push({
      match: { category: { query: search, operator: "and" } }
    });
    query.bool.filter.push({
      term: { isListed: isListed === "true" ? true : false }
    });
  }

  if (ownerAddress) query.bool.must.push({ match: { ownerAddress } });

  if (isListed && !searchById && !search && !ownerAddress)
    query.bool.must.push({
      match: { isListed: isListed === "true" ? true : false }
    });

  payload.page = parseInt(page);
  payload.page = payload.page > 0 ? payload.page : 1;
  const limitV1 = autoComplete ? recordsPerPageAutoComplete : recordsPerPage;
  if (limit > limitV1) limit = limitV1;
  const finalQuery: PaginationQuery = {
    _source: autoComplete ? autocompleteFields : searchFields,
    query,
    from: (payload.page - 1) * limit,
    size: payload.page * limit,
    sort: orderBy(payload.orderBy || {})
  };

  return { finalQuery, limit };
};

export const addNewDappEnrichDataForStore = (
  data: DappEnrichPayload,
  currDappStores: StoresSchema,
  storeIndex: number
) => {
  const dappsEnrichDetails = {
    dappId: data.dappId,
    fields: data.add
  };
  if (!currDappStores.dappStores[storeIndex].dappsEnrich)
    currDappStores.dappStores[storeIndex].dappsEnrich = [];
  currDappStores.dappStores[storeIndex].dappsEnrich?.push(dappsEnrichDetails);
  return currDappStores;
};

export const deleteKeyFromObject = (path: string, data: any): any => {
  const [key, ...restPath] = path.split(".");
  if (!data[key]) return;
  if (!restPath.length) return delete data[key];
  return deleteKeyFromObject(restPath.join("."), data[key]);
};

export const mergeArrayOfObject = (
  input: ScreenShotSchema[],
  existing: ScreenShotSchema[]
) => {
  if (!existing.length) return input;
  input.forEach(inputObject => {
    const idx = existing.findIndex(e => e.index === inputObject.index);
    idx >= 0 ? existing.splice(idx, 1) : null;
  });
  return input.concat(existing);
};

export const updateDappEnrichDataForStore = (
  data: DappEnrichPayload,
  currDappStores: StoresSchema,
  dappsEnrichDetails: EnrichSchema,
  storeIndex: number,
  idx: number
) => {
  const { remove = [], add } = data;
  //start delete keys
  if (remove.length)
    remove.forEach(path =>
      deleteKeyFromObject(path, dappsEnrichDetails.fields)
    );
  if (!add || !Object.keys(add).length) return;

  const existing = dappsEnrichDetails?.fields?.images?.screenshots || [];
  let screenshots = add.images?.screenshots || [];
  screenshots = mergeArrayOfObject(screenshots, existing);

  if (add.images?.screenshots || screenshots.length)
    Object.assign(add, { images: { ...add.images, screenshots } });
  dappsEnrichDetails.fields = { ...dappsEnrichDetails?.fields, ...add };

  const dappEnrich = currDappStores.dappStores[storeIndex].dappsEnrich || [];
  dappEnrich[idx] = dappsEnrichDetails;
  currDappStores.dappStores[storeIndex].dappsEnrich = dappEnrich;
  return;
};

export const checkIfExists = (
  dappId: string,
  dapps: DAppSchema[],
  newUrls: string[]
) => {
  const idx = dapps.findIndex(x => x.dappId === dappId);
  const idx1 = newUrls.indexOf(dappId);
  return idx >= 0 || idx1 >= 0 ? true : false;
};

export const checkIfdappExistsInNew = (dappId: string, newUrls: string[]) => {
  const idx = newUrls.indexOf(dappId);
  return idx >= 0 ? false : true;
};

export const getDappId = (
  appUrl: string | undefined,
  dapps: DAppSchema[],
  newUrls: string[]
) => {
  if (!appUrl) return "";
  appUrl = appUrl.split("?")[0];
  appUrl = appUrl.split("#")[0];
  appUrl = appUrl.replace("https://", "");
  appUrl = appUrl.replace("http://", "");
  appUrl = appUrl.replace("www.", "");
  const parts = appUrl.split("/");
  let urlSuffix = parts.splice(1, parts.length - 1).join("-");

  if (urlSuffix[urlSuffix.length - 1] === "-")
    urlSuffix = urlSuffix
      .split("")
      .splice(0, urlSuffix.length - 1)
      .join("");

  const domainProviders = ["vercel", "twitter", "instagram", "bit", "netlify"];
  const [first, start, ...others] = parts[0].split(".").reverse();
  // only for domain providers
  if (domainProviders.includes(start)) {
    let dappId = `${others}.app`.toLocaleLowerCase();
    if (others.length > 0) {
      if (typeof others !== "string")
        dappId = `${others.join("-")}.app`.toLocaleLowerCase();
      if (!checkIfExists(dappId, dapps, newUrls)) return dappId;
    }
    dappId = `${dappId.split(".app")[0]}`;
    dappId = `${
      dappId.length > 0 ? dappId + "-" + urlSuffix : urlSuffix
    }.app`.toLocaleLowerCase();
    if (!checkIfExists(dappId, dapps, newUrls)) return dappId;
    // return dappId;
    throw new Error(`dapp Id already exists, dappId: ${dappId}`);
  }

  // check if {domain}.app is available
  let dappId = `${start}.app`.toLocaleLowerCase();
  if (!checkIfExists(dappId, dapps, newUrls)) return dappId;
  debug(
    `dappId already Exists:::, dappId: ${dappId}, first: ${first}, others:${others}`
  );

  // check if {domain}-{subdomain}.app
  dappId = `${start}${
    others.length > 0 ? "-" + others.join("-") : ""
  }.app`.toLocaleLowerCase();
  if (!checkIfExists(dappId, dapps, newUrls)) return dappId;
  debug(
    `dappId already Exists:::, dappId: ${dappId}, first: ${first}, others:${others}`
  );

  // check if {domain}-{url-path}.app
  dappId = `${start}${
    urlSuffix.length > 0 ? "-" + urlSuffix : ""
  }.app`.toLocaleLowerCase();
  if (!checkIfExists(dappId, dapps, newUrls)) return dappId;
  debug(
    `dappId already Exists:::, dappId: ${dappId}, first: ${first}, others:${others}`
  );
  // return dappId;
  throw new Error(`dapp Id already exists, dappId: ${dappId}`);
};
