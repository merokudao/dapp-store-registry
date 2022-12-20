import Ajv, { JSONSchemaType } from 'ajv';
import fs from 'fs-extra';
import { DAppStoreSchema } from 'interfaces/registrySchema';
import chai from 'chai';

chai.should();

describe('Registry JSON', () => {
  it('should be a valid JSON', (done) => {
    const content = fs
      .readFileSync('./src/registry.json')
      .toString();
    const json = JSON.parse(content) as DAppStoreSchema;
    json.should.be.an('object');
    done();
  });

  it('should be compliant to schema', (done) => {
    const content = fs
      .readFileSync('./src/registry.json')
      .toString();
    const json = JSON.parse(content) as DAppStoreSchema;
    const ajv = new Ajv({
      strict: false
    });
    const validate = ajv.compile(json);
    const valid = validate(json);
    valid.should.be.true;
    done();
  });
});
