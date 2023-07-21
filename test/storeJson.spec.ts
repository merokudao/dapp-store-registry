import Ajv2019 from "ajv/dist/2019";
import addFormats from "ajv-formats";
import fs from "fs-extra";
import Dotenv from "dotenv";
import { StoreSchema, StoresSchema } from "../src/interfaces";
import chai from "chai";

import dAppStoresSchema from "../src/schemas/merokuDappStore.dAppStores.json";
import featuredSchema from "../src/schemas/merokuDappStore.featuredSchema.json";
import dAppStoreSchema from "../src/schemas/merokuDappStore.dAppStore.json";
import dAppEnrichImagesSchema from "../src/schemas/merokuDappStore.dAppEnrichImagesSchema.json";
import dAppEnrich from "../src/schemas/merokuDappStore.dAppEnrich.json";
import dAppImagesSchema from "../src/schemas/merokuDappStore.dAppImagesSchema.json";
import developerSchema from "../src/schemas/merokuDappStore.developerSchema.json";

Dotenv.config({
  path: ".env.test"
});
chai.should();

describe("dAppStore.json & Schema Validations", () => {
  it("dappStore: dappStore.json should be a valid JSON", done => {
    const content = fs.readFileSync("./src/dappStore.json").toString();
    const json = JSON.parse(content) as StoresSchema;
    json.should.be.an("object");
    done();
  });

  it("dappStore: merokuDappStore.dappStore.json should be valid JSON Schema", done => {
    const ajv = new Ajv2019();
    const valid = ajv.validateSchema(dAppStoreSchema);
    valid.should.be.true;
    done();
  });

  it("dappStore: merokuDappStore.dappStore.json should be valid JSON Schema", done => {
    const ajv = new Ajv2019();
    const valid = ajv.validateSchema(dAppStoreSchema);
    valid.should.be.true;
    done();
  });

  it("dappStore: dappStore.json should be valid against merokuDappStore.dappStores.json", done => {
    const ajv = new Ajv2019({
      strict: false
    });
    addFormats(ajv);
    ajv.addSchema(featuredSchema, "featuredSchema");
    ajv.addSchema(dAppImagesSchema, "dAppImagesSchema");
    ajv.addSchema(dAppEnrichImagesSchema, "dAppEnrichImagesSchema");
    ajv.addSchema(dAppEnrich, "dAppEnrich");
    ajv.addSchema(developerSchema, "developerSchema");
    ajv.addSchema(dAppStoreSchema, "dAppStoreSchema");
    const validate = ajv.compile(dAppStoresSchema);

    const content = fs.readFileSync("./src/dappStore.json").toString();
    const json = JSON.parse(content) as StoresSchema;

    const valid = validate(json);
    valid.should.be.true;

    done();
  });

  it("dappStore: ensure that fixture is valid", done => {
    const ajv = new Ajv2019({
      strict: false
    });
    addFormats(ajv);
    ajv.addSchema(featuredSchema, "featuredSchema");
    ajv.addSchema(dAppImagesSchema, "dAppImagesSchema");
    ajv.addSchema(dAppEnrichImagesSchema, "dAppEnrichImagesSchema");
    ajv.addSchema(dAppEnrich, "dAppEnrich");
    ajv.addSchema(developerSchema, "developerSchema");
    ajv.addSchema(dAppStoreSchema, "dAppStoreSchema");
    const validate = ajv.compile(dAppStoresSchema);

    const content = fs
      .readFileSync("./test/fixtures/dappStore.json")
      .toString();
    const json = JSON.parse(content) as StoreSchema;

    const valid = validate(json);
    console.log(validate.errors);
    valid.should.be.true;

    done();
  });
});
