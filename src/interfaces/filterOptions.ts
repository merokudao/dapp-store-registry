export interface FilterOptions {
  chainId?: number;

  language?: string;

  /**
   * While filtering, an OR operation is performed on the elements of the array.
   * This means that the dapp must be available on at least one of the platforms in the array.
   */
  availableOnPlatform?: string[];

  forMatureAudience?: boolean;

  minAge?: number;

  listedOnOrAfter?: Date;

  listedOnOrBefore?: Date;

  /**
   * While filtering, an OR operation is performed on the elements of the array.
   * This means that the dapp must be allowed in at least one of the countries in the array.
   */
  allowedInCountries?: string[];

  /**
   * While filtering, an OR operation is performed on the elements of the array.
   * This means that the dapp must be blocked in at least one of the countries in the array.
   */
  blockedInCountries?: string[];

  categories?: string[];

  isListed?: boolean | string;

  developer?: {
    id?: string;
  };

  page?: string;

  searchById?: boolean;

  subCategory?: string[];
  limit?: number;

  isMinted?: boolean;
  storeKey?: string;
}
