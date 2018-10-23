//
// Tests for Wallets
//

require('should');
const Promise = require('bluebird');
const co = Promise.coroutine;
const nock = require('nock');
const common = require('../../../src/common');

const TestV2BitGo = require('../../lib/test_bitgo');

describe('V2 Wallets:', function() {
  let wallets;
  let bgUrl;

  before(co(function *before() {
    nock('https://bitgo.fakeurl')
    .persist()
    .get('/api/v1/client/constants')
    .reply(200, { ttl: 3600, constants: {} });

    const bitgo = new TestV2BitGo({ env: 'mock' });
    bitgo.initializeTestVars();

    const basecoin = bitgo.coin('tbtc');
    wallets = basecoin.wallets();
    bgUrl = common.Environments[bitgo.getEnv()].uri;
  }));

  after(function() {
    nock.cleanAll();
    nock.activeMocks().length.should.equal(0);
  });

  describe('wallet add', function() {
    it('throws on invalid arguments', function() {
      try {
        // isCustodial flag is not a boolean
        wallets.add({ label: 'label', enterprise: 'enterprise', keys: [], m: 2, n: 3, isCustodial: 1 });
        throw new Error();
      } catch (e) {
        e.message.should.equal('invalid argument for isCustodial - boolean expected');
      }

      try {
        // isCustodial flag is not a boolean
        wallets.add({ label: 'label', enterprise: 'enterprise', keys: [], m: 2, n: 3, type: 1 });
        throw new Error();
      } catch (e) {
        e.message.should.equal('Expecting parameter string: type but found number');
      }
    });

    it('creates a paired custodial wallet', co(function *createPairedCustodialWallet() {
      nock(bgUrl)
      .post('/api/v2/tbtc/wallet', function(body) {
        body.isCustodial.should.be.true();
        body.should.have.property('keys');
        body.m.should.equal(2);
        body.n.should.equal(3);
        return true;
      })
      .reply(200, {});
      yield wallets.add({ label: 'label', enterprise: 'enterprise', keys: [], m: 2, n: 3, isCustodial: true });
    }));

    it('creates a single custodial wallet', co(function *createSingleCustodialWallet() {
      nock(bgUrl)
      .post('/api/v2/tbtc/wallet', function(body) {
        body.type.should.equal('custodial');
        body.should.not.have.property('keys');
        body.should.not.have.property('m');
        body.should.not.have.property('n');
        return true;
      })
      .reply(200, {});
      yield wallets.add({ label: 'label', enterprise: 'enterprise', type: 'custodial' });
    }));
  });
});
