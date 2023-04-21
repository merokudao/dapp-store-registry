import { FeaturedSection } from "./featuredSections";

export interface StoresSchema {
  dappStores: StoreSchema[];
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
