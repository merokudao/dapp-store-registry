import { DeveloperSchema } from "./developerSchema";
import { VerificationDetails } from "./verificationDetailsSchema";

export const dAppDeploymentPlatforms = ["ios", "web", "android"] as const;

export type DAppDeploymentPlatform = (typeof dAppDeploymentPlatforms)[number];

export const dAppCategory = [
  "books",
  "business",
  "developer-tools",
  "education",
  "entertainment",
  "finance",
  "food-and-drink",
  "games",
  "gambling",
  "health-and-fitness",
  "kids",
  "lifestyle",
  "news",
  "nft",
  "personalization",
  "photography",
  "productivity",
  "shopping",
  "social-networking",
  "sports",
  "travel",
  "utilities",
  "Ai"
] as const;

export type DAppCategory = (typeof dAppCategory)[number];

/**
 * images of dapp
 */
export interface Images {
  logo?: string;
  banner?: string;
  screenshots?: string[];
  mobileScreenshots?: string[];
}

/**
 * Downloadable assets
 */
export interface DownloadBaseUrls {
  url: string;
  platform: DAppDeploymentPlatform;
  architecture?: string;
  minVersion?: string;
  maxVersion?: string;
  screenDPI?: string;
  packageId?: string;
  version: string;
  versionCode?: string;
}

export interface Token {
  name: string;
  symbol: string;
  address: string;
  chains: number[];
}

/**
 * A schema for dapps for dApp Registry
 */
export interface DAppSchema {
  /**
   * The name of the dApp. This is what is shown on listing
   */
  name: string;
  /**
   * A detailed description of the dApp
   */
  description: string;

  external_url?: string;

  image?: string;

  attributes?: {
    trait_type: string;
    value: string;
    display_type: string;
  }[];

  /**
   * The URL of the dApp. This is optional. If specified, the dApp will be shown as a
   * link on the dApp store
   * @format uri
   * @pattern ^https?://
   */
  appUrl?: string;

  downloadBaseUrls?: DownloadBaseUrls[];

  contracts?: {
    address: string;
    chainId: string;
  }[];

  images?: Images;
  /**
   * If this is in OpenSource, the URL of the repository
   */
  repoUrl?: string;
  /**
   * A Unique ID for each dApp.
   */
  dappId: string;
  /**
   * The min age of user who should access this dApp
   */
  minAge: number;
  /**
   * Boolean to signify if the dApp is for mature audience
   */
  isForMatureAudience: boolean;
  /**
   * Boolean to signify if the dApp developers have a moderation in place for the content posted/generated by the dApp or it's users
   */
  isSelfModerated: boolean;
  /**
   * A string in ISO-639-1 which signifies the language of the dApp
   */
  language: string[] | string;
  /**
   * The version of the dApp that is available on the dApp store
   */
  isListed: boolean;
  /**
   * The date on which this dApp is listed on dApp store. This date can be a future date as well. This can not be in past.
   */
  listDate: string;
  /**
   * A string signifying if the dApp is available on which platform - web, iOS, android
   *
   * @minItems 1
   */
  availableOnPlatform: DAppDeploymentPlatform[];

  geoRestrictions?: {
    allowedCountries?: string[];
    blockedCountries?: string[];
  };

  developer?: DeveloperSchema;
  /**
   * @minItems 1
   */
  tags?: string[];
  /**
   * @minItems 1
   */
  chains: number[];

  category: DAppCategory;

  subCategory?: string;

  walletApiVersion?: string[];

  minted?: boolean;

  referredBy?: {
    name: string;
    url?: string;
  };
  expiryDate?: string;
  privacyPolicyUrl?: string;
  support?: {
    url?: string;
    email?: string;
  };
  cdn?: {
    images?: Images;
    downloadBaseUrls?: DownloadBaseUrls[];
  };
  whitelistedForStores?: string[];
  social?: {
    twitterUrl?: string;
    discordUrl?: string;
    instagramUrl?: string;
    facebookUrl?: string;
    other?: string;
  };
  ownerAddress?: string;
  tokenId?: string;
  metrics?: object;
  verification?: VerificationDetails;
  version?: string;
  versionCode?: string;
  packageId?: string;
  tokens?: Token[];
}
