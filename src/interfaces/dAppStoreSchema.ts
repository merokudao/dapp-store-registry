import { DeveloperSchema } from "./developerSchema";
import { FeaturedSection } from "./featuredSections";

export interface StoresSchema {
  dappStores: StoreSchema[];
}

/**
 * Schema for dAppStore
 */
export interface StoreSchema {
  githubId?: string;

  featuredSections?: FeaturedSection[];

  key: string;
  storeId: string;
  name: string;
  description: string;
  url: string;
  minAge: number;
  language: string[];
  tags?: string[];
  geoRestrictions?: {
    allowedCountries: string[];
    blockedCountries: string[];
  };
  images?: {
    logo?: string;
    banner?: string;
    screenshots?: string[];
    mobileScreenshots?: string[];
  };
  cdn?: {
    images?: {
      logo?: string;
      banner?: string;
      screenshots?: string[];
      mobileScreenshots?: string[];
    };
  };
  isForMatureAudience: boolean;

  bannedDAppIds?: string[];

  dappsEnrich?: EnrichSchema[];
  external_url?: string;
  image?: string;
  attributes?: {
    trait_type: string;
    value: string;
    display_type: string;
  }[];
  category?: string;
  whitelistedDAppIds?: string[];
  developer?: DeveloperSchema;
  isListed: boolean;
  listDate: string;
  expiryDate: string;
  minted: boolean;
  ownerAddress: string;
  tokenId: string;
}

export interface EnrichSchema {
  dappId: string;
  fields?: EnrichFieldSchema;
}

export interface EnrichFieldSchema {
  images?: {
    logo?: string;
    banner?: string;
    screenshots?: ScreenShotSchema[];
    mobileScreenshots?: ScreenShotSchema[];
  };
  cdn?: {
    images?: {
      logo?: string;
      banner?: string;
      screenshots?: ScreenShotSchema[];
      mobileScreenshots?: ScreenShotSchema[];
    };
  };
  description?: string;
  minAge?: number;
  isForMatureAudience?: boolean;
  geoRestrictions?: {
    allowedCountries?: string[];
    blockedCountries?: string[];
  };
  tags?: string[];
  name?: string;
  appUrl?: string;
  chains?: string[];
  category?: string;
  subCategory?: string;
  availableOnPlatform?: string[];
}

export interface ScreenShotSchema {
  value?: string;
  index?: number;
}

export interface DappEnrichPayload {
  key: string;
  dappId: string;
  githubId: string;
  remove?: string[];
  add?: EnrichFieldSchema;
}
