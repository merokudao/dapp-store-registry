import Ajv2019 from "ajv/dist/2019";
import addFormats from "ajv-formats";
import fs from "fs-extra";
import Dotenv from "dotenv";
import { DAppStoreSchema } from "../src/interfaces/registrySchema";
import chai from "chai";

import dAppRegistrySchema from "../src/schemas/merokuDappStore.registrySchema.json";
import featuredSchema from "../src/schemas/merokuDappStore.featuredSchema.json";
import developerSchema from "../src/schemas/merokuDappStore.developerSchema.json";
import dAppSchema from "../src/schemas/merokuDappStore.dAppSchema.json";
import dAppDownloadBaseUrlsSchema from "../src/schemas/merokuDappStore.dAppDownloadBaseUrlsSchema.json";
import dAppImagesSchema from "../src/schemas/merokuDappStore.dAppImagesSchema.json";

Dotenv.config({
  path: ".env.test"
});
chai.should();

describe("registry.json & Schema Validations", () => {
  it("registry.json should be a valid JSON", done => {
    const content = fs.readFileSync("./src/registry.json").toString();
    const json = JSON.parse(content) as DAppStoreSchema;
    json.should.be.an("object");
    done();
  });

  it("merokuDappStore.featuredSchema.json should be valid JSON Schema", done => {
    const ajv = new Ajv2019();
    const valid = ajv.validateSchema(featuredSchema);
    valid.should.be.true;
    done();
  });

  it("merokuDappStore.dAppSchema.json should be valid JSON Schema", done => {
    const ajv = new Ajv2019();
    const valid = ajv.validateSchema(dAppSchema);
    valid.should.be.true;
    done();
  });

  it("merokuDappStore.registrySchema.json should be valid JSON Schema", done => {
    const ajv = new Ajv2019();
    const valid = ajv.validateSchema(dAppRegistrySchema);
    valid.should.be.true;
    done();
  });

  it("registry.json should be valid against merokuDappStore.registrySchema.json", done => {
    const ajv = new Ajv2019({
      strict: false
    });
    addFormats(ajv);
    ajv.addSchema(featuredSchema, "featuredSchema");
    ajv.addSchema(dAppDownloadBaseUrlsSchema, "dAppDownloadBaseUrlsSchema");
    ajv.addSchema(dAppImagesSchema, "dAppImagesSchema");
    ajv.addSchema(developerSchema, "developerSchema");
    ajv.addSchema(dAppSchema, "dAppSchema");
    const validate = ajv.compile(dAppRegistrySchema);

    const content = fs.readFileSync("./src/registry.json").toString();
    const json = JSON.parse(content) as DAppStoreSchema;

    const valid = validate(json);
    valid.should.be.true;

    done();
  });

  it("should be able to detect invalid registry.json", done => {
    const ajv = new Ajv2019({
      strict: false
    });
    addFormats(ajv);
    ajv.addSchema(featuredSchema, "featuredSchema");
    ajv.addSchema(dAppDownloadBaseUrlsSchema, "dAppDownloadBaseUrlsSchema");
    ajv.addSchema(dAppImagesSchema, "dAppImagesSchema");
    ajv.addSchema(developerSchema, "developerSchema");
    ajv.addSchema(dAppSchema, "dAppSchema");
    const validate = ajv.compile(dAppRegistrySchema);

    const content = fs
      .readFileSync("./test/fixtures/registryInvalid.json")
      .toString();
    const json = JSON.parse(content) as DAppStoreSchema;

    const valid = validate(json);
    valid.should.be.false;

    done();
  });

  it("ensure that fixture is valid", done => {
    const ajv = new Ajv2019({
      strict: false
    });
    addFormats(ajv);
    ajv.addSchema(featuredSchema, "featuredSchema");
    ajv.addSchema(dAppDownloadBaseUrlsSchema, "dAppDownloadBaseUrlsSchema");
    ajv.addSchema(dAppImagesSchema, "dAppImagesSchema");
    ajv.addSchema(developerSchema, "developerSchema");
    ajv.addSchema(dAppSchema, "dAppSchema");
    const validate = ajv.compile(dAppRegistrySchema);

    const content = fs.readFileSync("./test/fixtures/registry.json").toString();
    const json = JSON.parse(content) as DAppStoreSchema;

    const valid = validate(json);
    console.log(validate.errors);
    valid.should.be.true;

    done();
  });
});
