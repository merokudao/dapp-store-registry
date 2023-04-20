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
  fields?: EnrichFieldSchema;
}

export interface EnrichFieldSchema {
  images?: {
    logo?: string;
    banner?: string;
    screenshots?: ScreenShotSchema[];
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
