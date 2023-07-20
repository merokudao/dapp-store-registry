export enum DevIDPlatforms {
  "github",
  "gitlab",
  "bitbucket"
}

export interface DeveloperSchema {
  devId: string;
  /**
   * Legal name of the developer or the company
   */
  legalName: string;
  images?: {
    logo?: string;
  };
  cdn?: {
    images?: {
      logo?: string;
    };
  };
  website: string;
  credentials?: {
    id: string;
    type: keyof typeof DevIDPlatforms;
  };
  name?: string;
  description?: string;
  external_url?: string;
  image?: string;
  attributes?: {
    trait_type: string;
    value: string;
    display_type: string;
  }[];
}
