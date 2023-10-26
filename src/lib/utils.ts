import {
  DAppStoreSchema,
  StoresSchema,
  DappEnrichPayload,
  EnrichSchema,
  ScreenShotSchema,
  DAppSchema
} from "../interfaces";
import storesJson from "../dappStore.json";
import registryJson from "./../registry.json";
import categoryJson from "./../dappCategory.json";
import Debug from "debug";
import Ajv2019 from "ajv/dist/2019";
import addFormats from "ajv-formats";
import dAppStoreSchema from "../schemas/merokuDappStore.dAppStore.json";
import dAppEnrichSchema from "../schemas/merokuDappStore.dAppEnrich.json";
import dAppStoresSchema from "../schemas/merokuDappStore.dAppStores.json";
import dAppRegistrySchema from "../schemas/merokuDappStore.registrySchema.json";
import featuredSchema from "../schemas/merokuDappStore.featuredSchema.json";
import dAppDownloadBaseUrlsSchema from "../schemas/merokuDappStore.dAppDownloadBaseUrlsSchema.json";
import dAppImagesSchema from "../schemas/merokuDappStore.dAppImagesSchema.json";
import dAppEnrichImagesSchema from "../schemas/merokuDappStore.dAppEnrichImagesSchema.json";
import developerSchema from "../schemas/merokuDappStore.developerSchema.json";
import dAppSchema from "../schemas/merokuDappStore.dAppSchema.json";
import { DappStoreRegistry, RegistryStrategy } from "./registry";
import crypto from "crypto";
import {
  CategoryObject,
  ObjectStringValueType
} from "../interfaces/searchOptions";

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
    ajv.addSchema(dAppDownloadBaseUrlsSchema, "dAppDownloadBaseUrlsSchema");
    ajv.addSchema(dAppImagesSchema, "dAppImagesSchema");
    ajv.addSchema(dAppSchema, "dAppSchema");
    ajv.addSchema(developerSchema, "developerSchema");
    ajv.addFormat("url", /^https?:\/\/.+/);
    validate = ajv.compile(dAppRegistrySchema);
  } else {
    // dAppStores
    ajv.addSchema(featuredSchema, "featuredSchema");
    ajv.addSchema(dAppImagesSchema, "dAppImagesSchema");
    ajv.addSchema(dAppStoreSchema, "dAppStoreSchema");
    ajv.addSchema(dAppEnrichImagesSchema, "dAppEnrichImagesSchema");
    ajv.addSchema(dAppEnrichSchema, "dappsEnrich");
    ajv.addSchema(developerSchema, "developerSchema");
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

/**
 * Prepare category and subCategory mapping
 * @param category
 * @param subCategory
 * @returns
 */
export const getCatSubCatMapping = (
  category: string[] = [],
  subCategory: string[] = []
) => {
  const catSubCatMap = categoryJson.reduce(
    (aggs: ObjectStringValueType, value: CategoryObject) => {
      aggs[value.category] = value.subCategory;
      return aggs;
    },
    {}
  );

  return category.map(cat => {
    const allSubCat = catSubCatMap[cat];
    const catFilter = { category: cat, subCategory: [] as string[] };
    subCategory.map((sc: string) => {
      if (allSubCat.includes(sc)) {
        catFilter.subCategory.push(sc);
      }
    });
    return catFilter;
  });
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

export const getPlainAppUrl = (appUrl: string | undefined) => {
  if (!appUrl) return "";
  appUrl = appUrl.split("?")[0];
  appUrl = appUrl.split("#")[0];
  appUrl = appUrl.replace("https://", "");
  appUrl = appUrl.replace("http://", "");
  appUrl = appUrl.replace("www.", "");
  appUrl =
    appUrl[appUrl.length - 1] === "/"
      ? appUrl.substring(0, appUrl.length - 1)
      : appUrl;
  return appUrl.toLowerCase();
};

export const getName = (name: string) => name.toLowerCase();

/**
 * return a unique dappId
 * @param name name of the dapp
 * @param appUrl url of the dapp
 * @param dapps list of all dapps
 * @param newUrls
 * @param newName
 * @returns
 */
export const getDappId = (
  name: string,
  appUrl: string | undefined,
  dapps: DAppSchema[],
  newUrls: string[],
  newNames: string[]
) => {
  // validate if dapp already exists
  appUrl = getPlainAppUrl(appUrl);
  const existingPlainUrls = dapps.map(dapp => getPlainAppUrl(dapp.appUrl));
  const existingAllName = dapps.map(dapp => getName(dapp.name));
  newUrls = newUrls.map(nu => getPlainAppUrl(nu));
  const plainName = getName(name);
  if (
    existingPlainUrls.includes(appUrl) ||
    existingAllName.includes(plainName) ||
    newNames.includes(plainName) ||
    newUrls.includes(appUrl)
  ) {
    debug(`duplicate::: ${appUrl}`);
    throw new Error(`dapp Id already exists, appUrl: ${appUrl}`);
  }

  // generate a unique dappId
  const parts = appUrl.split("/");
  let urlSuffix = parts.splice(1, parts.length - 1).join("-");

  if (urlSuffix[urlSuffix.length - 1] === "-")
    urlSuffix = urlSuffix
      .split("")
      .splice(0, urlSuffix.length - 1)
      .join("");

  if (urlSuffix[urlSuffix.length - 1] === "-")
    urlSuffix = urlSuffix
      .split("")
      .splice(0, urlSuffix.length - 1)
      .join("");

  const domainProviders = [
    "vercel",
    "twitter",
    "instagram",
    "bit",
    "netlify",
    "ipns.dweb.link",
    "ipfs.dweb.link",
    "github",
    "gitlab"
  ];
  const [first, start, ...others] = parts[0].split(".").reverse();
  // only for domain providers
  if (domainProviders.includes(start)) {
    let dappId = `${others}.app`.toLowerCase();
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
  // debug(`dappId already Exists:::, dappId: ${dappId}, first: ${first}, others:${others}`);

  // check if {domain}-{subdomain}.app
  dappId = `${start}${
    others.length > 0 ? "-" + others.join("-") : ""
  }.app`.toLocaleLowerCase();
  if (!checkIfExists(dappId, dapps, newUrls)) return dappId;
  // debug(`dappId already Exists:::, dappId: ${dappId}, first: ${first}, others:${others}`);

  // check if {domain}-{url-path}.app
  dappId = `${start}${
    urlSuffix.length > 0 ? "-" + urlSuffix : ""
  }.app`.toLocaleLowerCase();
  if (!checkIfExists(dappId, dapps, newUrls)) return dappId;
  debug(
    `dappId already Exists::: 3, dappId: ${dappId}, first: ${first}, others:${others}`
  );
  // return dappId;
  throw new Error(`dapp Id already exists, dappId: ${dappId}`);
};
