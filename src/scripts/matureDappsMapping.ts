import matureWords from "naughty-words/en.json";
import fs from "fs-extra";
import Debug from "debug";
import { DAppStoreSchema } from "../interfaces";

const debug = Debug("scripts:20230610-Update-Cat-Names");

const localRegistryJson = JSON.parse(
  fs.readFileSync("./src/registry.json").toString()
) as DAppStoreSchema;
debug("localRegistryJson Loaded");

const dApps = localRegistryJson.dapps;

const checkifKeyMature = (value: string) => {
  return value
    .split(" ")
    .find((key: string) => matureWords.includes(key.toLowerCase()));
};

for (const dapp of dApps) {
  const isNameMature =
    checkifKeyMature(dapp.name) || checkifKeyMature(dapp.description);

  if (isNameMature) {
    dapp.isForMatureAudience = true;
    dapp.minAge = 18;
  }
}

// Write the new registry.json
fs.writeFileSync(
  "./src/registry.json",
  JSON.stringify(localRegistryJson, null, 2)
);
debug("Updated registry written to ./src/registry.json");
