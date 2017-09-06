/*
 * Copyright (c) 2012-2017 Digital Bazaar, Inc. All rights reserved.
 */
const async = require('async');
const bedrock = require('bedrock');
const brDidClient = require('bedrock-did-client');
const brLedgerAgent = require('bedrock-ledger-agent');
const config = bedrock.config;
const fs = require('fs');
const jsigs = require('jsonld-signatures');
const logger = bedrock.loggers.get('app').child('veres-one');

// module API
const api = {};
module.exports = api;

// setup JSIGS to use bedrock JSON-LD document loader
jsigs.use('jsonld', bedrock.jsonld);

// add routes
bedrock.events.on('bedrock.init', setupJsonldProcessor);
bedrock.events.on('bedrock-express.ready', setupVeresOneLedger);

/**
 * Sets up the the JSON-LD processor's document loader for the Veres One Ledger.
 */
function setupJsonldProcessor() {
  const jsonld = bedrock.jsonld;
  const oldLoader = jsonld.documentLoader;
  const ddoUrl = config['veres-one'].ddo.id;
  const ddoPublicKeyUrl = config['veres-one'].ddoPublicKey.id;
  const ledgerPresets = {};
  ledgerPresets[ddoUrl] = config['veres-one'].ddo;
  ledgerPresets[ddoPublicKeyUrl] = config['veres-one'].ddoPublicKey;

  // Ensure that the ledger genesis DDO and public key are always available
  jsonld.documentLoader = function(url, callback) {
    if(Object.keys(ledgerPresets).includes(url)) {
      return callback(null, {
        contextUrl: null,
        document: ledgerPresets[url],
        documentUrl: url
      });
    }
    oldLoader(url, callback);
  };
  // override jsonld.documentLoader in brDidClient so this document loader
  // can be used for did: and https: URLs
  brDidClient.jsonld.documentLoader = jsonld.documentLoader;
}

/**
 * Setup the Veres One Ledger.
 */
function setupVeresOneLedger() {
  // check to see if the Veres One Ledger agent already exists
  const options = {
    owner: config['veres-one'].did
  };
  brLedgerAgent.getAgentIterator(null, options, (err, iterator) => {
    if(err) {
      logger.error('Error while scanning for Veres One ledger', {error: err});
      return;
    }
    // search all ledger agents (there should only be one in the system)
    let found = false;
    async.eachSeries(iterator, (promise, callback) => {
      promise.then(ledgerAgent => {
        if(ledgerAgent.node.id) {
          found = true;
          callback();
        }
      }).catch(callback);
    }, err => {
      if(err) {
        logger.error('Error while processing Veres One agents', {error: err});
      }
      // if no ledger agents are found, create the ledger node and agent
      if(!found) {
        _createLedger();
      }
    });
  });
}

/**
 * Sets up the Veres One Ledger Agent.
 */
function _createLedger() {
  async.auto({
    getPrivateKey: callback =>
      // always read the private key from disk to reduce caching in memory
      fs.readFile(config['veres-one'].privateKey, 'utf8', callback),
    sign: ['getPrivateKey', (results, callback) =>
      // sign config event
      jsigs.sign(config['veres-one'].config, {
        algorithm: 'LinkedDataSignature2015',
        privateKeyPem: results.getPrivateKey,
        creator: config['veres-one'].did + '/keys/1'
      }, callback)
    ],
    create: ['sign', (results, callback) => {
      // create Veres One ledger
      const options = {
        configEvent: results.sign,
        genesis: true,
        private: false,
        owner: config['veres-one'].did
      };
      brLedgerAgent.add(null, null, options, callback);
    }]
  }, (err, results) => {
    if(err) {
      logger.error('Error while initializing Veres One ledger', {error: err});
    }
    api.agent = results.create;
  });
}