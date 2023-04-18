import { FeaturedSection } from "./featuredSections";

export interface StoresSchema {
  dappStores: StoreSchema[];
  dappsEnrich: EnrichSchema[];
}

/**
 * Schema for dAppStore
 */
export interface StoreSchema {
  githubId: string;

  featuredSections: FeaturedSection[];

  key: string;

  bannedDAppIds: string[];
}

export interface EnrichSchema {
  storeKey: string;
  dappId: string;
  filds: EnrichFieldSchema;
}

export interface EnrichFieldSchema {
  images?: {
    logo?: string;
    banner?: string;
    screenshots?: {
      value?: string;
      index?: number;
    }[];
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
