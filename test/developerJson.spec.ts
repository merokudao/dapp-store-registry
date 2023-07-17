import Ajv2019 from "ajv/dist/2019";
import addFormats from "ajv-formats";
import fs from "fs-extra";
import Dotenv from "dotenv";
import { DeveloperSchema } from "../src/interfaces";
import chai from "chai";

import developerSchema from "../src/schemas/merokuDappStore.developerSchema.json";
import developersSchema from "../src/schemas/merokuDappStore.developersSchema.json";

Dotenv.config({
  path: ".env.test"
});
chai.should();

describe("developers: Schema Validations", () => {
  it("developers: ensure that fixture is valid", done => {
    const ajv = new Ajv2019({
      strict: false
    });
    addFormats(ajv);
    ajv.addSchema(developerSchema, "developerSchema");
    const validate = ajv.compile(developersSchema);

    const content = fs
      .readFileSync("./test/fixtures/developer.json")
      .toString();
    const json = JSON.parse(content) as DeveloperSchema;

    const valid = validate(json);
    console.log(validate.errors);
    valid.should.be.true;

    done();
  });
});
