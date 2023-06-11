import { DAppSchema, DAppStoreSchema } from "../interfaces";
import fs from "fs-extra";
import Debug from "debug";

const debug = Debug("scripts:20230610-Update-Cat-Names");

const localRegistryJson = JSON.parse(
  fs.readFileSync("./src/registry.json").toString()
) as DAppStoreSchema;
debug("localRegistryJson Loaded");

const dApps = localRegistryJson.dapps;

const categoryMapping = {
  "developer tools": "developer-tools",
  "food and drink": "food-and-drink",
  "health and fitness": "health-and-fitness",
  "social networking": "social-networking",
  social: "social-networking",
  defi: "finance"
} as { [key: string]: string };

const subCategoryMapping = {
  "discovery tool": "discovery-tool",
  "developer infra": "developer-infra",
  "learning tools": "learning-tools",
  "on-ramping": "ramp",
  "off-ramping": "ramp",
  "airdrop tool": "airdrop-tool",
  "prediction markets": "prediction-markets",
  "graphics and design": "graphics-and-design",
  "domain names": "domain-names",
  "social media": "social-media",
  "price aggregator": "price-aggregator"
} as { [key: string]: string };

debug("Using categoryMapping", categoryMapping);
debug("Using subCategoryMapping", subCategoryMapping);

for (const dApp of dApps) {
  if (dApp.category && categoryMapping[dApp.category]) {
    debug(
      `Updating dApp: ${dApp.dappId} from category ${dApp.category} to ${
        categoryMapping[dApp.category]
      }}`
    );
    dApp.category = categoryMapping[dApp.category] as DAppSchema["category"];
  }
  if (dApp.subCategory) {
    debug(
      `Updating dApp: ${dApp.dappId} from subCategory ${dApp.subCategory} to ${
        subCategoryMapping[dApp.subCategory]
      }}`
    );
    dApp.subCategory = subCategoryMapping[dApp.subCategory] || dApp.subCategory;
  }
  // now check if there's any overwrite of categories and sub categories
  if (dApp.category === "finance" && dApp.subCategory === "infrastructure") {
    dApp.category = "finance";
    dApp.subCategory = "trading";
  }
}

// Write the new registry.json
fs.writeFileSync(
  "./src/registry.json",
  JSON.stringify(localRegistryJson, null, 2)
);
debug("Updated registry written to ./src/registry.json");
