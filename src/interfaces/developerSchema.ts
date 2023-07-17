export enum DeveloverVersionControllingTools {
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
  logo?: string;
  website: string;
  credentils?: {
    id: string;
    type: keyof typeof DeveloverVersionControllingTools;
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
