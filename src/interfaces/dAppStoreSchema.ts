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
  };
  cdn?: {
    images?: {
      logo?: string;
      banner?: string;
      screenshots?: string[];
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
  };
  cdn?: {
    images?: {
      logo?: string;
      banner?: string;
      screenshots?: ScreenShotSchema[];
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
