export interface FilterOptionsSearch {
  chainId?: number;
  language?: string;
  availableOnPlatform?: string[];
  isForMatureAudience?: boolean | string;
  minAge?: number;
  listedOnOrAfter?: Date;
  listedOnOrBefore?: Date;
  allowedInCountries?: string[];
  blockedInCountries?: string[];
  categories?: string[];
  subCategories?: string[];
  limit?: number;
  isListed?: boolean | string;
  page?: string | number;
  dappId?: string | string[];
  developer?: { id: string };
  isMinted?: boolean | string;
  searchById?: boolean;
  ownerAddress?: string;
  tokenIds?: string[];
  storeKey?: string;
  orderBy?: string | OrderParams;
  scrollId?: string;
  size?: number;
  _source?: string[];
  featured?: boolean;
  bannedDAppIds?: string[];
  whitelistedDAppIds?: string[];
}

export interface OrderParams {
  rating?: string;
  visits?: string;
  installs?: string;
  listDate?: string;
  name?: string;
}

export interface SortByOrderQuery {
  _score?: { order: string };
  listDate?: { order: string };
  "metrics.rating"?: { order: string };
  "metrics.visits"?: { order: string };
  "metrics.installs"?: { order: string };
  nameKeyword?: { order: string };
}

export interface ObjectStringValueType {
  [key: string]: string[] | string;
}

export interface ObjectArrayOfStringValueType {
  [key: string]: string[];
}

export interface CategoryObject {
  category: string;
  subCategory: string[];
}

export interface ObjectNumberValueType {
  [key: string]: number;
}

export interface AppStoreSearchPayload {
  language?: string;
  isForMatureAudience?: boolean | string;
  minAge?: number;
  allowedInCountries?: string[];
  blockedInCountries?: string[];
  category?: string;
  limit?: number;
  isListed?: boolean | string;
  page?: string | number;
  key?: string | string[];
  storeId?: string | string[];
  developer?: { id: string };
  searchById?: boolean;
  ownerAddress?: string;
  tokenIds?: string;
  listedOnOrAfter?: Date;
  listedOnOrBefore?: Date;
  orderBy?: string | OrderParams;
  scrollId?: string;
  size?: number;
  _source?: string[];
  isMinted?: string;
}

export interface DeveloperSearchPayload {
  limit?: number;
  isListed?: boolean | string;
  page?: string | number;
  devId?: string | string[];
  searchById?: boolean;
  ownerAddress?: string;
  tokenIds?: string;
  listedOnOrAfter?: Date;
  listedOnOrBefore?: Date;
  orderBy?: string | OrderParams;
  scrollId?: string;
  size?: number;
  _source?: string[];
  credentialsId?: string;
  credentialsType?: string;
}
