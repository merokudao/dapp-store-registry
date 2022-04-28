import Ajv, { JSONSchemaType } from 'ajv';
import test from 'ava';
import fs from 'fs-extra';

import {
  Registry,
  RegistryListProvider,
  Strategy
} from './registry';

test('Registry is filterable by exact tag name', async (t) => {
  const x = await new RegistryListProvider().resolve(Strategy.Static);
  const tag = x.getRegistry().tags[0].name;
  const dApps = x.filterByTag(tag).getDapps();

  t.true(dApps.length > 0);
});

test('Registry is filterable by partial tag name', async (t) => {
  const x = await new RegistryListProvider().resolve(Strategy.Static);
  const tag = x.getRegistry().tags[0].name.split(' ')[0];
  const dApps = x.filterByTag(tag).getDapps();

  t.true(dApps.length > 0);
});


test('Registry is a valid json', async (t) => {
  t.notThrows(() => {
    const content = fs
      .readFileSync('./src/registry.json')
      .toString();
    JSON.parse(content.toString());
  });
});

test('Registry is a valid Schema', async (t) => {
  const reg = JSON.parse(fs.readFileSync('./src/registry.json').toString());
  const schema: JSONSchemaType<Registry> = JSON.parse(
    fs.readFileSync('./src/registrySchema.json').toString()
  );
  const ajv = new Ajv();
  const validate = ajv.compile(schema);
  const valid = validate(reg);
  if (!valid) {
    console.log(validate.errors)
  }
  t.true(valid);
});
