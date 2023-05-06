export interface FilterOptions {
  chainId?: number;
  language?: string;
  availableOnPlatform?: string[];
  isForMatureAudience?: boolean;
  minAge?: number;
  listedOnOrAfter?: Date;
  listedOnOrBefore?: Date;
  allowedInCountries?: string[];
  blockedInCountries?: string[];
  categories?: string[];
  subCategories?: string[];
  limit?: number;
  isListed?: boolean;
  page?: string;
  dappId?: string;
  developer?: any;
}
