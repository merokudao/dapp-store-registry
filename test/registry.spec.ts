import { DAppStoreSchema } from 'interfaces/registrySchema';
import chai from 'chai';

chai.should();

describe('DappStoreRegistry', () => {

  describe('Registry Strategy', () => {
    it('uses the local registry file upon Static RegistryStrategy', (done) => {
      done();
    });

    it('uses the remote registry file upon GitHub RegistryStrategy', (done) => {
      done();
    });

    it('uses local registry if remote can\'t be loaded', (done) => {
      done();
    });
  });

  describe('#dapps', () => {
    it('returns a list of dapps that are listed', (done) => {
      done();
    });
  });

  describe('#search', () => {
    it('is able to search queryString in name of dApp', (done) => {
      done();
    });

    it('is able to search queryString in tags of dApp', (done) => {
      done();
    });

    it('returns null on empty queryString', (done) => {
      done();
    });

    it('is able to filter results on chainId', (done) => {
      done();
    });

    it('is able to filter results on language', (done) => {
      done();
    });

    it('is able to filter results on platform availability', (done) => {
      done();
    });

    it('is able to filter results on min age to access dApp', (done) => {
      done();
    });

    it('is able to filter results on matureAudience flag', (done) => {
      done();
    });

    it('is able to filter results on specific developer', (done) => {
      done();
    });

    it('is able to filter results on allowed countries', (done) => {
      done();
    });

    it('is able to filter results on blocked countries', (done) => {
      done();
    });

    it('is able to filter results on or after certain list date', (done) => {
      done();
    });

    it('is able to filter results on or before certain list date', (done) => {
      done();
    });
  });
});
