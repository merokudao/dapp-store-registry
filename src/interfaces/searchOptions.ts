export interface FilterOptions {
  chainId?: number;
  language?: string;
  availableOnPlatform?: string[];
  forMatureAudience?: boolean;
  minAge?: number;
  listedOnOrAfter?: Date;
  listedOnOrBefore?: Date;
  allowedInCountries?: string[];
  blockedInCountries?: string[];
  categories?: string[];
  isListed?: boolean;
}
