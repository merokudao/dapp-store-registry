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
  developer?: { githubID: string };
  isMinted?: boolean | string;
  searchById?: boolean;
  ownerAddress?: string;
  tokenIds?: string[];
  storeKey?: string;
  orderBy?: string | OrderParams;
  scrollId?: string;
  size?: number;
  _source?: string[];
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

export interface CategoryObject {
  category: string;
  subCategory: string[];
}

export interface ObjectNumberValueType {
  [key: string]: number;
}
