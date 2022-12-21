import { DAppSchema } from "./dAppSchema";
import { FeaturedSection } from "./featuredSections";

/**
 * Schema for dApp Store
 */
export interface DAppStoreSchema {
  /**
   * Title of the dApp Store
   */
  title: string;
  /**
   * List of chains supported by the dApp. This should be chainID of an EVM powered network. Ref https://chainlist.org/
   */
  chains: number[];
  /**
   * List of dApps
   */
  dapps: DAppSchema[];

  featuredSections?: FeaturedSection[];
}
